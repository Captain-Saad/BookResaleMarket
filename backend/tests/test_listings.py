import asyncio
from collections.abc import Callable
from datetime import timedelta
from uuid import UUID

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import DBAPIError

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


SELLER = "seller@example.com"


def seller_listing(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    *,
    fulfillment: str = "on_demand",
) -> dict[str, object]:
    sign_in(SELLER)
    assert api.post("/api/v1/me/roles/seller").status_code == 200
    api.post("/api/v1/me/seller-verification")
    execute_sql("UPDATE seller_verifications SET status='verified'")
    address = api.post(
        "/api/v1/me/addresses",
        json={
            "recipientName": "Ada",
            "line1": "Private street",
            "city": "Boston",
            "region": "MA",
            "postalCode": "02108",
            "country": "US",
        },
    ).json()
    result = api.post(
        "/api/v1/listings",
        json={
            "title": "A book",
            "author": "An author",
            "isbn": ISBN,
            "condition": "good",
            "fulfillment": fulfillment,
            "priceMinor": 1200,
            "addressId": address["id"],
        },
    )
    assert result.status_code == 201
    listing: dict[str, object] = result.json()
    execute_sql(
        "INSERT INTO listing_photos(id,listing_id,path,content_type,size_bytes,position,validated) "
        f"VALUES ('01900000-0000-7000-8000-000000000001','{listing['id']}',"
        "'test/photo.jpg','image/jpeg',100,0,true)"
    )
    return listing


def test_listing_requires_seller_role(api: TestClient, sign_in: Callable[[str], None]) -> None:
    sign_in("buyer@example.com")
    assert api.post("/api/v1/listings", json={}).status_code == 403


def test_publish_and_permanent_identity_lock(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    path = f"/api/v1/listings/{listing['id']}"
    result = api.post(f"{path}/publish")
    assert result.status_code == 200
    active = result.json()
    assert active["status"] == "active" and active["identityLocked"]
    assert (
        api.patch(path, json={"version": active["version"], "condition": "new"}).json()["code"]
        == "listing_identity_locked"
    )
    updated = api.patch(path, json={"version": active["version"], "priceMinor": 1500})
    assert updated.status_code == 200 and updated.json()["priceMinor"] == 1500
    assert (
        api.patch(path, json={"version": active["version"], "notes": "stale edit"}).json()["code"]
        == "stale_listing"
    )
    deactivated = api.post(f"{path}/deactivate").json()
    assert deactivated["identityLocked"]
    assert (
        api.patch(path, json={"version": deactivated["version"], "isbn": "0306406152"}).status_code
        == 409
    )


def test_owner_scoping_and_private_address_output(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    own = api.get("/api/v1/me/listings").json()
    assert own["items"][0]["id"] == listing["id"]
    assert "Private street" not in str(own)
    sign_in("other@example.com")
    api.post("/api/v1/me/roles/seller")
    assert api.get("/api/v1/me/listings").json()["items"] == []
    assert (
        api.patch(
            f"/api/v1/listings/{listing['id']}", json={"version": 1, "notes": "attack"}
        ).status_code
        == 404
    )
    for action in ("publish", "deactivate"):
        assert api.post(f"/api/v1/listings/{listing['id']}/{action}").status_code == 404
    assert api.post("/api/v1/listings", json={"addressId": listing["addressId"]}).status_code == 404


def test_warehouse_waits_for_inspection_and_deactivation_records_return_stub(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql, fulfillment="warehouse")
    path = f"/api/v1/listings/{listing['id']}"
    incoming = api.post(f"{path}/publish").json()
    assert incoming["status"] == "incoming" and not incoming["identityLocked"]
    execute_sql(
        f"UPDATE listings SET warehouse_intake_at=now(), status='active' WHERE id='{listing['id']}'"
    )
    deactivated = api.post(f"{path}/deactivate").json()
    assert deactivated["returnOrDonationPending"] is True
    assert api.post(f"{path}/publish").status_code == 409


def test_unverified_sellers_cannot_publish_and_unknown_fields_are_rejected(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    execute_sql("UPDATE seller_verifications SET status='pending'")
    assert (
        api.post(f"/api/v1/listings/{listing['id']}/publish").json()["code"]
        == "seller_not_verified"
    )
    assert api.post("/api/v1/listings", json={"status": "active"}).status_code == 422


def test_database_guards_cannot_be_bypassed(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    scalar: Callable[[str], object],
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    listing_id = listing["id"]
    api.post(f"/api/v1/listings/{listing_id}/publish")
    with pytest.raises(DBAPIError):
        execute_sql(f"UPDATE listings SET condition='new' WHERE id='{listing_id}'")
    execute_sql(f"UPDATE listings SET status='reserved' WHERE id='{listing_id}'")
    for sql in (
        f"UPDATE listings SET fulfillment='warehouse' WHERE id='{listing_id}'",
        f"UPDATE listings SET price_minor=100 WHERE id='{listing_id}'",
        f"DELETE FROM listing_photos WHERE listing_id='{listing_id}'",
        f"DELETE FROM listings WHERE id='{listing_id}'",
        f"DELETE FROM listing_status_history WHERE listing_id='{listing_id}'",
    ):
        with pytest.raises(DBAPIError):
            execute_sql(sql)
    assert api.post(f"/api/v1/listings/{listing_id}/deactivate").status_code == 409
    assert (
        scalar(f"SELECT count(*) FROM listing_status_history WHERE listing_id='{listing_id}'") == 3
    )
    history_id = scalar(
        f"SELECT id FROM listing_status_history WHERE listing_id='{listing_id}' LIMIT 1"
    )
    assert isinstance(history_id, UUID) and history_id.version == 7


def test_incomplete_active_edit_is_rejected(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    active = api.post(f"/api/v1/listings/{listing['id']}/publish").json()
    assert (
        api.patch(
            f"/api/v1/listings/{listing['id']}",
            json={"version": active["version"], "priceMinor": None},
        ).status_code
        == 409
    )


@pytest.mark.parametrize("fulfillment", ["on_demand", "warehouse"])
def test_address_deletion_is_blocked_until_listing_is_deactivated(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    fulfillment: str,
) -> None:
    listing = seller_listing(api, sign_in, execute_sql, fulfillment=fulfillment)
    api.post(f"/api/v1/listings/{listing['id']}/publish")
    blocked = api.delete(f"/api/v1/me/addresses/{listing['addressId']}")
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "address_in_use"
    with pytest.raises(DBAPIError):
        execute_sql(f"DELETE FROM addresses WHERE id='{listing['addressId']}'")
    assert api.post(f"/api/v1/listings/{listing['id']}/deactivate").status_code == 200
    assert api.delete(f"/api/v1/me/addresses/{listing['addressId']}").status_code == 204


@pytest.mark.parametrize("status", ["reserved", "sold"])
def test_buyer_committed_listing_keeps_its_address(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    status: str,
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    api.post(f"/api/v1/listings/{listing['id']}/publish")
    execute_sql(f"UPDATE listings SET status='reserved' WHERE id='{listing['id']}'")
    if status == "sold":
        execute_sql(f"UPDATE listings SET status='sold' WHERE id='{listing['id']}'")
    assert api.delete(f"/api/v1/me/addresses/{listing['addressId']}").status_code == 409
    with pytest.raises(DBAPIError):
        execute_sql(f"DELETE FROM addresses WHERE id='{listing['addressId']}'")
