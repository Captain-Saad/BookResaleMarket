import asyncio
from collections.abc import Callable
from datetime import timedelta

import httpx2
import pytest
from fastapi.testclient import TestClient

from app.integrations.isbn.base import InvalidIsbnError, normalize_isbn
from app.integrations.isbn.real import OpenLibraryProvider
from app.modules.listings.schemas import BookMetadata

ISBN = "9780441478125"


@pytest.mark.parametrize("isbn", [ISBN, "978-0-441-47812-5", "0306406152", "0-8044-2957-X"])
def test_valid_isbn(isbn: str) -> None:
    assert normalize_isbn(isbn).replace("-", "")


@pytest.mark.parametrize("isbn", ["9780441478124", "0306406153", "http://127.0.0.1", "", "1" * 100])
def test_invalid_isbn(isbn: str) -> None:
    with pytest.raises(InvalidIsbnError):
        normalize_isbn(isbn)


def test_isbn_provider_uses_fixed_host_and_does_not_follow_redirects() -> None:
    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        requests.append(request)
        return httpx2.Response(302, headers={"Location": "http://127.0.0.1/private"})

    provider = OpenLibraryProvider(httpx2.MockTransport(respond))
    result = asyncio.run(provider.lookup(ISBN))
    assert result.found is False
    assert len(requests) == 1
    assert requests[0].url.host == "openlibrary.org"
    assert requests[0].url.params["bibkeys"] == f"ISBN:{ISBN}"


def test_isbn_provider_limits_response_and_supports_manual_fallback() -> None:
    provider = OpenLibraryProvider(
        httpx2.MockTransport(lambda _: httpx2.Response(200, content=b"x" * (256 * 1024 + 1)))
    )
    assert asyncio.run(provider.lookup(ISBN)).found is False


class FakeIsbnProvider:
    def __init__(self) -> None:
        self.calls = 0

    async def lookup(self, isbn: str) -> BookMetadata:
        self.calls += 1
        return BookMetadata(isbn=isbn, title="A book", author="An author", found=True)


def test_isbn_metadata_is_cached_and_refreshed(api: TestClient) -> None:
    provider = FakeIsbnProvider()
    api.app.state.isbn_provider = provider  # type: ignore[attr-defined]
    assert api.get(f"/api/v1/isbn/{ISBN}").json()["found"] is True
    assert api.get(f"/api/v1/isbn/{ISBN}").json()["title"] == "A book"
    assert provider.calls == 1
    api.app.state.clock.advance(timedelta(hours=25))  # type: ignore[attr-defined]
    assert api.get(f"/api/v1/isbn/{ISBN}").status_code == 200
    assert provider.calls == 2


def test_all_listing_tables_have_deny_by_default_rls(
    api: TestClient, scalar: Callable[[str], object]
) -> None:
    assert (
        scalar(
            "SELECT count(*) FROM pg_class WHERE relname IN "
            "('books','listings','listing_photos','listing_status_history') AND relrowsecurity"
        )
        == 4
    )
    assert (
        scalar(
            "SELECT count(*) FROM pg_policies WHERE tablename IN "
            "('books','listings','listing_photos','listing_status_history')"
        )
        == 0
    )


def test_isbn_provider_extracts_only_book_metadata() -> None:
    provider = OpenLibraryProvider(
        httpx2.MockTransport(
            lambda _: httpx2.Response(
                200,
                json={
                    f"ISBN:{ISBN}": {
                        "title": "A book",
                        "authors": [{"name": "An author"}],
                        "url": "http://127.0.0.1/ignored",
                    }
                },
            )
        )
    )
    book = asyncio.run(provider.lookup(ISBN))
    assert book.found
    assert book.title == "A book"
    assert book.author == "An author"
