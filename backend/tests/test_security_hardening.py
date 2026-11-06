from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.config import SESSION_COOKIE, Settings
from app.main import create_app

PROTECTIVE_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
}


def assert_protected(headers: object) -> None:
    for name, value in PROTECTIVE_HEADERS.items():
        assert headers[name] == value, name  # type: ignore[index]


def test_success_responses_carry_security_headers(client: TestClient) -> None:
    assert_protected(client.get("/healthz").headers)


def test_error_responses_carry_security_headers(client: TestClient) -> None:
    assert_protected(client.get("/not-a-route").headers)


def test_origin_rejections_carry_security_headers(client: TestClient) -> None:
    response = client.post("/api/v1/auth/logout", headers={"Origin": "https://evil.example"})
    assert response.status_code == 403
    assert_protected(response.headers)


def test_account_responses_are_never_cached(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    assert api.get("/api/v1/me").headers["cache-control"] == "no-store"


def test_docs_still_load_their_assets(client: TestClient) -> None:
    response = client.get("/docs")
    assert response.status_code == 200
    assert "content-security-policy" not in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"


def test_hsts_is_off_outside_production(client: TestClient) -> None:
    assert "strict-transport-security" not in client.get("/healthz").headers


@pytest.fixture
def production_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    from app import main

    class _FakeRedis:
        async def aclose(self, close_connection_pool: bool = False) -> None:
            return None

    async def fake_pool(_url: str) -> _FakeRedis:
        return _FakeRedis()

    monkeypatch.setattr(main, "create_redis_pool", fake_pool)
    settings = Settings(
        _env_file=None,
        env="production",
        database_url="postgresql://u:p@localhost:6543/db",
        database_direct_url="postgresql://u:p@localhost:5432/db",
        redis_url="redis://localhost:6399/0",
        allowed_hosts=["api.bookloop.example"],
    )
    with TestClient(create_app(settings), base_url="https://api.bookloop.example") as test_client:
        yield test_client


def test_hsts_is_on_in_production(production_client: TestClient) -> None:
    assert (
        "max-age=31536000" in production_client.get("/healthz").headers["strict-transport-security"]
    )


def test_production_rejects_hosts_outside_the_list(production_client: TestClient) -> None:
    response = production_client.get("/healthz", headers={"Host": "localhost"})
    assert response.status_code == 400


@pytest.mark.parametrize(
    "host",
    ["evil.example", "localhost.evil.example", "evil.example:8000", "localhost@evil.example"],
)
def test_unknown_hosts_are_rejected(client: TestClient, host: str) -> None:
    assert client.get("/healthz", headers={"Host": host}).status_code == 400


@pytest.mark.parametrize("host", ["localhost", "localhost:8000", "127.0.0.1:8000"])
def test_local_hosts_are_allowed(client: TestClient, host: str) -> None:
    assert client.get("/healthz", headers={"Host": host}).status_code == 200


def test_a_declared_oversized_body_is_rejected_unread(client: TestClient) -> None:
    max_bytes = client.app.state.settings.max_request_bytes  # type: ignore[attr-defined]
    response = client.post(
        "/api/v1/auth/login",
        content=b"x" * (max_bytes + 1),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "payload_too_large"
    assert_protected(response.headers)


def test_an_oversized_body_without_a_length_is_rejected(api: TestClient) -> None:
    max_bytes = api.app.state.settings.max_request_bytes  # type: ignore[attr-defined]

    def chunks() -> Iterator[bytes]:
        for _ in range(3):
            yield b"x" * max_bytes

    response = api.post(
        "/api/v1/auth/login", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413
    assert response.json()["code"] == "payload_too_large"


def test_a_normal_body_is_not_limited(api: TestClient) -> None:
    response = api.post(
        "/api/v1/auth/login", content=b"{}", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "cookie",
    ["<script>alert(1)</script>", "' OR 1=1;--", "../../etc/passwd", "x" * 4000, "%00%0d%0a"],
)
def test_dangerous_cookie_values_are_only_ever_a_failed_login(api: TestClient, cookie: str) -> None:
    response = api.get("/api/v1/me", headers={"Cookie": f"{SESSION_COOKIE}={cookie}"})
    assert response.status_code == 401
    assert cookie not in response.text


def test_the_session_cookie_is_not_echoed_in_responses(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    token = api.cookies[SESSION_COOKIE]
    response = api.get("/api/v1/me")
    assert token not in response.text
    assert "set-cookie" not in response.headers


def test_the_database_rejects_an_uppercase_email(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    with pytest.raises(IntegrityError, match="ck_users_email_lowercase"):
        execute_sql("UPDATE users SET email = 'READER@example.com'")


def test_the_database_rejects_a_bad_country(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    api.post(
        "/api/v1/me/addresses",
        json={
            "recipientName": "Ada",
            "line1": "1 Main St",
            "city": "Lahore",
            "region": "Punjab",
            "postalCode": "54000",
            "country": "PK",
        },
    )
    with pytest.raises(IntegrityError, match="ck_addresses_country_format"):
        execute_sql("UPDATE addresses SET country = 'pk'")
