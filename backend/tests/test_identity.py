import asyncio
from collections.abc import Callable
from contextlib import AbstractContextManager
from datetime import timedelta

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from alembic import command
from app.core.config import SESSION_COOKIE, Settings
from app.core.db import to_async_url
from app.core.security import hash_token

EMAIL = "reader@example.com"
PASSWORD = "a-good-password"


def register(api: TestClient, email: str = EMAIL, password: str = PASSWORD) -> None:
    response = api.post(
        "/api/v1/auth/register",
        json={"displayName": "Ada Reader", "email": email, "password": password},
    )
    assert response.status_code == 202


def login(api: TestClient, email: str = EMAIL, password: str = PASSWORD) -> str:
    response = api.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.cookies[SESSION_COOKIE]


def scalar(url: str, sql: str, **params: object) -> object:
    async def run() -> object:
        engine = create_async_engine(to_async_url(url), poolclass=NullPool)
        async with engine.connect() as connection:
            value = await connection.scalar(text(sql), params)
        await engine.dispose()
        return value

    return asyncio.run(run())


def test_register_then_login_returns_the_account(api: TestClient) -> None:
    register(api)
    response = api.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert response.status_code == 200
    assert response.json() == {
        "email": EMAIL,
        "emailVerified": False,
        "displayName": "Ada Reader",
        "phone": None,
        "status": "active",
        "roles": ["buyer"],
        "sellerVerification": "not_started",
    }


def test_email_is_case_insensitive(api: TestClient) -> None:
    register(api, email="Reader@Example.com")
    login(api, email="READER@example.com")


def test_registering_an_existing_email_looks_the_same_and_changes_nothing(
    api: TestClient,
) -> None:
    register(api)
    register(api, password="another-password")
    login(api)
    response = api.post("/api/v1/auth/login", json={"email": EMAIL, "password": "another-password"})
    assert response.status_code == 401


def test_passwords_are_stored_hashed(api: TestClient, database_url: str) -> None:
    register(api)
    stored = scalar(database_url, "SELECT password_hash FROM users")
    assert isinstance(stored, str)
    assert PASSWORD not in stored
    assert stored.startswith("$2b$")


@pytest.mark.parametrize(
    ("password", "reason"),
    [("short", "too short"), ("é" * 37, "74 bytes, though only 37 characters")],
)
def test_register_rejects_bad_passwords(api: TestClient, password: str, reason: str) -> None:
    response = api.post(
        "/api/v1/auth/register",
        json={"displayName": "Ada", "email": EMAIL, "password": password},
    )
    assert response.status_code == 422, reason


def test_a_72_byte_password_works(api: TestClient) -> None:
    password = "a" * 72
    register(api, password=password)
    login(api, password=password)


def test_login_failures_look_identical(api: TestClient) -> None:
    register(api)
    wrong = api.post("/api/v1/auth/login", json={"email": EMAIL, "password": "wrong-password"})
    unknown = api.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["code"] == unknown.json()["code"] == "invalid_credentials"
    assert SESSION_COOKIE not in wrong.cookies
    assert SESSION_COOKIE not in unknown.cookies


def test_login_with_an_overlong_password_is_a_normal_failure(api: TestClient) -> None:
    register(api)
    response = api.post("/api/v1/auth/login", json={"email": EMAIL, "password": "a" * 100})
    assert response.status_code == 401


def test_session_cookie_is_protected(api: TestClient) -> None:
    register(api)
    response = api.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/" in cookie


@pytest.mark.parametrize(
    ("env", "secure"), [("development", False), ("test", False), ("production", True)]
)
def test_cookie_is_secure_outside_local_development(env: str, secure: bool) -> None:
    settings = Settings(
        _env_file=None,
        env=env,
        database_url="postgresql://u:p@h/d",
        database_direct_url="postgresql://u:p@h/d",
        redis_url="redis://h",
    )
    assert settings.session_cookie_secure is secure


def test_only_a_hash_of_the_session_token_is_stored(api: TestClient, database_url: str) -> None:
    register(api)
    token = login(api)
    assert scalar(database_url, "SELECT token_hash FROM auth_sessions") == hash_token(token)


def test_me_needs_a_session(api: TestClient) -> None:
    response = api.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_me_rejects_an_unknown_or_tampered_cookie(api: TestClient) -> None:
    register(api)
    token = login(api)
    api.cookies.clear()
    for bad in ("nonsense", token[:-1] + ("a" if token[-1] != "a" else "b")):
        api.cookies.set(SESSION_COOKIE, bad)
        assert api.get("/api/v1/me").status_code == 401


