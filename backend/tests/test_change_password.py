from collections.abc import Callable

from fastapi.testclient import TestClient

from app.core.config import SESSION_COOKIE

EMAIL = "reader@example.com"
PASSWORD = "a-good-password"
NEW_PASSWORD = "a-new-password"


def change(api: TestClient, current: str = PASSWORD, new: str = NEW_PASSWORD) -> int:
    response = api.post(
        "/api/v1/me/password", json={"currentPassword": current, "newPassword": new}
    )
    return response.status_code


def login(api: TestClient, password: str) -> int:
    return api.post("/api/v1/auth/login", json={"email": EMAIL, "password": password}).status_code


def test_changing_needs_a_session(api: TestClient) -> None:
    assert change(api) == 401


def test_changing_replaces_the_password(api: TestClient, sign_in: Callable[[str], None]) -> None:
    sign_in(EMAIL)
    assert change(api) == 204
    api.cookies.clear()
    assert login(api, PASSWORD) == 401
    assert login(api, NEW_PASSWORD) == 200


def test_a_wrong_current_password_changes_nothing(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in(EMAIL)
    response = api.post(
        "/api/v1/me/password",
        json={"currentPassword": "wrong-password", "newPassword": NEW_PASSWORD},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_current_password"
    api.cookies.clear()
    assert login(api, PASSWORD) == 200
    assert login(api, NEW_PASSWORD) == 401


def test_the_new_password_follows_the_usual_rules(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in(EMAIL)
    assert change(api, new="short") == 422
    assert change(api, new="é" * 37) == 422


def test_other_devices_are_signed_out_and_this_one_stays(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in(EMAIL)
    other_device = api.cookies[SESSION_COOKIE]
    api.cookies.clear()
    assert login(api, PASSWORD) == 200
    this_device = api.cookies[SESSION_COOKIE]

    assert change(api) == 204
    assert api.get("/api/v1/me").status_code == 200

    api.cookies.clear()
    api.cookies.set(SESSION_COOKIE, other_device)
    assert api.get("/api/v1/me").status_code == 401
    api.cookies.set(SESSION_COOKIE, this_device)
    assert api.get("/api/v1/me").status_code == 200


def test_a_password_change_is_audited(
    api: TestClient, sign_in: Callable[[str], None], scalar: Callable[[str], object]
) -> None:
    sign_in(EMAIL)
    change(api)
    assert scalar("SELECT count(*) FROM audit_log WHERE action = 'password.changed'") == 1


def test_guessing_the_current_password_is_rate_limited(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    class _Limiter:
        def __init__(self) -> None:
            self.hits = 0

        async def retry_after(self, key: str, limit: int, window_seconds: int) -> int | None:
            self.hits += 1
            return window_seconds if self.hits > limit else None

    sign_in(EMAIL)
    api.app.state.rate_limiter = _Limiter()  # type: ignore[attr-defined]
    statuses = [change(api, current="wrong-password") for _ in range(11)]
    assert statuses[:10] == [400] * 10
    assert statuses[10] == 429
