import asyncio
import base64
import binascii
import hashlib
import json
import warnings
from collections.abc import Callable
from datetime import timedelta
from hmac import compare_digest
from io import BytesIO
from typing import cast
from uuid import UUID

from PIL import Image, ImageDraw, ImageOps, UnidentifiedImageError
from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.errors import (
    AppError,
    ConflictError,
    ForbiddenError,
    InvalidQueryError,
    NotFoundError,
)
from app.core.ids import uuid7
from app.core.security import hash_token, new_token
from app.integrations.isbn.base import InvalidIsbnError, IsbnLookupProvider, normalize_isbn
from app.integrations.storage.base import ImageScanner, PhotoStorage
from app.modules.identity import service as identity
from app.modules.identity.service import Authenticated
from app.modules.listings import repository
from app.modules.listings.models import Book, Listing
from app.modules.listings.models import ListingPhoto as PhotoModel
from app.modules.listings.repository import get_book
from app.modules.listings.schemas import (
    BookMetadata,
    Condition,
    Currency,
    Fulfillment,
    ListingDraftRequest,
    ListingPage,
    ListingPatchRequest,
    ListingPhoto,
    ListingResponse,
    ListingSearchQuery,
    ListingStatus,
    PhotoUploadRequest,
    PhotoUploadResponse,
    PublicListingDetail,
    PublicListingPage,
    PublicListingStatus,
    PublicListingSummary,
    PublicLocation,
    PublicSitemapEntry,
    PublicSitemapPage,
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


MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTO_PIXELS = 20_000_000
ALLOWED_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


class InvalidPhotoError(AppError):
    status = 422
    code = "invalid_photo"


def clean_image(data: bytes, expected_type: str) -> bytes:
    if not data or len(data) > MAX_PHOTO_BYTES:
        raise InvalidPhotoError()
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if (
                    image.width * image.height > MAX_PHOTO_PIXELS
                    or ALLOWED_FORMATS.get(image.format or "") != expected_type
                    or getattr(image, "is_animated", False)
                ):
                    raise InvalidPhotoError()
                image.verify()
            with Image.open(BytesIO(data)) as image:
                upright = ImageOps.exif_transpose(image)
                cleaned = Image.new("RGB", upright.size, "white")
                if upright.mode in {"RGBA", "LA"} or "transparency" in upright.info:
                    rgba = upright.convert("RGBA")
                    cleaned.paste(rgba, mask=rgba.getchannel("A"))
                else:
                    cleaned.paste(upright.convert("RGB"))
                output = BytesIO()
                cleaned.save(output, format="JPEG", quality=85)
                result = output.getvalue()
        if len(result) > MAX_PHOTO_BYTES:
            raise InvalidPhotoError()
        return result
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise InvalidPhotoError() from None


async def photo_ticket(
    db: AsyncSession,
    clock: Clock,
    auth: Authenticated,
    listing_id: UUID,
    body: PhotoUploadRequest,
    storage: PhotoStorage,
    local_url: str,
) -> PhotoUploadResponse:
    listing = await get_owned(db, auth, listing_id, lock=True)
    if listing.purchase_locked:
        raise ConflictError(code="listing_purchase_locked")
    photos = await repository.listing_photos(db, listing_id, all_photos=True)
    for photo in list(photos):
        if (
            not photo.validated
            and photo.upload_expires_at
            and photo.upload_expires_at <= clock.now()
        ):
            await storage.delete(photo.path)
            await db.delete(photo)
            photos.remove(photo)
    await db.flush()
    if len(photos) >= 6:
        raise ConflictError(code="photo_limit_reached")
    photo_id, token = uuid7(), new_token()
    path = f"quarantine/{auth.user.id}/{listing_id}/{photo_id}"
    position = next(
        index for index in range(6) if index not in {photo.position for photo in photos}
    )
    photo = PhotoModel(
        id=photo_id,
        listing_id=listing_id,
        path=path,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
        position=position,
        validated=False,
        upload_token_hash=hash_token(token),
        upload_expires_at=clock.now() + timedelta(minutes=5),
        created_at=clock.now(),
        updated_at=clock.now(),
    )
    url = await storage.upload_url(path)
    db.add(photo)
    await db.commit()
    return PhotoUploadResponse(
        photo_id=photo_id, upload_url=url or f"{local_url}/{photo_id}?token={token}", expires_in=300
    )


async def local_upload(
    db: AsyncSession,
    clock: Clock,
    photo_id: UUID,
    token: str,
    content_type: str,
    data: bytes,
    storage: PhotoStorage,
) -> None:
    photo = await db.scalar(select(PhotoModel).where(PhotoModel.id == photo_id).with_for_update())
    if (
        photo is None
        or not photo.upload_token_hash
        or not compare_digest(hash_token(token), photo.upload_token_hash)
        or photo.validated
        or photo.upload_expires_at is None
        or photo.upload_expires_at <= clock.now()
    ):
        raise NotFoundError()
    if content_type != photo.content_type or len(data) != photo.size_bytes:
        raise InvalidPhotoError()
    try:
        await storage.store(photo.path, data, content_type)
    except FileExistsError:
        raise ConflictError(code="photo_already_uploaded") from None


async def complete_photo(
    db: AsyncSession,
    clock: Clock,
    auth: Authenticated,
    listing_id: UUID,
    photo_id: UUID,
    storage: PhotoStorage,
    scanner: ImageScanner,
    slots: asyncio.Semaphore,
) -> ListingResponse:
    listing = await get_owned(db, auth, listing_id, lock=True)
    if listing.purchase_locked:
        raise ConflictError(code="listing_purchase_locked")
    photo = await db.scalar(
        select(PhotoModel).where(PhotoModel.id == photo_id, PhotoModel.listing_id == listing_id)
    )
    if photo is None:
        raise NotFoundError()
    if photo.validated:
        return await view(db, listing)
    if photo.upload_expires_at is None or photo.upload_expires_at <= clock.now():
        raise ConflictError(code="photo_upload_expired")
    try:
        data = await storage.download(photo.path, MAX_PHOTO_BYTES)
    except ValueError:
        raise InvalidPhotoError() from None
    if len(data) != photo.size_bytes or not await scanner.scan(data):
        raise InvalidPhotoError()
    async with slots:
        cleaned = await asyncio.to_thread(clean_image, data, photo.content_type)
    raw_path = photo.path
    clean_path = f"clean/{auth.user.id}/{listing_id}/{uuid7()}.jpg"
    await storage.store(clean_path, cleaned, "image/jpeg")
    photo.path, photo.content_type, photo.size_bytes = clean_path, "image/jpeg", len(cleaned)
    photo.validated, photo.upload_token_hash, photo.upload_expires_at = True, None, None
    photo.updated_at = listing.updated_at = clock.now()
    listing.version += 1
    try:
        await db.commit()
    except Exception:
        await storage.delete(clean_path)
        raise
    await storage.delete(raw_path)
    await db.refresh(listing)
    return await view(db, listing)


async def remove_photo(
    db: AsyncSession,
    clock: Clock,
    auth: Authenticated,
    listing_id: UUID,
    photo_id: UUID,
    storage: PhotoStorage,
) -> ListingResponse:
    listing = await get_owned(db, auth, listing_id, lock=True)
    if listing.purchase_locked:
        raise ConflictError(code="listing_purchase_locked")
    photos = await repository.listing_photos(db, listing_id, all_photos=True)
    photo = next((photo for photo in photos if photo.id == photo_id), None)
    if photo is None:
        raise NotFoundError()
    if (
        photo.validated
        and listing.status in {"active", "reserved", "sold"}
        and sum(photo.validated for photo in photos) <= 1
    ):
        raise ConflictError(code="listing_photos_required")
    await db.delete(photo)
    listing.updated_at = clock.now()
    listing.version += 1
    await db.commit()
    await storage.delete(photo.path)
    await db.refresh(listing)
    return await view(db, listing)


async def read_photo(
    db: AsyncSession,
    auth: Authenticated,
    listing_id: UUID,
    photo_id: UUID,
    storage: PhotoStorage,
) -> tuple[str | None, bytes | None]:
    await get_owned(db, auth, listing_id)
    photo = await db.scalar(
        select(PhotoModel).where(
            PhotoModel.id == photo_id,
            PhotoModel.listing_id == listing_id,
            PhotoModel.validated.is_(True),
        )
    )
    if photo is None:
        raise NotFoundError()
    url = await storage.read_url(photo.path)
    return (url, None) if url else (None, await storage.download(photo.path, MAX_PHOTO_BYTES))


def search_fingerprint(filters: ListingSearchQuery) -> str:
    payload = filters.model_dump(mode="json", exclude={"cursor", "limit"})
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:24]