def test_me_returns_and_updates_the_profile(api: TestClient) -> None:
    register(api)
    login(api)
    assert api.get("/api/v1/me").json()["displayName"] == "Ada Reader"
    response = api.patch("/api/v1/me", json={"displayName": " Ada L ", "phone": "+923001234567"})
    assert response.status_code == 200
    assert response.json()["displayName"] == "Ada L"
    assert api.get("/api/v1/me").json()["phone"] == "+923001234567"
    assert api.patch("/api/v1/me", json={"displayName": "Ada", "phone": ""}).json()["phone"] is None


def test_patch_me_cannot_change_roles_or_status(api: TestClient) -> None:
    register(api)
    login(api)
    response = api.patch(
        "/api/v1/me",
        json={"displayName": "Ada", "roles": ["admin"], "status": "suspended", "email": "x@y.z"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["roles"] == ["buyer"]
    assert body["status"] == "active"
    assert body["email"] == EMAIL


def test_logout_revokes_the_session_on_the_server(api: TestClient) -> None:
    register(api)
    token = login(api)
    assert api.post("/api/v1/auth/logout").status_code == 204
    api.cookies.set(SESSION_COOKIE, token)
    assert api.get("/api/v1/me").status_code == 401


def test_logout_without_a_session_is_fine(api: TestClient) -> None:
    assert api.post("/api/v1/auth/logout").status_code == 204


def test_each_login_gets_its_own_session(api: TestClient) -> None:
    register(api)
    first = login(api)
    second = login(api)
    assert first != second
    api.post("/api/v1/auth/logout")
    api.cookies.set(SESSION_COOKIE, first)
    assert api.get("/api/v1/me").status_code == 200


def test_session_expires_after_being_idle(api: TestClient) -> None:
    register(api)
    login(api)
    settings = api.app.state.settings  # type: ignore[attr-defined]
    api.app.state.clock.advance(  # type: ignore[attr-defined]
        timedelta(minutes=settings.session_idle_minutes + 1)
    )
    assert api.get("/api/v1/me").status_code == 401


def test_activity_extends_the_idle_limit_but_not_the_absolute_limit(api: TestClient) -> None:
    register(api)
    login(api)
    state = api.app.state  # type: ignore[attr-defined]
    step = timedelta(minutes=state.settings.session_idle_minutes - 1)
    absolute = timedelta(days=state.settings.session_absolute_days)
    elapsed = timedelta(0)
    while elapsed + step < absolute:
        state.clock.advance(step)
        elapsed += step
        assert api.get("/api/v1/me").status_code == 200
    state.clock.advance(step)
    assert api.get("/api/v1/me").status_code == 401


def test_requests_from_other_sites_are_rejected(api: TestClient) -> None:
    register(api)
    login(api)
    response = api.patch(
        "/api/v1/me", json={"displayName": "Mallory"}, headers={"Origin": "https://evil.example"}
    )
    assert response.status_code == 403
    assert response.json()["code"] == "origin_not_allowed"
    assert api.get("/api/v1/me").json()["displayName"] == "Ada Reader"


def test_requests_from_the_frontend_are_allowed(api: TestClient) -> None:
    register(api)
    login(api)
    response = api.patch(
        "/api/v1/me", json={"displayName": "Ada"}, headers={"Origin": "http://localhost:3000"}
    )
    assert response.status_code == 200


def test_credentials_are_allowed_only_for_the_frontend(api: TestClient) -> None:
    allowed = api.get("/healthz", headers={"Origin": "http://localhost:3000"})
    assert allowed.headers["access-control-allow-credentials"] == "true"
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    other = api.get("/healthz", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


def test_every_table_has_row_level_security(api: TestClient, database_url: str) -> None:
    unprotected = scalar(
        database_url,
        "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity",
    )
    assert unprotected == 0


def execute(url: str, sql: str) -> None:
    async def run() -> None:
        engine = create_async_engine(to_async_url(url), poolclass=NullPool)
        try:
            async with engine.begin() as connection:
                await connection.execute(text(sql))
        finally:
            await engine.dispose()

    asyncio.run(run())


def test_the_database_rejects_an_invalid_role(api: TestClient, database_url: str) -> None:
    register(api)
    user_id = scalar(database_url, "SELECT id FROM users")
    with pytest.raises(IntegrityError, match="ck_user_roles_role"):
        execute(database_url, f"INSERT INTO user_roles (user_id, role) VALUES ('{user_id}', 'god')")


def test_the_database_rejects_an_invalid_status(api: TestClient, database_url: str) -> None:
    register(api)
    with pytest.raises(IntegrityError, match="ck_users_status"):
        execute(database_url, "UPDATE users SET status = 'banned'")


def test_migrations_match_the_models_and_can_be_reversed(
    database_url: str, migrations: Callable[[str], AbstractContextManager[Config]]
) -> None:
    with migrations(database_url) as config:
        command.check(config)
        command.downgrade(config, "base")
        assert scalar(database_url, "SELECT count(*) FROM pg_tables WHERE tablename = 'users'") == 0
        command.upgrade(config, "head")
        command.check(config)
