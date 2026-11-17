"""Sliding-window rate limiting in Redis (backend.md §5). If Redis is down, requests are allowed:
an outage shouldn't lock everyone out of their accounts."""

import time
from collections.abc import Awaitable, Callable
from uuid import uuid4

import structlog
from arq import ArqRedis
from fastapi import Request

from app.core.errors import RateLimitedError

logger = structlog.get_logger("rate_limit")


class RedisRateLimiter:
    def __init__(self, redis: ArqRedis) -> None:
        self.redis = redis

    async def retry_after(self, key: str, limit: int, window_seconds: int) -> int | None:
        """Records a hit. Returns None if allowed, or the seconds to wait if over the limit."""
        now = time.time()
        redis_key = f"rate:{key}"
        try:
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.zremrangebyscore(redis_key, 0, now - window_seconds)
                pipe.zadd(redis_key, {uuid4().hex: now})
                pipe.zcard(redis_key)
                pipe.zrange(redis_key, 0, 0, withscores=True)
                pipe.expire(redis_key, window_seconds)
                results = await pipe.execute()
        except Exception as exc:
            logger.warning("rate limiter unavailable", error=type(exc).__name__)
            return None
        count, oldest = results[2], results[3]
        if count <= limit:
            return None
        return max(1, int(oldest[0][1] + window_seconds - now))


async def enforce(request: Request, scope: str, key: str, limit: int, window_seconds: int) -> None:
    limiter = request.app.state.rate_limiter
    if limiter is None:
        return
    retry_after = await limiter.retry_after(f"{scope}:{key}", limit, window_seconds)
    if retry_after is not None:
        raise RateLimitedError(retry_after)


def rate_limit_by_ip(
    scope: str, limit: int, window_seconds: int
) -> Callable[[Request], Awaitable[None]]:
    async def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        await enforce(request, scope, client_ip, limit, window_seconds)

    return dependency
