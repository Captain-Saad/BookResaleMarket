"""Dev-only routes for the Test Console (CLAUDE.md §6). Mounted only when BOOKLOOP_ENV is not
production, and only admins can call them."""

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.clock import OffsetClock
from app.core.deps import DbDep
from app.core.errors import NotFoundError
from app.modules.identity import service
from app.modules.identity.deps import require_roles
from app.modules.identity.models import Role, SellerVerificationStatus
from app.modules.identity.schemas import Email

DevRole = Literal["buyer", "seller", "warehouse", "courier", "dispatcher", "admin"]


def require_dev_environment(request: Request) -> None:
    if request.app.state.settings.is_production:
        raise NotFoundError()


router = APIRouter(
    prefix="/api/v1/dev",
    tags=["dev"],
    dependencies=[Depends(require_dev_environment), Depends(require_roles(Role.ADMIN))],
)


class SessionRequest(BaseModel):
    role: DevRole


class SessionResponse(BaseModel):
    role: DevRole


class SellerVerificationResultRequest(BaseModel):
    email: Email
    status: SellerVerificationStatus


class SeedResponse(BaseModel):
    seeded: int


class ResetResponse(BaseModel):
    reset: int


class ClockAdvanceRequest(BaseModel):
    hours: int = Field(ge=1, le=24 * 30)


class ClockResponse(BaseModel):
    now: datetime
    advanced_hours: int = Field(serialization_alias="advancedHours")


@router.post("/session", summary="Act as a role")
async def switch_session(body: SessionRequest, request: Request) -> SessionResponse:
    request.app.state.dev_role = body.role
    return SessionResponse(role=body.role)


@router.post("/seed", summary="Seed dev data")
async def seed() -> SeedResponse:
    """Number of records created. Nothing to seed until the first tables arrive (S1)."""
    return SeedResponse(seeded=0)


@router.post("/reset", summary="Reset dev data")
async def reset() -> ResetResponse:
    """Number of records removed. Nothing to reset until the first tables arrive (S1)."""
    return ResetResponse(reset=0)


@router.post("/clock/advance", summary="Move the backend clock forward")
async def advance_clock(body: ClockAdvanceRequest, request: Request) -> ClockResponse:
    clock: OffsetClock = request.app.state.clock
    clock.advance(timedelta(hours=body.hours))
    return ClockResponse(now=clock.now(), advanced_hours=body.hours)


@router.post("/seller-verification", summary="Record a seller verification result")
async def record_seller_verification(
    body: SellerVerificationResultRequest, db: DbDep
) -> SellerVerificationResultRequest:
    await service.record_seller_verification(db, email=body.email, status=body.status)
    return body
