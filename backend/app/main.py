"""Application factory. Run with: uv run uvicorn app.main:create_app --factory --reload"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.clock import OffsetClock, SystemClock
from app.core.config import Settings, get_settings
from app.core.csrf import OriginCheckMiddleware
from app.core.db import create_engine
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.rate_limit import RedisRateLimiter
from app.core.redis import create_redis_pool
from app.core.request_id import REQUEST_ID_HEADER, RequestIdMiddleware
from app.integrations.email.smtp import SmtpNotifier
from app.modules.dev.router import router as dev_router
from app.modules.health.router import router as health_router
from app.modules.identity.router import auth_router, me_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.log_json)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        db_url, redis_url = settings.database_url, settings.redis_url
        app.state.engine = create_engine(db_url.get_secret_value()) if db_url else None
        app.state.redis = (
            await create_redis_pool(redis_url.get_secret_value()) if redis_url else None
        )
        app.state.rate_limiter = RedisRateLimiter(app.state.redis) if app.state.redis else None
        yield
        if app.state.engine is not None:
            await app.state.engine.dispose()
        if app.state.redis is not None:
            await app.state.redis.aclose(close_connection_pool=True)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.notifier = SmtpNotifier(settings.smtp_host, settings.smtp_port, settings.email_from)
    app.state.clock = SystemClock() if settings.is_production else OffsetClock()
    app.add_middleware(OriginCheckMiddleware, allowed_origins=settings.cors_origins)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
    )
    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(me_router)
    if not settings.is_production:
        app.include_router(dev_router)
    return app
