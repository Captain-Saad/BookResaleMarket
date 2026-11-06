"""Authentication dependencies for routers."""

from typing import Annotated

from fastapi import Depends, Request

from app.core.config import SESSION_COOKIE
from app.core.deps import ClockDep, DbDep, SettingsDep
from app.modules.identity import service
from app.modules.identity.service import Authenticated


async def current_auth(
    request: Request, db: DbDep, settings: SettingsDep, clock: ClockDep
) -> Authenticated:
    return await service.authenticate(db, settings, clock, request.cookies.get(SESSION_COOKIE))


CurrentAuth = Annotated[Authenticated, Depends(current_auth)]
