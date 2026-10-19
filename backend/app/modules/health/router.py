"""Liveness and readiness endpoints (backend.md §2 observability: /healthz, /readyz)."""

from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.db import database_is_ready
from app.core.errors import ProblemDetails, ServiceUnavailableError
from app.core.redis import redis_is_ready

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ReadyResponse(BaseModel):
    status: Literal["ready"]
    database: Literal["ok"]
    redis: Literal["ok"]


@router.get("/healthz", summary="Liveness check")
async def healthz() -> HealthResponse:
    """The process is up and serving requests. Checks no dependencies."""
    return HealthResponse(status="ok")


@router.get(
    "/readyz",
    summary="Readiness check",
    responses={503: {"model": ProblemDetails, "description": "A dependency is unavailable"}},
)
async def readyz(request: Request) -> ReadyResponse:
    """The process can serve traffic: the database and Redis answer within the timeout."""
    state = request.app.state
    timeout = state.settings.readiness_timeout_seconds
    if state.engine is None or not await database_is_ready(state.engine, timeout):
        raise ServiceUnavailableError("The database is not reachable.", code="database_unavailable")
    if state.redis is None or not await redis_is_ready(state.redis, timeout):
        raise ServiceUnavailableError("Redis is not reachable.", code="redis_unavailable")
    return ReadyResponse(status="ready", database="ok", redis="ok")
