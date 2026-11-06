"""Authentication dependencies for routers."""

from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import SESSION_COOKIE
from app.core.deps import ClockDep, DbDep, SettingsDep
from app.core.errors import ForbiddenError
from app.modules.identity import repository, service
from app.modules.identity.models import Role
from app.modules.identity.service import Authenticated


async def current_auth(
    request: Request, db: DbDep, settings: SettingsDep, clock: ClockDep
) -> Authenticated:
    return await service.authenticate(db, settings, clock, request.cookies.get(SESSION_COOKIE))


CurrentAuth = Annotated[Authenticated, Depends(current_auth)]


def require_roles(
    *roles: Role,
) -> Callable[[Authenticated, AsyncSession], Awaitable[Authenticated]]:
    async def dependency(auth: CurrentAuth, db: DbDep) -> Authenticated:
        if not set(roles) & set(await repository.get_roles(db, auth.user.id)):
            raise ForbiddenError()
        return auth

    return dependency


RequireAdmin = Annotated[Authenticated, Depends(require_roles(Role.ADMIN))]
