"""FastAPI dependencies shared across modules."""

from collections.abc import AsyncIterator
from typing import Annotated, cast

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.core.clock import Clock
from app.core.config import Settings
from app.core.errors import ServiceUnavailableError
from app.integrations.email.base import Notifier


def get_settings_dep(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


def get_clock(request: Request) -> Clock:
    return cast(Clock, request.app.state.clock)


def get_notifier(request: Request) -> Notifier:
    return cast(Notifier, request.app.state.notifier)


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    engine: AsyncEngine | None = request.app.state.engine
    if engine is None:
        raise ServiceUnavailableError(code="database_unavailable")
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings_dep)]
ClockDep = Annotated[Clock, Depends(get_clock)]
NotifierDep = Annotated[Notifier, Depends(get_notifier)]
DbDep = Annotated[AsyncSession, Depends(get_db)]
