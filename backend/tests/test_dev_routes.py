from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app import main
from app.core.config import Settings
from app.main import create_app
from app.modules.dev.router import router as dev_router

DEV_PATHS = [
    ("post", "/api/v1/dev/session", {"role": "buyer"}),
    ("post", "/api/v1/dev/seed", None),
    ("post", "/api/v1/dev/reset", None),
    ("post", "/api/v1/dev/clock/advance", {"hours": 1}),
]


class _FakeRedis:
    async def aclose(self, close_connection_pool: bool = False) -> None:
        return None


async def _fake_redis_pool(_url: str) -> _FakeRedis:
    return _FakeRedis()


def _production_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(main, "create_redis_pool", _fake_redis_pool)
    settings = Settings(
        _env_file=None,
        env="production",
        database_url="postgresql://u:p@localhost:6543/db",
        database_direct_url="postgresql://u:p@localhost:5432/db",
        redis_url="redis://localhost:6399/0",
    )
    return TestClient(create_app(settings))


def test_switching_role(client: TestClient) -> None:
    response = client.post("/api/v1/dev/session", json={"role": "courier"})
    assert response.status_code == 200
    assert response.json() == {"role": "courier"}


def test_unknown_roles_are_rejected(client: TestClient) -> None:
    response = client.post("/api/v1/dev/session", json={"role": "superuser"})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_seed_and_reset_report_record_counts(client: TestClient) -> None:
    assert client.post("/api/v1/dev/seed").json() == {"seeded": 0}
    assert client.post("/api/v1/dev/reset").json() == {"reset": 0}


def test_advancing_the_clock_moves_backend_time(client: TestClient) -> None:
    clock = client.app.state.clock  # type: ignore[attr-defined]
    before = clock.now()
    response = client.post("/api/v1/dev/clock/advance", json={"hours": 24})
    assert response.status_code == 200
    assert response.json()["advancedHours"] == 24
    assert clock.now() - before >= timedelta(hours=24)


@pytest.mark.parametrize("hours", [0, -1, 24 * 30 + 1])
def test_clock_advance_is_bounded(client: TestClient, hours: int) -> None:
    assert client.post("/api/v1/dev/clock/advance", json={"hours": hours}).status_code == 422


@pytest.mark.parametrize(("method", "path", "body"), DEV_PATHS)
def test_dev_routes_are_unreachable_in_production(
    monkeypatch: pytest.MonkeyPatch, method: str, path: str, body: dict[str, object] | None
) -> None:
    with _production_client(monkeypatch) as client:
        response = client.request(method, path, json=body)
        assert response.status_code == 404
        assert response.json()["code"] == "not_found"


def test_dev_routes_are_absent_from_the_production_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with _production_client(monkeypatch) as client:
        paths = client.app.openapi()["paths"]  # type: ignore[attr-defined]
    assert not any(path.startswith("/api/v1/dev") for path in paths)


def test_dev_guard_refuses_even_if_mounted_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with _production_client(monkeypatch) as client:
        client.app.include_router(dev_router)  # type: ignore[attr-defined]
        response = client.post("/api/v1/dev/seed")
    assert response.status_code == 404


def test_cors_allows_the_frontend_and_exposes_the_request_id(client: TestClient) -> None:
    response = client.get("/healthz", headers={"Origin": "http://localhost:3000"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "x-request-id" in response.headers["access-control-expose-headers"].lower()


def test_cors_rejects_unknown_origins(client: TestClient) -> None:
    response = client.get("/healthz", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers
