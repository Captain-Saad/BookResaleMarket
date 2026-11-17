import asyncio
import json

import httpx2
from pydantic import BaseModel, Field

from app.integrations.isbn.base import normalize_isbn
from app.modules.listings.schemas import BookMetadata

LOOKUP_URL = "https://openlibrary.org/api/books"
MAX_RESPONSE_BYTES = 256 * 1024


class _Author(BaseModel):
    name: str = Field(max_length=200)


class _Book(BaseModel):
    title: str = Field(max_length=300)
    authors: list[_Author] = Field(default_factory=list, max_length=30)


class OpenLibraryProvider:
    def __init__(self, transport: httpx2.AsyncBaseTransport | None = None) -> None:
        self.transport = transport

    async def lookup(self, isbn: str) -> BookMetadata:
        isbn = normalize_isbn(isbn)
        fallback = BookMetadata(isbn=isbn, title="", author="", found=False)
        try:
            async with (
                asyncio.timeout(5),
                httpx2.AsyncClient(
                    timeout=3, follow_redirects=False, transport=self.transport
                ) as client,
            ):
                async with client.stream(
                    "GET",
                    LOOKUP_URL,
                    params={"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"},
                ) as response:
                    if response.status_code != 200:
                        return fallback
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > MAX_RESPONSE_BYTES:
                            return fallback
            payload = json.loads(body)
            if not isinstance(payload, dict) or f"ISBN:{isbn}" not in payload:
                return fallback
            book = _Book.model_validate(payload[f"ISBN:{isbn}"])
            return BookMetadata(
                isbn=isbn,
                title=book.title,
                author=", ".join(author.name for author in book.authors)[:200],
                found=True,
            )
        except (httpx2.HTTPError, ValueError, TimeoutError):
            return fallback
