from collections.abc import Awaitable, Callable

import pytest
from fastapi.testclient import TestClient

from app import main
from app.core.config import Settings
from app.core.db import to_async_url
from app.main import create_app
from app.modules.health import router as health_router


class _FakeRedis:
    async def aclose(self, close_connection_pool: bool = False) -> None:
        return None


async def _fake_redis_pool(_url: str) -> _FakeRedis:
    return _FakeRedis()


def _settings() -> Settings:
    return Settings(
        _env_file=None,
        env="test",
        database_url="postgresql://u:p@localhost:6543/db",
        redis_url="redis://localhost:6399/0",
    )


def _answer(value: bool) -> Callable[..., Awaitable[bool]]:
    async def check(*_: object) -> bool:
        return value

    return check


@pytest.fixture(autouse=True)
def _no_real_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "create_redis_pool", _fake_redis_pool)


def test_readyz_is_503_without_services(client: TestClient) -> None:
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["code"] == "database_unavailable"


def test_readyz_is_503_when_the_database_does_not_answer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(health_router, "database_is_ready", _answer(False))
    with TestClient(create_app(_settings())) as client:
        assert client.get("/readyz").json()["code"] == "database_unavailable"


def test_readyz_is_503_when_redis_does_not_answer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(health_router, "database_is_ready", _answer(True))
    monkeypatch.setattr(health_router, "redis_is_ready", _answer(False))
    with TestClient(create_app(_settings())) as client:
        response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json()["code"] == "redis_unavailable"


def test_readyz_is_200_when_everything_answers(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(health_router, "database_is_ready", _answer(True))
    monkeypatch.setattr(health_router, "redis_is_ready", _answer(True))
    with TestClient(create_app(_settings())) as client:
        response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok", "redis": "ok"}


@pytest.mark.db
@pytest.mark.redis
def test_readyz_against_the_real_services(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.undo()
    settings = Settings(env="test", readiness_timeout_seconds=15)
    if settings.database_url is None or settings.redis_url is None:
        pytest.skip("BOOKLOOP_DATABASE_URL / BOOKLOOP_REDIS_URL are not set in backend/.env")
    with TestClient(create_app(settings)) as client:
        response = client.get("/readyz")
    assert response.status_code == 200, response.text


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "postgresql://u:p@h:6543/postgres?pgbouncer=true",
            "postgresql+asyncpg://u:p@h:6543/postgres",
        ),
        (
            "postgres://u:p@h:5432/postgres?sslmode=require",
            "postgresql+asyncpg://u:p@h:5432/postgres?ssl=require",
        ),
    ],
)
def test_supabase_urls_are_adapted_for_asyncpg(url: str, expected: str) -> None:
    assert to_async_url(url) == expected


def test_non_postgres_urls_are_rejected() -> None:
    with pytest.raises(ValueError, match="PostgreSQL"):
        to_async_url("mysql://u:p@h/db")
