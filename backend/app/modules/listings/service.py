from datetime import timedelta
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.integrations.isbn.base import IsbnLookupProvider, normalize_isbn
from app.modules.identity import service as identity
from app.modules.identity.service import Authenticated
from app.modules.listings import repository
from app.modules.listings.models import Book, Listing
from app.modules.listings.repository import get_book
from app.modules.listings.schemas import (
    BookMetadata,
    ListingDraftRequest,
    ListingPage,
    ListingPatchRequest,
    ListingPhoto,
    ListingResponse,
    ListingStatus,
)


async def lookup_book(
    db: AsyncSession, clock: Clock, provider: IsbnLookupProvider, isbn: str
) -> BookMetadata:
    isbn = normalize_isbn(isbn)
    cached = await get_book(db, isbn)
    if cached is not None and cached.fetched_at + timedelta(days=1) > clock.now():
        return BookMetadata(isbn=isbn, title=cached.title, author=cached.author, found=True)
    result = await provider.lookup(isbn)
    if result.found:
        values = dict(isbn=isbn, title=result.title, author=result.author, fetched_at=clock.now())
        await db.execute(
            insert(Book)
            .values(**values)
            .on_conflict_do_update(index_elements=[Book.isbn], set_=values)
        )
        await db.commit()
    return result


IDENTITY_FIELDS = {"isbn", "title", "author", "condition"}
PURCHASE_FIELDS = IDENTITY_FIELDS | {
    "notes",
    "fulfillment",
    "price_minor",
    "currency",
    "address_id",
}


async def get_owned(
    db: AsyncSession, auth: Authenticated, listing_id: UUID, *, lock: bool = False
) -> Listing:
    listing = await repository.owned_listing(db, auth.user.id, listing_id, lock=lock)
    if listing is None:
        raise NotFoundError()
    return listing


async def _check_address(db: AsyncSession, auth: Authenticated, address_id: UUID | None) -> None:
    if address_id is not None and not any(
        address.id == address_id for address in await identity.list_addresses(db, auth.user)
    ):
        raise NotFoundError(code="address_not_found")


async def view(db: AsyncSession, listing: Listing) -> ListingResponse:
    photos = await repository.listing_photos(db, listing.id)
    return ListingResponse.model_validate(
        {
            **{
                name: getattr(listing, name)
                for name in ListingResponse.model_fields
                if name != "photos"
            },
            "photos": [
                ListingPhoto(id=photo.id, url=photo.path, position=photo.position)
                for photo in photos
            ],
        }
    )


async def create(
    db: AsyncSession, clock: Clock, auth: Authenticated, body: ListingDraftRequest
) -> ListingResponse:
    values = body.model_dump()
    if values["isbn"]:
        values["isbn"] = normalize_isbn(values["isbn"])
    for name in ("title", "author"):
        values[name] = values[name].strip()
    await _check_address(db, auth, body.address_id)
    listing = Listing(
        **values, seller_id=auth.user.id, created_at=clock.now(), updated_at=clock.now()
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return await view(db, listing)


async def patch(
    db: AsyncSession, clock: Clock, auth: Authenticated, listing_id: UUID, body: ListingPatchRequest
) -> ListingResponse:
    listing = await get_owned(db, auth, listing_id, lock=True)
    if body.version != listing.version:
        raise ConflictError(code="stale_listing")
    values = body.model_dump(exclude_unset=True, exclude={"version"})
    if values.get("isbn"):
        values["isbn"] = normalize_isbn(values["isbn"])
    for name in ("title", "author"):
        if name in values:
            values[name] = values[name].strip()
    changed = {name for name, value in values.items() if value != getattr(listing, name)}
    if listing.identity_locked and changed & IDENTITY_FIELDS:
        raise ConflictError(code="listing_identity_locked")
    if listing.purchase_locked and changed & PURCHASE_FIELDS:
        raise ConflictError(code="listing_purchase_locked")
    await _check_address(db, auth, values.get("address_id"))
    for name, value in values.items():
        setattr(listing, name, value)
    if "fulfillment" in changed and listing.status in {"active", "incoming"}:
        listing.status = "incoming" if listing.fulfillment == "warehouse" else "active"
    if listing.status in {"active", "incoming"}:
        await _ready(db, auth, listing)
    listing.version += 1
    listing.updated_at = clock.now()
    await db.commit()
    await db.refresh(listing)
    return await view(db, listing)


async def _ready(db: AsyncSession, auth: Authenticated, listing: Listing) -> None:
    with db.no_autoflush:
        account = await identity.account(db, auth.user)
        if account.seller_verification != "verified":
            raise ForbiddenError(code="seller_not_verified")
        if (
            not listing.title.strip()
            or not listing.author.strip()
            or listing.price_minor is None
            or listing.address_id is None
        ):
            raise ConflictError(code="listing_incomplete")
        await _check_address(db, auth, listing.address_id)
        if not await repository.listing_photos(db, listing.id):
            raise ConflictError(code="listing_photos_required")


async def publish(
    db: AsyncSession, clock: Clock, auth: Authenticated, listing_id: UUID
) -> ListingResponse:
    listing = await get_owned(db, auth, listing_id, lock=True)
    if (
        listing.status not in {ListingStatus.DRAFT, ListingStatus.DEACTIVATED}
        or listing.purchase_locked
        or listing.return_or_donation_pending
    ):
        raise ConflictError(code="invalid_listing_transition")
    await _ready(db, auth, listing)
    listing.status = "incoming" if listing.fulfillment == "warehouse" else "active"
    listing.updated_at = clock.now()
    listing.version += 1
    await db.commit()
    await db.refresh(listing)
    return await view(db, listing)


async def deactivate(
    db: AsyncSession, clock: Clock, auth: Authenticated, listing_id: UUID
) -> ListingResponse:
    listing = await get_owned(db, auth, listing_id, lock=True)
    if listing.purchase_locked or listing.status in {"reserved", "sold", "suspended"}:
        raise ConflictError(code="listing_purchase_locked")
    if listing.status != "deactivated":
        listing.status = "deactivated"
        listing.return_or_donation_pending = (
            listing.fulfillment == "warehouse" and listing.warehouse_intake_at is not None
        )
        listing.version += 1
        listing.updated_at = clock.now()
        await db.commit()
        await db.refresh(listing)
    return await view(db, listing)


async def own_listings(
    db: AsyncSession, auth: Authenticated, cursor: UUID | None, limit: int
) -> ListingPage:
    rows = await repository.own_page(db, auth.user.id, cursor, limit + 1)
    return ListingPage(
        items=[await view(db, row) for row in rows[:limit]],
        next_cursor=rows[limit - 1].id if len(rows) > limit else None,
    )


async def address_in_use(db: AsyncSession, seller_id: UUID, address_id: UUID) -> bool:
    return await repository.address_in_use(db, seller_id, address_id)
