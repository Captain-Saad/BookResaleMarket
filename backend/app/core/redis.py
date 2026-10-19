"""Redis connection for the ARQ job queue: the API enqueues jobs, the worker runs them."""

import asyncio

import structlog
from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

logger = structlog.get_logger("redis")


def redis_settings(redis_url: str) -> RedisSettings:
    return RedisSettings.from_dsn(redis_url)


async def create_redis_pool(redis_url: str) -> ArqRedis:
    return await create_pool(redis_settings(redis_url))


async def redis_is_ready(redis: ArqRedis, timeout_seconds: float) -> bool:
    try:
        async with asyncio.timeout(timeout_seconds):
            await redis.ping()
    except Exception as exc:
        logger.warning("redis not ready", error=type(exc).__name__)
        return False
    return True
