import asyncio
from collections.abc import Callable
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from test_listings import seller_listing

from app.core.db import to_async_url
from app.modules.listings.service import seed_listings


@pytest.fixture
def published(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> str:
    listing = seller_listing(api, sign_in, execute_sql)
    id_ = str(listing["id"])
    assert api.post(f"/api/v1/listings/{id_}/publish").status_code == 200
    api.cookies.clear()
    return id_


def test_public_payload_is_whitelisted_and_uncached(api: TestClient, published: str) -> None:
    response = api.get("/api/v1/listings")
    assert response.status_code == 200, response.text
    book = response.json()["items"][0]
    assert book["id"] == published and book["available"] is True
    assert book["location"] == {"city": "Boston", "region": "MA", "country": "US"}
    assert set(book) == {
        "id",
        "isbn",
        "title",
        "author",
        "condition",
        "fulfillment",
        "priceMinor",
        "currency",
        "status",
        "available",
        "location",
        "coverUrl",
    }
    assert "/public-photos/" in book["coverUrl"]
    assert "no-store" in response.headers["cache-control"]
    assert "etag" not in response.headers
    detail = api.get(f"/api/v1/listings/{published}")
    assert set(detail.json()) == set(book) | {"notes", "photos", "deliveryEstimate", "updatedAt"}
    assert detail.json()["deliveryEstimate"] is None
    assert "Private street" not in detail.text and "02108" not in detail.text
    assert "no-store" in detail.headers["cache-control"] and "etag" not in detail.headers


@pytest.mark.parametrize(
    "params,expected",
    [
        ({"q": "boo"}, 1),
        ({"q": "BOOK"}, 1),
        ({"q": "missing"}, 0),
        ({"author": "auth"}, 1),
        ({"isbn": "978-0-441-47812-5"}, 1),
        ({"condition": "new"}, 0),
        (
            {
                "condition": "good",
                "fulfillment": "on_demand",
                "currency": "USD",
                "min_price": 1000,
                "max_price": 1300,
            },
            1,
        ),
        ({"currency": "EUR"}, 0),
        ({"currency": "USD", "max_price": 1000}, 0),
        ({"q": "' OR 1=1 --"}, 0),
        ({"q": "%"}, 0),
        ({"q": "_"}, 0),
    ],
)
def test_combined_filters_and_injection(
    api: TestClient, published: str, params: dict[str, str | int], expected: int
) -> None:
    response = api.get("/api/v1/listings", params=params)
    assert response.status_code == 200, response.text
    assert len(response.json()["items"]) == expected


@pytest.mark.parametrize(
    "params", [{"min_price": 1}, {"q": "\x00"}, {"cursor": "bad"}, {"isbn": "123"}, {"limit": 101}]
)
def test_invalid_search_is_422(api: TestClient, params: dict[str, str | int]) -> None:
    assert api.get("/api/v1/listings", params=params).status_code == 422


def test_stock_changes_are_immediate_and_detail_stays_visible(
    api: TestClient, published: str, execute_sql: Callable[[str], None]
) -> None:
    for status in ("reserved", "sold"):
        execute_sql(f"UPDATE listings SET status='{status}' WHERE id='{published}'")
        assert api.get("/api/v1/listings").json()["items"] == []
        detail = api.get(f"/api/v1/listings/{published}")
        assert detail.status_code == 200
        assert detail.json()["status"] == status and detail.json()["available"] is False


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE users SET status='suspended'",
        "UPDATE seller_verifications SET status='rejected'",
        "DELETE FROM user_roles WHERE role='seller'",
        "UPDATE listings SET status='deactivated'",
    ],
)
def test_hidden_listings_and_photos_are_not_public(
    api: TestClient, published: str, execute_sql: Callable[[str], None], sql: str
) -> None:
    photo = api.get(f"/api/v1/listings/{published}").json()["photos"][0]["url"]
    execute_sql(sql)
    assert api.get("/api/v1/listings").json()["items"] == []
    assert api.get(f"/api/v1/listings/{published}").status_code == 404
    assert api.get(photo).status_code == 404


def test_seed_is_idempotent_and_cursor_is_bound_to_filters(
    api: TestClient, published: str, database_url: str
) -> None:
    async def seed() -> None:
        engine = create_async_engine(to_async_url(database_url), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as db:
                assert await seed_listings(db) == 500
                assert await seed_listings(db) == 0
        finally:
            await engine.dispose()

    asyncio.run(seed())
    seen: set[str] = set()
    cursor = None
    while True:
        params: dict[str, str | int] = {"limit": 100}
        if cursor:
            params["cursor"] = cursor
        response = api.get("/api/v1/listings", params=params)
        assert response.status_code == 200, response.text
        page = response.json()
        ids = [book["id"] for book in page["items"]]
        assert ids == sorted(ids, reverse=True)
        assert not seen.intersection(ids)
        seen.update(ids)
        cursor = page["nextCursor"]
        if not cursor:
            break
        assert (
            api.get("/api/v1/listings", params={"cursor": cursor, "q": "different"}).status_code
            == 422
        )
    assert len(seen) == 501


@pytest.mark.performance
def test_search_p95_under_200ms_with_50000_listings(
    api: TestClient, published: str, database_url: str
) -> None:
    import statistics
    import time

    async def seed() -> None:
        engine = create_async_engine(to_async_url(database_url), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as db:
                assert await seed_listings(db, 50_000) == 50_000
                from sqlalchemy import select, text

                from app.modules.listings.models import Listing, ListingPhoto
                from app.modules.listings.repository import public_query

                statements = [
                    public_query().order_by(Listing.id.desc()).limit(25),
                    select(ListingPhoto).where(ListingPhoto.listing_id.in_([UUID(published)])),
                ]
                for statement in statements:
                    compiled = statement.compile(
                        dialect=engine.dialect, compile_kwargs={"literal_binds": True}
                    )
                    plan = await db.scalars(text("EXPLAIN (ANALYZE, BUFFERS) " + str(compiled)))
                    print("\n".join(plan))

        finally:
            await engine.dispose()

    asyncio.run(seed())
    cases: tuple[dict[str, str | int], ...] = (
        {},
        {"q": "library"},
        {"q": "jour"},
        {"author": "Maya", "currency": "USD", "min_price": 1000},
        {"condition": "good", "fulfillment": "warehouse"},
    )
    for case in cases:
        assert api.get("/api/v1/listings", params=case).status_code == 200
    timings = []
    for index in range(75):
        start = time.perf_counter()
        response = api.get("/api/v1/listings", params=cases[index % len(cases)])
        timings.append((time.perf_counter() - start) * 1000)
        assert response.status_code == 200, response.text
    p95 = statistics.quantiles(timings, n=100)[94]
    print(f"50k public search: p95={p95:.1f} ms, samples={len(timings)}")
    assert p95 < 200
