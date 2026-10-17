"""Async SQLAlchemy engine for Supabase Postgres behind the transaction pooler (PgBouncer)."""

import asyncio
from uuid import uuid4

import structlog
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

logger = structlog.get_logger("db")


def to_async_url(url: str) -> str:
    """Convert a Supabase `postgresql://` URI for SQLAlchemy + asyncpg. Supabase may add
    `pgbouncer=true` (a Prisma flag asyncpg rejects) and libpq's `sslmode` (asyncpg: `ssl`)."""
    parsed = make_url(url)
    if parsed.get_backend_name() not in {"postgresql", "postgres"}:
        raise ValueError("Only PostgreSQL URLs are supported")
    query = {key: value for key, value in parsed.query.items() if key != "pgbouncer"}
    if "sslmode" in query:
        query["ssl"] = query.pop("sslmode")
    return parsed.set(drivername="postgresql+asyncpg", query=query).render_as_string(
        hide_password=False
    )


def create_engine(database_url: str) -> AsyncEngine:
    """Transaction-mode PgBouncer can't reuse prepared statements across transactions,
    so asyncpg's statement cache is disabled and every statement gets a unique name."""
    return create_async_engine(
        to_async_url(database_url),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
        },
    )


async def database_is_ready(engine: AsyncEngine, timeout_seconds: float) -> bool:
    try:
        async with asyncio.timeout(timeout_seconds), engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("database not ready", error=type(exc).__name__)
        return False
    return True
