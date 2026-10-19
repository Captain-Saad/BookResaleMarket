import uuid

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from structlog.contextvars import merge_contextvars
from structlog.testing import capture_logs

from app import main
from app.core.config import Settings
from app.main import create_app


def test_healthz_returns_ok(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_every_response_gets_a_request_id(client: TestClient) -> None:
    response = client.get("/healthz")
    assert uuid.UUID(response.headers["X-Request-ID"])


def test_unknown_routes_also_get_a_request_id(client: TestClient) -> None:
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert "X-Request-ID" in response.headers


def test_a_safe_incoming_request_id_is_kept(client: TestClient) -> None:
    response = client.get("/healthz", headers={"X-Request-ID": "trace-abc_123.4"})
    assert response.headers["X-Request-ID"] == "trace-abc_123.4"


@pytest.mark.parametrize(
    "unsafe_id",
    ["has spaces", "x" * 65, "semi;colon", "<script>"],
)
def test_an_unsafe_incoming_request_id_is_replaced(client: TestClient, unsafe_id: str) -> None:
    response = client.get("/healthz", headers={"X-Request-ID": unsafe_id})
    assert response.headers["X-Request-ID"] != unsafe_id
    assert uuid.UUID(response.headers["X-Request-ID"])


def test_access_log_includes_the_request_id(client: TestClient) -> None:
    with capture_logs(processors=[merge_contextvars]) as logs:
        response = client.get("/healthz")
    access = next(log for log in logs if log["event"] == "request completed")
    assert access["request_id"] == response.headers["X-Request-ID"]
    assert access["status"] == 200
    assert access["path"] == "/healthz"


def test_docs_are_hidden_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "create_redis_pool", _fake_redis_pool)
    settings = Settings(
        _env_file=None,
        env="production",
        database_url="postgresql://user:secret@localhost:6543/db",
        database_direct_url="postgresql://user:secret@localhost:5432/db",
        redis_url="redis://localhost:6399/0",
    )
    with TestClient(create_app(settings)) as production_client:
        assert production_client.get("/docs").status_code == 404
        assert production_client.get("/healthz").status_code == 200


def test_settings_read_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOOKLOOP_ENV", "production")
    monkeypatch.setenv("BOOKLOOP_LOG_LEVEL", "WARNING")
    monkeypatch.setenv("BOOKLOOP_DATABASE_URL", "postgresql://u:p@h:6543/db")
    monkeypatch.setenv("BOOKLOOP_DATABASE_DIRECT_URL", "postgresql://u:p@h:5432/db")
    monkeypatch.setenv("BOOKLOOP_REDIS_URL", "redis://h:6379/0")
    settings = Settings(_env_file=None)
    assert settings.is_production
    assert settings.log_level == "WARNING"


def test_settings_fail_fast_without_services_outside_tests() -> None:
    with pytest.raises(ValidationError, match=r"BOOKLOOP_DATABASE_URL.*BOOKLOOP_REDIS_URL"):
        Settings(_env_file=None, env="development")


def test_database_urls_are_secret() -> None:
    settings = Settings(
        _env_file=None,
        env="test",
        database_url="postgresql://user:hunter2@host:6543/db",
    )
    assert "hunter2" not in repr(settings)
    assert settings.database_url is not None
    assert "hunter2" in settings.database_url.get_secret_value()


class _FakeRedis:
    async def aclose(self, close_connection_pool: bool = False) -> None:
        return None


async def _fake_redis_pool(_url: str) -> _FakeRedis:
    return _FakeRedis()
