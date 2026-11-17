import asyncio
import warnings
from datetime import timedelta
from hmac import compare_digest
from io import BytesIO
from uuid import UUID

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.errors import AppError, ConflictError, ForbiddenError, NotFoundError
from app.core.ids import uuid7
from app.core.security import hash_token, new_token
from app.integrations.isbn.base import IsbnLookupProvider, normalize_isbn
from app.integrations.storage.base import ImageScanner, PhotoStorage
from app.modules.identity import service as identity
from app.modules.identity.service import Authenticated
from app.modules.listings import repository
from app.modules.listings.models import Book, Listing
from app.modules.listings.models import ListingPhoto as PhotoModel
from app.modules.listings.repository import get_book
from app.modules.listings.schemas import (
    BookMetadata,
    ListingDraftRequest,
    ListingPage,
    ListingPatchRequest,
    ListingPhoto,
    ListingResponse,
    ListingStatus,
    PhotoUploadRequest,
    PhotoUploadResponse,
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
