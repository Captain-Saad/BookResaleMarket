"""Liveness endpoint (backend.md §2 observability: /healthz)."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


@router.get("/healthz", summary="Liveness check")
async def healthz() -> HealthResponse:
    """The process is up and serving requests. Readiness (database) is /readyz in S0-10."""
    return HealthResponse(status="ok")