def search_cursor(listing_id: UUID, filters: ListingSearchQuery) -> str:
    payload = json.dumps({"v": 1, "id": str(listing_id), "filters": search_fingerprint(filters)})
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")


def parse_search_cursor(filters: ListingSearchQuery) -> UUID | None:
    if not filters.cursor:
        return None
    try:
        value = json.loads(
            base64.b64decode(
                filters.cursor + "=" * (-len(filters.cursor) % 4), altchars=b"-_", validate=True
            )
        )
        if value["v"] != 1 or value["filters"] != search_fingerprint(filters):
            raise ValueError
        return UUID(value["id"])
    except (ValueError, TypeError, KeyError, binascii.Error) as exc:
        raise InvalidQueryError(code="invalid_search_cursor") from exc


def public_summary(
    listing: Listing, city: str, region: str, country: str, cover: str | None
) -> PublicListingSummary:
    return PublicListingSummary(
        id=listing.id,
        isbn=listing.isbn,
        title=listing.title,
        author=listing.author,
        condition=Condition(listing.condition),
        fulfillment=Fulfillment(listing.fulfillment),
        price_minor=cast(int, listing.price_minor),
        currency=Currency(listing.currency),
        status=PublicListingStatus(listing.status),
        available=listing.status == "active",
        location=PublicLocation(city=city, region=region, country=country),
        cover_url=cover,
    )


