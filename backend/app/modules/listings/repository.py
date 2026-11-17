from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.listings.models import Book, Listing, ListingPhoto


async def get_book(db: AsyncSession, isbn: str) -> Book | None:
    return await db.scalar(select(Book).where(Book.isbn == isbn))


async def owned_listing(
    db: AsyncSession, seller_id: UUID, listing_id: UUID, *, lock: bool = False
) -> Listing | None:
    query = select(Listing).where(Listing.id == listing_id, Listing.seller_id == seller_id)
    if lock:
        query = query.with_for_update()
    return await db.scalar(query)


async def listing_photos(
    db: AsyncSession, listing_id: UUID, *, all_photos: bool = False
) -> list[ListingPhoto]:
    query = select(ListingPhoto).where(ListingPhoto.listing_id == listing_id)
    if not all_photos:
        query = query.where(ListingPhoto.validated.is_(True))
    return list(await db.scalars(query.order_by(ListingPhoto.position, ListingPhoto.id)))


async def own_page(
    db: AsyncSession, seller_id: UUID, cursor: UUID | None, limit: int
) -> list[Listing]:
    query = select(Listing).where(Listing.seller_id == seller_id)
    if cursor is not None:
        query = query.where(Listing.id < cursor)
    return list(await db.scalars(query.order_by(Listing.id.desc()).limit(limit)))
