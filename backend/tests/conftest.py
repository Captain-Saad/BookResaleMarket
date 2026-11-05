import asyncio
import os
from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager, contextmanager
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from testcontainers.community.postgres import PostgresContainer

from alembic import command
from app.core.config import Settings, get_settings
from app.core.db import to_async_url
from app.main import create_app

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"
POSTGRES_IMAGE = "postgres:17-alpine"


@pytest.fixture
def client() -> Iterator[TestClient]:
    settings = Settings(_env_file=None, env="test", log_json=False)
    with TestClient(create_app(settings), raise_server_exceptions=False) as test_client:
        yield test_client


@contextmanager
def migration_env(url: str) -> Iterator[Config]:
    """Alembic reads its URL from settings, so point the settings at the test database."""
    names = {
        "BOOKLOOP_DATABASE_DIRECT_URL": url,
        "BOOKLOOP_DATABASE_URL": url,
        "BOOKLOOP_REDIS_URL": "redis://localhost:1/0",
    }
    os.environ.update(names)
    get_settings.cache_clear()
    try:
        yield Config(str(ALEMBIC_INI))
    finally:
        for name in names:
            del os.environ[name]
        get_settings.cache_clear()


@pytest.fixture
def migrations() -> Callable[[str], AbstractContextManager[Config]]:
    return migration_env


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    with PostgresContainer(POSTGRES_IMAGE, driver=None) as postgres:
        url = postgres.get_connection_url()
        with migration_env(url) as config:
            command.upgrade(config, "head")
        yield url


async def _clear_tables(url: str) -> None:
    engine = create_async_engine(to_async_url(url), poolclass=NullPool)
    async with engine.begin() as connection:
        tables = await connection.scalars(
            text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' "
                "AND tablename <> 'alembic_version'"
            )
        )
        names = ", ".join(tables)
        await connection.execute(text(f"TRUNCATE {names} CASCADE"))
    await engine.dispose()


@pytest.fixture
def api(database_url: str) -> Iterator[TestClient]:
    asyncio.run(_clear_tables(database_url))
    settings = Settings(
        _env_file=None,
        env="test",
        log_json=False,
        database_url=database_url,
        database_direct_url=database_url,
        bcrypt_rounds=4,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client
