from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import RedirectResponse, Response

from app.core.deps import ClockDep, DbDep, PublicDbDep, public
from app.core.errors import ServiceUnavailableError
from app.core.rate_limit import enforce, rate_limit_by_ip
from app.integrations.isbn.base import IsbnLookupProvider
from app.integrations.storage.base import ImageScanner, PhotoStorage
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
    ListingSearchQuery,
    PhotoCompleteRequest,
    PhotoUploadRequest,
    PhotoUploadResponse,
    PublicListingDetail,
    PublicListingPage,
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
    return photo_urls(await service.create(db, clock, auth, body), request)


@router.patch("/listings/{listing_id}")
async def patch_listing(
    listing_id: UUID,
    body: ListingPatchRequest,
    request: Request,
    auth: Seller,
    db: DbDep,
    clock: ClockDep,
) -> ListingResponse:
    return photo_urls(await service.patch(db, clock, auth, listing_id, body), request)


@router.post("/listings/{listing_id}/publish")
async def publish_listing(
    listing_id: UUID, request: Request, auth: Seller, db: DbDep, clock: ClockDep
) -> ListingResponse:
    return photo_urls(await service.publish(db, clock, auth, listing_id), request)


@router.post("/listings/{listing_id}/deactivate")
async def deactivate_listing(
    listing_id: UUID, request: Request, auth: Seller, db: DbDep, clock: ClockDep
) -> ListingResponse:
    return photo_urls(await service.deactivate(db, clock, auth, listing_id), request)


@router.get("/me/listings")
async def my_listings(
    request: Request,
    auth: Seller,
    db: DbDep,
    cursor: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ListingPage:
    result = await service.own_listings(db, auth, cursor, limit)
    return result.model_copy(update={"items": [photo_urls(item, request) for item in result.items]})


def get_storage(request: Request) -> PhotoStorage:
    storage = cast(PhotoStorage | None, request.app.state.photo_storage)
    if storage is None:
        raise ServiceUnavailableError(code="storage_unavailable")
    return storage


Storage = Annotated[PhotoStorage, Depends(get_storage)]
local_router = APIRouter(prefix="/api/v1/dev/listing-uploads", tags=["development"])


@router.post("/listings/{listing_id}/photos/upload-url")
async def photo_upload_url(
    listing_id: UUID,
    body: PhotoUploadRequest,
    request: Request,
    auth: Seller,
    db: DbDep,
    clock: ClockDep,
    storage: Storage,
) -> PhotoUploadResponse:
    return await service.photo_ticket(
        db,
        clock,
        auth,
        listing_id,
        body,
        storage,
        str(request.base_url).rstrip("/") + "/api/v1/dev/listing-uploads",
    )


@local_router.put("/{photo_id}", dependencies=[Depends(public)], status_code=204)
async def upload_dev_photo(
    photo_id: UUID,
    request: Request,
    db: DbDep,
    clock: ClockDep,
    storage: Storage,
    token: Annotated[str, Query(min_length=32, max_length=128)],
) -> None:
    await service.local_upload(
        db,
        clock,
        photo_id,
        token,
        request.headers.get("content-type", ""),
        await request.body(),
        storage,
    )


@router.post("/listings/{listing_id}/photos/complete")
async def complete_listing_photo(
    listing_id: UUID,
    body: PhotoCompleteRequest,
    request: Request,
    auth: Seller,
    db: DbDep,
    clock: ClockDep,
    storage: Storage,
) -> ListingResponse:
    result = await service.complete_photo(
        db,
        clock,
        auth,
        listing_id,
        body.photo_id,
        storage,
        cast(ImageScanner, request.app.state.image_scanner),
        request.app.state.image_slots,
    )
    return photo_urls(result, request)


@router.delete("/listings/{listing_id}/photos/{photo_id}")
async def delete_listing_photo(
    listing_id: UUID,
    photo_id: UUID,
    request: Request,
    auth: Seller,
    db: DbDep,
    clock: ClockDep,
    storage: Storage,
) -> ListingResponse:
    return photo_urls(
        await service.remove_photo(db, clock, auth, listing_id, photo_id, storage), request
    )


@router.get("/listings/{listing_id}/photos/{photo_id}", name="read_listing_photo")
async def read_listing_photo(
    listing_id: UUID,
    photo_id: UUID,
    auth: Seller,
    db: DbDep,
    storage: Storage,
) -> Response:
    url, data = await service.read_photo(db, auth, listing_id, photo_id, storage)
    headers = {"Cache-Control": "private, no-store"}
    return (
        RedirectResponse(url, status_code=307, headers=headers)
        if url
        else Response(data, media_type="image/jpeg", headers=headers)
    )


def photo_urls(result: ListingResponse, request: Request) -> ListingResponse:
    return result.model_copy(
        update={
            "photos": [
                photo.model_copy(
                    update={
                        "url": str(
                            request.url_for(
                                "read_listing_photo", listing_id=result.id, photo_id=photo.id
                            )
                        )
                    }
                )
                for photo in result.photos
            ]
        }
    )


@router.get(
    "/listings", dependencies=[Depends(public), Depends(rate_limit_by_ip("public-search", 240, 60))]
)
async def search_listings(
    request: Request, db: PublicDbDep, filters: Annotated[ListingSearchQuery, Query()]
) -> PublicListingPage:
    return await service.search_public(
        db,
        filters,
        lambda listing_id, photo_id: str(
            request.url_for("read_public_listing_photo", listing_id=listing_id, photo_id=photo_id)
        ),
    )


@router.get(
    "/listings/{listing_id}",
    dependencies=[Depends(public), Depends(rate_limit_by_ip("public-detail", 240, 60))],
)
async def public_listing_detail(
    listing_id: UUID, request: Request, db: PublicDbDep
) -> PublicListingDetail:
    return await service.detail_public(
        db,
        listing_id,
        lambda listing_id, photo_id: str(
            request.url_for("read_public_listing_photo", listing_id=listing_id, photo_id=photo_id)
        ),
    )


@router.get(
    "/listings/{listing_id}/public-photos/{photo_id}",
    name="read_public_listing_photo",
    dependencies=[Depends(public), Depends(rate_limit_by_ip("public-photo", 600, 60))],
)
async def public_listing_photo(
    listing_id: UUID, photo_id: UUID, db: PublicDbDep, storage: Storage
) -> Response:
    data = await service.read_public_photo(db, listing_id, photo_id, storage)
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})
