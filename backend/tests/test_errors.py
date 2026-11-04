from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import ConflictError, NotFoundError
from app.main import create_app


def _app_with_failing_routes() -> FastAPI:
    app = create_app(Settings(_env_file=None, env="test", log_json=False))

    @app.get("/test/not-found")
    async def not_found() -> None:
        raise NotFoundError("Listing 42 does not exist.", code="listing_not_found")

    @app.get("/test/conflict")
    async def conflict() -> None:
        raise ConflictError("Listing is already reserved.")

    @app.get("/test/crash")
    async def crash() -> None:
        raise RuntimeError("database password is hunter2")

    @app.get("/test/items/{item_id}")
    async def item(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    return app


@pytest.fixture
def failing_client() -> Iterator[TestClient]:
    with TestClient(_app_with_failing_routes(), raise_server_exceptions=False) as client:
        yield client


def _assert_problem(response_headers: dict[str, str], body: dict[str, object], status: int) -> None:
    assert response_headers["content-type"] == "application/problem+json"
    assert body["status"] == status
    assert body["type"] == "about:blank"
    assert body["request_id"] == response_headers["x-request-id"]


def test_app_errors_become_problem_details(failing_client: TestClient) -> None:
    response = failing_client.get("/test/not-found")
    body = response.json()
    _assert_problem(dict(response.headers), body, 404)
    assert body["title"] == "Not Found"
    assert body["code"] == "listing_not_found"
    assert body["detail"] == "Listing 42 does not exist."


def test_default_error_code_is_used(failing_client: TestClient) -> None:
    response = failing_client.get("/test/conflict")
    assert response.status_code == 409
    assert response.json()["code"] == "conflict"


def test_unknown_routes_are_problem_details(failing_client: TestClient) -> None:
    response = failing_client.get("/nope")
    _assert_problem(dict(response.headers), response.json(), 404)
    assert response.json()["code"] == "not_found"


def test_wrong_method_is_problem_details(failing_client: TestClient) -> None:
    response = failing_client.post("/healthz")
    assert response.status_code == 405
    assert response.json()["code"] == "method_not_allowed"


def test_validation_errors_list_fields_without_echoing_input(failing_client: TestClient) -> None:
    response = failing_client.get("/test/items/not-a-number")
    body = response.json()
    _assert_problem(dict(response.headers), body, 422)
    assert body["code"] == "validation_error"
    assert body["errors"][0]["loc"] == ["path", "item_id"]
    assert "input" not in body["errors"][0]


def test_unhandled_errors_hide_internals(failing_client: TestClient) -> None:
    response = failing_client.get("/test/crash")
    body = response.json()
    _assert_problem(dict(response.headers), body, 500)
    assert body["code"] == "internal_error"
    assert "hunter2" not in response.text
    assert response.headers.get_list("x-request-id") == [body["request_id"]]
