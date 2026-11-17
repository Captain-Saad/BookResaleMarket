"""Auth and current-user routes."""

from datetime import timedelta
from http import HTTPStatus

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response

from app.core.config import SESSION_COOKIE, Settings
from app.core.deps import ClockDep, DbDep, NotifierDep, SettingsDep
from app.core.errors import ServiceUnavailableError
from app.core.rate_limit import enforce, rate_limit_by_ip
from app.modules.identity import service
from app.modules.identity.deps import CurrentAuth
from app.modules.identity.schemas import (
    AccountResponse,
    AccountUpdateRequest,
    EmailRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenRequest,
)

auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
me_router = APIRouter(prefix="/api/v1/me", tags=["me"])

LOGIN_LIMIT = 10
LIMIT_PER_IP = 30
LIMIT_WINDOW_SECONDS = 15 * 60


def _set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(timedelta(days=settings.session_absolute_days).total_seconds()),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


@auth_router.post(
    "/register",
    status_code=HTTPStatus.ACCEPTED,
    dependencies=[Depends(rate_limit_by_ip("register", LIMIT_PER_IP, LIMIT_WINDOW_SECONDS))],
)
async def register(
    body: RegisterRequest,
    background: BackgroundTasks,
    db: DbDep,
    settings: SettingsDep,
    clock: ClockDep,
    notifier: NotifierDep,
) -> None:
    message = await service.register(
        db,
        settings,
        clock,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
    )
    background.add_task(notifier.send, message)


@auth_router.post(
    "/verify-email",
    status_code=HTTPStatus.NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip("verify", LIMIT_PER_IP, LIMIT_WINDOW_SECONDS))],
)
async def verify_email(body: TokenRequest, db: DbDep, clock: ClockDep) -> None:
    await service.verify_email(db, clock, body.token)


@auth_router.post(
    "/resend-verification",
    status_code=HTTPStatus.ACCEPTED,
    dependencies=[Depends(rate_limit_by_ip("resend", LIMIT_PER_IP, LIMIT_WINDOW_SECONDS))],
)
async def resend_verification(
    body: EmailRequest,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    clock: ClockDep,
    notifier: NotifierDep,
) -> None:
    message = await service.resend_verification(db, settings, clock, body.email)
    if message is None:
        response.status_code = HTTPStatus.OK
        return
    if not await notifier.send(message):
        raise ServiceUnavailableError(code="email_delivery_failed")


@auth_router.post(
    "/forgot-password",
    status_code=HTTPStatus.ACCEPTED,
    dependencies=[Depends(rate_limit_by_ip("forgot", LIMIT_PER_IP, LIMIT_WINDOW_SECONDS))],
)
async def forgot_password(
    body: EmailRequest,
    background: BackgroundTasks,
    db: DbDep,
    settings: SettingsDep,
    clock: ClockDep,
    notifier: NotifierDep,
) -> None:
    message = await service.forgot_password(db, settings, clock, body.email)
    if message:
        background.add_task(notifier.send, message)


@auth_router.post(
    "/reset-password",
    status_code=HTTPStatus.NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip("reset", LIMIT_PER_IP, LIMIT_WINDOW_SECONDS))],
)
async def reset_password(
    body: ResetPasswordRequest, db: DbDep, settings: SettingsDep, clock: ClockDep
) -> None:
    await service.reset_password(db, settings, clock, token=body.token, password=body.password)


@auth_router.post(
    "/login",
    dependencies=[Depends(rate_limit_by_ip("login", LOGIN_LIMIT, LIMIT_WINDOW_SECONDS))],
)
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    clock: ClockDep,
) -> AccountResponse:
    await enforce(request, "login-email", body.email, LOGIN_LIMIT, LIMIT_WINDOW_SECONDS)
    user, token = await service.login(db, settings, clock, email=body.email, password=body.password)
    _set_session_cookie(response, token, settings)
    return await service.account(db, user)


@auth_router.post("/logout", status_code=HTTPStatus.NO_CONTENT)
async def logout(request: Request, response: Response, db: DbDep, clock: ClockDep) -> None:
    await service.logout(db, clock, request.cookies.get(SESSION_COOKIE))
    response.delete_cookie(SESSION_COOKIE, path="/")


@me_router.get("")
async def get_me(auth: CurrentAuth, db: DbDep) -> AccountResponse:
    return await service.account(db, auth.user)


@me_router.patch("")
async def update_me(body: AccountUpdateRequest, auth: CurrentAuth, db: DbDep) -> AccountResponse:
    return await service.update_account(db, auth.user, body)
