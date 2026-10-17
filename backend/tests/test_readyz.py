import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.db import to_async_url
from app.main import create_app
from app.modules.health import router as health_router


def test_readyz_is_503_without_a_database(client: TestClient) -> None:
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["code"] == "database_unavailable"


def test_readyz_is_503_when_the_database_does_not_answer(monkeypatch: pytest.MonkeyPatch) -> None:
    async def unreachable(*_: object) -> bool:
        return False

    monkeypatch.setattr(health_router, "database_is_ready", unreachable)
    settings = Settings(
        _env_file=None, env="test", database_url="postgresql://u:p@localhost:6543/db"
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/readyz").status_code == 503


def test_readyz_is_200_when_the_database_answers(monkeypatch: pytest.MonkeyPatch) -> None:
    async def reachable(*_: object) -> bool:
        return True

    monkeypatch.setattr(health_router, "database_is_ready", reachable)
    settings = Settings(
        _env_file=None, env="test", database_url="postgresql://u:p@localhost:6543/db"
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


@pytest.mark.db
def test_readyz_against_the_real_database() -> None:
    settings = Settings(env="test", readiness_timeout_seconds=15)
    if settings.database_url is None:
        pytest.skip("BOOKLOOP_DATABASE_URL is not set in backend/.env")
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
