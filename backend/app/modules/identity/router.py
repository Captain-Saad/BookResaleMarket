"""Auth and current-user routes."""

from datetime import timedelta
from http import HTTPStatus

from fastapi import APIRouter, Request, Response

from app.core.config import SESSION_COOKIE, Settings
from app.core.deps import ClockDep, DbDep, SettingsDep
from app.modules.identity import service
from app.modules.identity.deps import CurrentAuth
from app.modules.identity.schemas import (
    AccountResponse,
    AccountUpdateRequest,
    LoginRequest,
    RegisterRequest,
)

auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
me_router = APIRouter(prefix="/api/v1/me", tags=["me"])


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


@auth_router.post("/register", status_code=HTTPStatus.ACCEPTED)
async def register(body: RegisterRequest, db: DbDep, settings: SettingsDep) -> None:
    await service.register(
        db, settings, email=body.email, password=body.password, display_name=body.display_name
    )


@auth_router.post("/login")
async def login(
    body: LoginRequest, response: Response, db: DbDep, settings: SettingsDep, clock: ClockDep
) -> AccountResponse:
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