async def search_public(
    db: AsyncSession, filters: ListingSearchQuery, photo_url: Callable[[UUID, UUID], str]
) -> PublicListingPage:
    if filters.isbn:
        try:
            filters = filters.model_copy(update={"isbn": normalize_isbn(filters.isbn)})
        except InvalidIsbnError as exc:
            raise InvalidQueryError(code="invalid_isbn") from exc
    after = parse_search_cursor(filters)
    rows = await repository.public_page(db, filters, after)
    visible = rows[: filters.limit]
    return PublicListingPage(
        items=[
            public_summary(
                listing,
                city,
                region,
                country,
                photo_url(listing.id, cover_id) if cover_id else None,
            )
            for listing, city, region, country, cover_id in visible
        ],
        next_cursor=search_cursor(visible[-1][0].id, filters)
        if len(rows) > filters.limit
        else None,
    )


async def detail_public(
    db: AsyncSession, listing_id: UUID, photo_url: Callable[[UUID, UUID], str]
) -> PublicListingDetail:
    row = (
        await db.execute(repository.public_query(detail=True).where(Listing.id == listing_id))
    ).one_or_none()
    if row is None:
        raise NotFoundError()
    listing, city, region, country = row
    photos = [
        ListingPhoto(id=p.id, position=p.position, url=photo_url(listing_id, p.id))
        for p in await repository.public_photos(db, [listing_id])
    ]
    summary = public_summary(listing, city, region, country, photos[0].url if photos else None)
    return PublicListingDetail(
        **summary.model_dump(),
        notes=listing.notes,
        photos=photos,
        delivery_estimate=None,
        updated_at=listing.updated_at,
    )


async def read_public_photo(
    db: AsyncSession, listing_id: UUID, photo_id: UUID, storage: PhotoStorage
) -> bytes:
    visible = await db.scalar(
        repository.public_query(detail=True)
        .where(Listing.id == listing_id)
        .with_only_columns(Listing.id)
    )
    if visible is None:
        raise NotFoundError()
    photo = await db.scalar(
        select(PhotoModel).where(
            PhotoModel.id == photo_id,
            PhotoModel.listing_id == listing_id,
            PhotoModel.validated.is_(True),
        )
    )
    if photo is None:
        raise NotFoundError()
    return await storage.download(photo.path, MAX_PHOTO_BYTES)


def demo_id(seller: UUID, index: int, kind: str) -> UUID:
    digest = hashlib.sha256(f"bookloop-demo-v1:{seller}:{index}:{kind}".encode()).hexdigest()
    return UUID(f"01900000-0000-7{digest[:3]}-8{digest[3:6]}-{digest[6:18]}")


