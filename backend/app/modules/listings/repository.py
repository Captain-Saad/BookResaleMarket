from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import Nullable, Row, Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.service import public_seller_locations
from app.modules.listings.models import Book, Listing, ListingPhoto
from app.modules.listings.schemas import ListingSearchQuery


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


async def address_in_use(db: AsyncSession, seller_id: UUID, address_id: UUID) -> bool:
    return (
        await db.scalar(
            select(Listing.id)
            .where(
                Listing.seller_id == seller_id,
                Listing.address_id == address_id,
                Listing.status.in_(["incoming", "active", "reserved", "sold"]),
            )
            .limit(1)
        )
        is not None
    )


def public_query(*, detail: bool = False) -> Select[Listing, str, str, str]:
    locations = public_seller_locations()
    return (
        select(Listing, locations.c.city, locations.c.region, locations.c.country)
        .join(
            locations,
            and_(Listing.seller_id == locations.c.user_id, Listing.address_id == locations.c.id),
        )
        .where(
            Listing.status.in_(
                ["active", "incoming", "reserved", "sold"] if detail else ["active", "incoming"]
            ),
            Listing.price_minor.is_not(None),
            Listing.title != "",
            Listing.author != "",
        )
    )


async def public_page(
    db: AsyncSession, filters: ListingSearchQuery, after: UUID | None
) -> Sequence[Row[Listing, str, str, str, UUID | None]]:
    first_photo = (
        select(Nullable(ListingPhoto.id))
        .where(ListingPhoto.listing_id == Listing.id, ListingPhoto.validated.is_(True))
        .order_by(ListingPhoto.position, ListingPhoto.id)
        .limit(1)
        .correlate(Listing)
        .scalar_subquery()
    )
    query = public_query().add_columns(first_photo)
    if filters.q:
        text_value = func.lower(Listing.title + " " + Listing.author)
        query = query.where(
            or_(
                Listing.search_document.op("@@")(func.websearch_to_tsquery("english", filters.q)),
                text_value.contains(filters.q.lower(), autoescape=True),
            )
        )
    if filters.author:
        query = query.where(
            func.lower(Listing.author).contains(filters.author.lower(), autoescape=True)
        )
    for name in ("isbn", "condition", "fulfillment", "currency"):
        value = getattr(filters, name)
        if value is not None:
            query = query.where(getattr(Listing, name) == value)
    if filters.min_price is not None:
        query = query.where(Listing.price_minor >= filters.min_price)
    if filters.max_price is not None:
        query = query.where(Listing.price_minor <= filters.max_price)
    if after is not None:
        query = query.where(Listing.id < after)
    return (await db.execute(query.order_by(Listing.id.desc()).limit(filters.limit + 1))).all()


async def public_photos(db: AsyncSession, ids: list[UUID]) -> list[ListingPhoto]:
    return list(
        await db.scalars(
            select(ListingPhoto)
            .where(ListingPhoto.listing_id.in_(ids), ListingPhoto.validated.is_(True))
            .order_by(ListingPhoto.position, ListingPhoto.id)
        )
    )
