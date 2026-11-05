"""Auth and current-user routes."""

from datetime import timedelta
from http import HTTPStatus
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response

from app.core.config import SESSION_COOKIE, Settings
from app.core.deps import ClockDep, DbDep, NotifierDep, SellerVerificationDep, SettingsDep
from app.core.rate_limit import enforce, rate_limit_by_ip
from app.modules.identity import service
from app.modules.identity.deps import CurrentAuth
from app.modules.identity.schemas import (
    AccountResponse,
    AccountUpdateRequest,
    AddressRequest,
    AddressResponse,
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
    background: BackgroundTasks,
    db: DbDep,
    settings: SettingsDep,
    clock: ClockDep,
    notifier: NotifierDep,
) -> None:
    message = await service.resend_verification(db, settings, clock, body.email)
    if message:
        background.add_task(notifier.send, message)


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


@me_router.get("/addresses")
async def list_addresses(auth: CurrentAuth, db: DbDep) -> list[AddressResponse]:
    addresses = await service.list_addresses(db, auth.user)
    return [AddressResponse.model_validate(address) for address in addresses]


@me_router.post("/addresses", status_code=HTTPStatus.CREATED)
async def create_address(body: AddressRequest, auth: CurrentAuth, db: DbDep) -> AddressResponse:
    return AddressResponse.model_validate(await service.create_address(db, auth.user, body))


@me_router.patch("/addresses/{address_id}")
async def update_address(
    address_id: UUID, body: AddressRequest, auth: CurrentAuth, db: DbDep
) -> AddressResponse:
    address = await service.update_address(db, auth.user, address_id, body)
    return AddressResponse.model_validate(address)


@me_router.delete("/addresses/{address_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_address(address_id: UUID, auth: CurrentAuth, db: DbDep) -> None:
    await service.delete_address(db, auth.user, address_id)


@me_router.post("/roles/seller")
async def become_seller(auth: CurrentAuth, db: DbDep) -> AccountResponse:
    return await service.become_seller(db, auth.user)


@me_router.post("/seller-verification")
async def start_seller_verification(
    auth: CurrentAuth, db: DbDep, provider: SellerVerificationDep
) -> AccountResponse:
    return await service.start_seller_verification(db, provider, auth.user)
