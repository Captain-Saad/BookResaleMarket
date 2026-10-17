import asyncio
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from app.core.config import Settings
from app.core.db import to_async_url

pytestmark = pytest.mark.db

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def _direct_url() -> str:
    url = Settings(env="test").database_direct_url
    if url is None:
        pytest.skip("BOOKLOOP_DATABASE_DIRECT_URL is not set in backend/.env")
    return to_async_url(url.get_secret_value())


async def _rls_enabled(url: str) -> bool:
    engine = create_async_engine(url)
    try:
        async with engine.connect() as connection:
            return bool(
                await connection.scalar(
                    text("SELECT relrowsecurity FROM pg_class WHERE relname = 'alembic_version'")
                )
            )
    finally:
        await engine.dispose()


def test_migrations_upgrade_downgrade_and_upgrade_again() -> None:
    url = _direct_url()
    config = Config(str(ALEMBIC_INI))
    command.upgrade(config, "head")
    assert asyncio.run(_rls_enabled(url))
    command.downgrade(config, "base")
    assert not asyncio.run(_rls_enabled(url))
    command.upgrade(config, "head")
    assert asyncio.run(_rls_enabled(url))
