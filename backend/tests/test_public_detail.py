from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from test_listings import seller_listing

from app.integrations.storage.fake import LocalPhotoStorage
from app.modules.listings.service import demo_photo


class PublicPhotoStorage(LocalPhotoStorage):
    async def read_url(self, path: str) -> None:
        raise AssertionError(
            "Public reads must not disclose private object paths or signed capabilities"
        )


def test_public_photos_require_visible_listing_and_validated_photo(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    tmp_path: Path,
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    id_ = str(listing["id"])
    assert api.post(f"/api/v1/listings/{id_}/publish").status_code == 200
    api.app.state.photo_storage = PublicPhotoStorage(tmp_path)  # type: ignore[attr-defined]
    photo = tmp_path / "test/photo.jpg"
    photo.parent.mkdir()
    data = demo_photo(0)
    photo.write_bytes(data)
    api.cookies.clear()
    detail = api.get(f"/api/v1/listings/{id_}").json()
    url = detail["photos"][0]["url"]
    response = api.get(url)
    assert response.status_code == 200 and response.content == data
    assert response.headers["content-type"] == "image/jpeg"
    assert "no-store" in response.headers["cache-control"]
    execute_sql(
        "INSERT INTO listing_photos(id,listing_id,path,content_type,size_bytes,position,validated) "
        f"VALUES ('01900000-0000-7000-8000-000000000002','{id_}',"
        "'private/raw.jpg','image/jpeg',100,1,false)"
    )
    assert len(api.get(f"/api/v1/listings/{id_}").json()["photos"]) == 1
    assert (
        api.get(
            f"/api/v1/listings/{id_}/public-photos/01900000-0000-7000-8000-000000000002"
        ).status_code
        == 404
    )
    execute_sql(f"UPDATE listings SET status='deactivated' WHERE id='{id_}'")
    assert api.get(url).status_code == 404


def test_private_draft_is_not_discoverable(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    api.cookies.clear()
    assert api.get("/api/v1/listings").json()["items"] == []
    assert api.get(f"/api/v1/listings/{listing['id']}").status_code == 404


def test_public_listing_requires_address_owned_by_its_seller(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    listing = seller_listing(api, sign_in, execute_sql)
    id_ = str(listing["id"])
    assert api.post(f"/api/v1/listings/{id_}/publish").status_code == 200
    sign_in("other-reader@example.com")
    address = api.post(
        "/api/v1/me/addresses",
        json={
            "recipientName": "Other reader",
            "line1": "Another private street",
            "city": "Paris",
            "region": "Ile-de-France",
            "postalCode": "75001",
            "country": "FR",
        },
    ).json()
    execute_sql(f"UPDATE listings SET address_id='{address['id']}' WHERE id='{id_}'")
    api.cookies.clear()
    assert api.get("/api/v1/listings").json()["items"] == []
    assert api.get(f"/api/v1/listings/{id_}").status_code == 404


def test_reservation_helper_changes_only_active_stock(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    database_url: str,
) -> None:
    import asyncio
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.clock import SystemClock
    from app.core.db import to_async_url
    from app.modules.listings.service import simulate_reservation

    listing = seller_listing(api, sign_in, execute_sql)
    id_ = UUID(str(listing["id"]))
    assert api.post(f"/api/v1/listings/{id_}/publish").status_code == 200

    async def reserve() -> None:
        engine = create_async_engine(to_async_url(database_url), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as db:
                assert await simulate_reservation(db, SystemClock(), id_) is True
                assert await simulate_reservation(db, SystemClock(), id_) is False
        finally:
            await engine.dispose()

    asyncio.run(reserve())
    api.cookies.clear()
    assert api.get("/api/v1/listings").json()["items"] == []
    assert api.get(f"/api/v1/listings/{id_}").json()["available"] is False


def test_dev_clis_refuse_production(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio
    from uuid import UUID

    from app.core.config import Settings
    from scripts import reserve_listing, seed_listings

    settings = Settings(
        _env_file=None,
        env="production",
        database_url="postgresql://u:p@localhost/db",
        database_direct_url="postgresql://u:p@localhost/db",
        redis_url="redis://localhost:1/0",
    )
    monkeypatch.setattr(reserve_listing, "get_settings", lambda: settings)
    monkeypatch.setattr(seed_listings, "get_settings", lambda: settings)
    with pytest.raises(SystemExit, match="disabled in production"):
        asyncio.run(reserve_listing.main(UUID("01900000-0000-7000-8000-000000000001")))
    with pytest.raises(SystemExit, match="disabled in production"):
        asyncio.run(seed_listings.main(500))
