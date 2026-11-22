import asyncio
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from test_public_listings import published as published

from app.core.db import to_async_url
from app.modules.listings.service import seed_listings


def test_sitemap_projects_public_ids_and_dates_only(api: TestClient, published: str) -> None:
    response = api.get("/api/v1/catalog/sitemap")
    assert response.status_code == 200
    assert "no-store" in response.headers["cache-control"] and "etag" not in response.headers
    assert response.json()["nextCursor"] is None
    entry = response.json()["items"][0]
    assert entry["id"] == published
    assert set(entry) == {"id", "updatedAt"}
    assert "Private street" not in response.text and "sellerId" not in response.text


def test_unavailable_public_details_remain_in_sitemap(
    api: TestClient, published: str, execute_sql: Callable[[str], None]
) -> None:
    for status in ("reserved", "sold"):
        execute_sql(f"UPDATE listings SET status='{status}' WHERE id='{published}'")
        assert api.get("/api/v1/catalog/sitemap").json()["items"][0]["id"] == published


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE users SET status='suspended'",
        "UPDATE seller_verifications SET status='rejected'",
        "UPDATE listings SET status='deactivated'",
    ],
)
def test_sitemap_never_enumerates_hidden_records(
    api: TestClient, published: str, execute_sql: Callable[[str], None], sql: str
) -> None:
    execute_sql(sql)
    assert api.get("/api/v1/catalog/sitemap").json()["items"] == []


def test_sitemap_pagination_is_stable_and_includes_incoming_copies(
    api: TestClient, published: str, database_url: str
) -> None:
    async def seed() -> None:
        engine = create_async_engine(to_async_url(database_url), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as db:
                assert await seed_listings(db) == 500
        finally:
            await engine.dispose()

    asyncio.run(seed())
    cursor: str | None = None
    seen: set[str] = set()
    while True:
        params: dict[str, str | int] = {"limit": 37}
        if cursor:
            params["cursor"] = cursor
        response = api.get("/api/v1/catalog/sitemap", params=params)
        assert response.status_code == 200
        page = response.json()
        ids = [entry["id"] for entry in page["items"]]
        assert ids == sorted(ids, reverse=True)
        assert not seen.intersection(ids)
        seen.update(ids)
        cursor = page["nextCursor"]
        if cursor is None:
            break
    assert len(seen) == 501


@pytest.mark.parametrize("params", [{"cursor": "invalid"}, {"limit": 10001}])
def test_sitemap_cursor_and_limit_are_validated(
    api: TestClient, params: dict[str, str | int]
) -> None:
    assert api.get("/api/v1/catalog/sitemap", params=params).status_code == 422
