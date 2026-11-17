from typing import Annotated, cast

from fastapi import APIRouter, Depends, Path, Request

from app.core.deps import ClockDep, DbDep, public
from app.core.rate_limit import rate_limit_by_ip
from app.integrations.isbn.base import IsbnLookupProvider
from app.modules.listings.schemas import BookMetadata
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
