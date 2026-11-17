from datetime import timedelta

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.integrations.isbn.base import IsbnLookupProvider, normalize_isbn
from app.modules.listings.models import Book
from app.modules.listings.repository import get_book
from app.modules.listings.schemas import BookMetadata


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
