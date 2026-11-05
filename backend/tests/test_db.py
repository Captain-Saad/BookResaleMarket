import asyncio

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.core.config import Settings
from app.core.db import create_engine

WORKERS = 6
ROUNDS = 12


def test_engine_keeps_no_prepared_statements_for_the_transaction_pooler(database_url: str) -> None:
    """A pooler can move each transaction to another connection, where a cached statement doesn't
    exist. Login commits and then queries again, so a cache makes it fail on Supabase."""

    async def caches() -> tuple[object, object]:
        engine = create_engine(database_url)
        try:
            async with engine.connect() as connection:
                pooled = await connection.get_raw_connection()
                assert pooled.driver_connection is not None
                return (
                    pooled.dbapi_connection._prepared_statement_cache,  # type: ignore[union-attr]
                    pooled.driver_connection._stmt_cache.get_max_size(),
                )
        finally:
            await engine.dispose()

    sqlalchemy_cache, asyncpg_cache_size = asyncio.run(caches())
    assert sqlalchemy_cache is None
    assert asyncpg_cache_size == 0


@pytest.mark.db
def test_repeated_queries_survive_the_real_transaction_pooler() -> None:
    """Read-only. Concurrent sessions make the pooler move transactions between connections."""
    url = Settings(env="test").database_url
    if url is None:
        pytest.skip("BOOKLOOP_DATABASE_URL is not set in backend/.env")

    async def worker(engine: AsyncEngine) -> None:
        async with AsyncSession(engine) as session:
            for _ in range(ROUNDS):
                await session.execute(
                    text("SELECT count(*) FROM users WHERE email = :email"),
                    {"email": "nobody@example.com"},
                )
                await session.commit()

    async def run() -> None:
        engine = create_engine(url.get_secret_value())
        try:
            await asyncio.gather(*[worker(engine) for _ in range(WORKERS)])
        finally:
            await engine.dispose()

    asyncio.run(run())
