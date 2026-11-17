from collections.abc import Callable
from datetime import timedelta
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from test_listings import seller_listing

from app.integrations.storage.fake import LocalPhotoStorage
from app.modules.listings.service import InvalidPhotoError, clean_image


def image_bytes(kind: str = "JPEG", size: tuple[int, int] = (20, 10)) -> bytes:
    output = BytesIO()
    exif = Image.Exif()
    exif[270] = "private camera metadata"
    Image.new("RGB", size, "red").save(output, format=kind, exif=exif)
    return output.getvalue()


@pytest.mark.parametrize(
    "kind,mime", [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")]
)
def test_photo_reencoding_discards_metadata(kind: str, mime: str) -> None:
    cleaned = clean_image(image_bytes(kind), mime)
    with Image.open(BytesIO(cleaned)) as image:
        assert image.format == "JPEG"
        assert not image.getexif()
        assert image.size == (20, 10)


@pytest.mark.parametrize(
    "data,mime",
    [
        (b"not an image", "image/jpeg"),
        (image_bytes(), "image/png"),
        (b"x" * (5 * 1024 * 1024 + 1), "image/jpeg"),
    ],
)
def test_invalid_photo_bytes_are_rejected(data: bytes, mime: str) -> None:
    with pytest.raises(InvalidPhotoError):
        clean_image(data, mime)


def test_photo_pixel_limit_is_checked_before_decode() -> None:
    with pytest.raises(InvalidPhotoError):
        clean_image(image_bytes(size=(5000, 4001)), "image/jpeg")


@pytest.fixture
def photo_draft(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    tmp_path: Path,
) -> dict[str, object]:
    seller_listing(api, sign_in, execute_sql)
    api.app.state.photo_storage = LocalPhotoStorage(tmp_path)  # type: ignore[attr-defined]
    result: dict[str, object] = api.post("/api/v1/listings", json={"title": "Book"}).json()
    return result


def upload(api: TestClient, listing_id: object, data: bytes) -> dict[str, object]:
    ticket = api.post(
        f"/api/v1/listings/{listing_id}/photos/upload-url",
        json={"contentType": "image/jpeg", "sizeBytes": len(data)},
    )
    assert ticket.status_code == 200
    body: dict[str, object] = ticket.json()
    response = api.put(str(body["uploadUrl"]), content=data, headers={"Content-Type": "image/jpeg"})
    assert response.status_code == 204
    return body


def test_private_upload_completion_and_owner_read(
    api: TestClient, photo_draft: dict[str, object], sign_in: Callable[[str], None]
) -> None:
    listing_id = photo_draft["id"]
    ticket = upload(api, listing_id, image_bytes())
    assert api.get("/api/v1/me/listings").json()["items"][0]["photos"] == []
    result = api.post(
        f"/api/v1/listings/{listing_id}/photos/complete", json={"photoId": ticket["photoId"]}
    )
    assert result.status_code == 200
    photo_url = result.json()["photos"][0]["url"]
    image = api.get(photo_url)
    assert image.status_code == 200
    assert "no-store" in image.headers["cache-control"]
    with Image.open(BytesIO(image.content)) as clean:
        assert not clean.getexif()
    assert (
        api.put(
            str(ticket["uploadUrl"]), content=image_bytes(), headers={"Content-Type": "image/jpeg"}
        ).status_code
        == 404
    )
    sign_in("other@example.com")
    assert api.post("/api/v1/me/roles/seller").status_code == 200
    assert api.get(photo_url).status_code == 404
    assert (
        api.post(
            f"/api/v1/listings/{listing_id}/photos/complete", json={"photoId": ticket["photoId"]}
        ).status_code
        == 404
    )


def test_upload_limit_and_expired_tickets(api: TestClient, photo_draft: dict[str, object]) -> None:
    path = f"/api/v1/listings/{photo_draft['id']}/photos/upload-url"
    for _ in range(6):
        assert (
            api.post(path, json={"contentType": "image/jpeg", "sizeBytes": 10}).status_code == 200
        )
    assert api.post(path, json={"contentType": "image/jpeg", "sizeBytes": 10}).status_code == 409
    api.app.state.clock.advance(timedelta(minutes=6))  # type: ignore[attr-defined]
    assert api.post(path, json={"contentType": "image/jpeg", "sizeBytes": 10}).status_code == 200


def test_invalid_upload_is_not_visible(api: TestClient, photo_draft: dict[str, object]) -> None:
    ticket = upload(api, photo_draft["id"], b"spoofed image")
    result = api.post(
        f"/api/v1/listings/{photo_draft['id']}/photos/complete", json={"photoId": ticket["photoId"]}
    )
    assert result.status_code == 422
    assert api.get("/api/v1/me/listings").json()["items"][0]["photos"] == []


class RejectScanner:
    async def scan(self, data: bytes) -> bool:
        return False


def test_scanner_hook_can_reject_a_photo(api: TestClient, photo_draft: dict[str, object]) -> None:
    api.app.state.image_scanner = RejectScanner()  # type: ignore[attr-defined]
    ticket = upload(api, photo_draft["id"], image_bytes())
    result = api.post(
        f"/api/v1/listings/{photo_draft['id']}/photos/complete", json={"photoId": ticket["photoId"]}
    )
    assert result.status_code == 422
    assert api.get("/api/v1/me/listings").json()["items"][0]["photos"] == []


def test_expired_ticket_cannot_upload_or_complete(
    api: TestClient, photo_draft: dict[str, object]
) -> None:
    ticket = upload(api, photo_draft["id"], image_bytes())
    api.app.state.clock.advance(timedelta(minutes=6))  # type: ignore[attr-defined]
    assert (
        api.put(
            str(ticket["uploadUrl"]), content=image_bytes(), headers={"Content-Type": "image/jpeg"}
        ).status_code
        == 404
    )
    assert (
        api.post(
            f"/api/v1/listings/{photo_draft['id']}/photos/complete",
            json={"photoId": ticket["photoId"]},
        ).status_code
        == 409
    )


def test_local_upload_does_not_overwrite_bytes(
    api: TestClient, photo_draft: dict[str, object]
) -> None:
    ticket = upload(api, photo_draft["id"], image_bytes())
    assert (
        api.put(
            str(ticket["uploadUrl"]), content=image_bytes(), headers={"Content-Type": "image/jpeg"}
        ).status_code
        == 409
    )


def test_production_has_no_local_upload_route() -> None:
    from app.core.config import Settings
    from app.main import create_app

    app = create_app(
        Settings(
            _env_file=None,
            env="production",
            database_url="postgresql://localhost/test",
            database_direct_url="postgresql://localhost/test",
            redis_url="redis://localhost:1/0",
        )
    )
    client = TestClient(app, base_url="https://localhost")
    assert (
        client.put(
            "/api/v1/dev/listing-uploads/01900000-0000-7000-8000-000000000001?token=" + "x" * 43,
            content=b"x",
        ).status_code
        == 404
    )


def test_active_listing_keeps_last_photo_and_purchase_locks_uploads(
    api: TestClient, photo_draft: dict[str, object], execute_sql: Callable[[str], None]
) -> None:
    listing_id = photo_draft["id"]
    ticket = upload(api, listing_id, image_bytes())
    completed = api.post(
        f"/api/v1/listings/{listing_id}/photos/complete", json={"photoId": ticket["photoId"]}
    ).json()
    address = api.get("/api/v1/me/addresses").json()[0]["id"]
    assert (
        api.patch(
            f"/api/v1/listings/{listing_id}",
            json={
                "version": completed["version"],
                "author": "Author",
                "priceMinor": 100,
                "addressId": address,
            },
        ).status_code
        == 200
    )
    assert api.post(f"/api/v1/listings/{listing_id}/publish").status_code == 200
    assert (
        api.delete(f"/api/v1/listings/{listing_id}/photos/{ticket['photoId']}").status_code == 409
    )
    execute_sql(f"UPDATE listings SET status='reserved' WHERE id='{listing_id}'")
    assert (
        api.post(
            f"/api/v1/listings/{listing_id}/photos/upload-url",
            json={"contentType": "image/jpeg", "sizeBytes": 10},
        ).status_code
        == 409
    )


def test_storage_uses_fixed_private_paths_and_no_redirects(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio

    import httpx2

    from app.integrations.storage.real import SupabasePhotoStorage

    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        requests.append(request)
        if "/upload/sign/" in request.url.path:
            return httpx2.Response(
                200, json={"url": "/object/upload/sign/listing-photos/quarantine/id?token=ticket"}
            )
        if "/object/sign/" in request.url.path:
            return httpx2.Response(
                200, json={"signedURL": "/object/sign/listing-photos/clean/id?token=read"}
            )
        return httpx2.Response(200, content=b"bytes")

    original = httpx2.AsyncClient

    def client(**kwargs: object) -> httpx2.AsyncClient:
        assert kwargs.get("follow_redirects") is False
        return original(transport=httpx2.MockTransport(respond), timeout=10, follow_redirects=False)

    monkeypatch.setattr(httpx2, "AsyncClient", client)
    storage = SupabasePhotoStorage("https://project.supabase.co", "test-key", "listing-photos")

    async def run() -> None:
        assert (await storage.upload_url("quarantine/id")).startswith(
            "https://project.supabase.co/storage/v1/object/upload/sign/"
        )
        assert (await storage.read_url("clean/id")).startswith(
            "https://project.supabase.co/storage/v1/object/sign/"
        )
        assert await storage.download("quarantine/id", 5) == b"bytes"
        with pytest.raises(ValueError):
            await storage.download("quarantine/id", 4)

    asyncio.run(run())
    assert all(request.url.host == "project.supabase.co" for request in requests)
    with pytest.raises(ValueError):
        SupabasePhotoStorage("http://127.0.0.1", "test-key", "photos")


def test_upload_tokens_are_redacted_from_access_logs() -> None:
    import logging

    from app.core.logging import UploadTokenFilter

    record = logging.LogRecord(
        "uvicorn.access",
        logging.INFO,
        "",
        1,
        "%s %s %s %s %s",
        ("client", "PUT", "/api/v1/dev/listing-uploads/id?token=private", "1.1", 204),
        None,
    )
    assert UploadTokenFilter().filter(record)
    assert "private" not in record.getMessage()
    assert "listing-uploads/id" in record.getMessage()
