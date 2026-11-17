from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, Request

from app.core.deps import ClockDep, DbDep, public
from app.core.rate_limit import enforce, rate_limit_by_ip
from app.integrations.isbn.base import IsbnLookupProvider
from app.modules.identity.deps import require_roles
from app.modules.identity.models import Role
from app.modules.identity.service import Authenticated
from app.modules.listings import service
from app.modules.listings.schemas import (
    BookMetadata,
    ListingDraftRequest,
    ListingPage,
    ListingPatchRequest,
    ListingResponse,
)
from app.modules.listings.service import lookup_book

router = APIRouter(prefix="/api/v1", tags=["listings"])


@router.get(
    "/isbn/{isbn}", dependencies=[Depends(public), Depends(rate_limit_by_ip("isbn", 60, 60))]
)
async def isbn_lookup(
    isbn: Annotated[str, Path(min_length=10, max_length=32)],
    request: Request,
    db: DbDep,
    clock: ClockDep,
) -> BookMetadata:
    provider = cast(IsbnLookupProvider, request.app.state.isbn_provider)
    return await lookup_book(db, clock, provider, isbn)


Seller = Annotated[Authenticated, Depends(require_roles(Role.SELLER))]


@router.post(
    "/listings",
    status_code=201,
    dependencies=[Depends(rate_limit_by_ip("listing-create", 30, 3600))],
)
async def create_listing(
    body: ListingDraftRequest, request: Request, auth: Seller, db: DbDep, clock: ClockDep
) -> ListingResponse:
    await enforce(request, "listing-create-user", str(auth.user.id), 30, 3600)
    return await service.create(db, clock, auth, body)


@router.patch("/listings/{listing_id}")
async def patch_listing(
    listing_id: UUID, body: ListingPatchRequest, auth: Seller, db: DbDep, clock: ClockDep
) -> ListingResponse:
    return await service.patch(db, clock, auth, listing_id, body)


@router.post("/listings/{listing_id}/publish")
async def publish_listing(
    listing_id: UUID, auth: Seller, db: DbDep, clock: ClockDep
) -> ListingResponse:
    return await service.publish(db, clock, auth, listing_id)


@router.post("/listings/{listing_id}/deactivate")
async def deactivate_listing(
    listing_id: UUID, auth: Seller, db: DbDep, clock: ClockDep
) -> ListingResponse:
    return await service.deactivate(db, clock, auth, listing_id)


@router.get("/me/listings")
async def my_listings(
    auth: Seller,
    db: DbDep,
    cursor: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ListingPage:
    return await service.own_listings(db, auth, cursor, limit)