def demo_photo(index: int) -> bytes:
    image = Image.new("RGB", (600, 900), (35 + index % 100, 45, 95))
    draw = ImageDraw.Draw(image)
    draw.text((40, 100), "BOOKLOOP DEMO", fill="white", font_size=36)
    draw.text((40, 180), f"Reading copy {index + 1}", fill="white", font_size=28)
    data = BytesIO()
    image.save(data, "JPEG", quality=85)
    return data.getvalue()


async def seed_listings(
    db: AsyncSession,
    count: int = 500,
    *,
    seller_id: UUID | None = None,
    storage: PhotoStorage | None = None,
) -> int:
    if not 500 <= count <= 50_000:
        raise ValueError("Seed count must be between 500 and 50000")
    eligible = identity.public_seller_locations()
    query = select(eligible.c.user_id, eligible.c.id).order_by(eligible.c.user_id, eligible.c.id)
    if seller_id is not None:
        query = query.where(eligible.c.user_id == seller_id)
    row = (await db.execute(query.limit(1))).one_or_none()
    if row is None:
        raise NotFoundError(
            "Create a verified seller with an address first", code="seed_seller_required"
        )
    seller, address = row
    existing = set(await db.scalars(select(Listing.id).where(Listing.seller_id == seller)))
    missing = [
        (i, demo_id(seller, i, "listing"))
        for i in range(count)
        if demo_id(seller, i, "listing") not in existing
    ]
    titles = (
        "The Quiet Library",
        "A Journey Through Space",
        "Gardens of Tomorrow",
        "History of the City",
        "Mathematics for Readers",
    )
    authors = ("Ada Reader", "Samuel Green", "Maya Finch", "Noah Brooks", "Leila Stone")
    for offset in range(0, len(missing), 500):
        batch = missing[offset : offset + 500]
        await db.execute(
            insert(Listing),
            [
                dict(
                    id=id_,
                    seller_id=seller,
                    address_id=address,
                    title=f"{titles[i % len(titles)]} — Demo {i + 1}",
                    author=authors[i % len(authors)],
                    condition=("good", "like_new", "very_good", "acceptable", "new")[i % 5],
                    fulfillment="warehouse" if i % 3 == 0 else "on_demand",
                    currency="EUR" if i % 2 else "USD",
                    price_minor=500 + (i % 200) * 25,
                    notes="Demo listing for development; not a real item for sale.",
                    status="draft",
                )
                for i, id_ in batch
            ],
        )
        photos = []
        for i, id_ in batch:
            path = f"demo/{seller}/{id_}.jpg"
            data = demo_photo(i) if storage else b""
            if storage:
                await storage.store(path, data, "image/jpeg")
            photos.append(
                dict(
                    id=demo_id(seller, i, "photo"),
                    listing_id=id_,
                    path=path,
                    content_type="image/jpeg",
                    size_bytes=len(data) or 100,
                    position=0,
                    validated=True,
                )
            )
        await db.execute(insert(PhotoModel), photos)
        ids = [id_ for _, id_ in batch]
        for fulfillment, status in (("warehouse", "incoming"), ("on_demand", "active")):
            await db.execute(
                update(Listing)
                .where(Listing.id.in_(ids), Listing.fulfillment == fulfillment)
                .values(status=status)
            )
    await db.commit()
    await db.execute(
        text("ANALYZE listings, listing_photos, users, addresses, user_roles, seller_verifications")
    )
    await db.commit()
    return len(missing)


async def simulate_reservation(db: AsyncSession, clock: Clock, listing_id: UUID) -> bool:
    reserved = await db.scalar(
        update(Listing)
        .where(Listing.id == listing_id, Listing.status == "active")
        .values(status="reserved", updated_at=clock.now())
        .returning(Listing.id)
    )
    await db.commit()
    return reserved is not None


async def sitemap_public(db: AsyncSession, cursor: UUID | None, limit: int) -> PublicSitemapPage:
    rows = await repository.public_sitemap(db, cursor, limit)
    visible = rows[:limit]
    return PublicSitemapPage(
        items=[PublicSitemapEntry(id=id_, updated_at=modified) for id_, modified in visible],
        next_cursor=visible[-1][0] if len(rows) > limit else None,
    )
