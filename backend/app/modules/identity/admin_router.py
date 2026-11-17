"""Admin routes for managing users."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.deps import ClockDep, DbDep
from app.modules.identity import service
from app.modules.identity.deps import RequireAdmin
from app.modules.identity.schemas import AdminUserPage, AdminUserResponse

admin_router = APIRouter(prefix="/api/v1/admin/users", tags=["admin"])

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


@admin_router.get("")
async def list_users(
    auth: RequireAdmin,
    db: DbDep,
    cursor: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> AdminUserPage:
    return await service.list_users(db, cursor=cursor, limit=limit)


@admin_router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: UUID, auth: RequireAdmin, db: DbDep, clock: ClockDep
) -> AdminUserResponse:
    return await service.suspend_user(db, clock, actor=auth.user, user_id=user_id)


@admin_router.post("/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: UUID, auth: RequireAdmin, db: DbDep, clock: ClockDep
) -> AdminUserResponse:
    return await service.unsuspend_user(db, clock, actor=auth.user, user_id=user_id)
