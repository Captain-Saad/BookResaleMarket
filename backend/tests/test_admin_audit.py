import asyncio
from collections.abc import Callable, Iterator
from typing import Any
from uuid import uuid4

import pytest
from fastapi.routing import APIRoute, RouteContext, iter_route_contexts
from fastapi.testclient import TestClient
from sqlalchemy.exc import DBAPIError

from app.core.config import SESSION_COOKIE, Settings
from app.core.db import create_engine
from app.core.deps import public
from app.main import create_app
from app.modules.identity.deps import current_auth
from app.modules.identity.models import Role
from scripts.grant_role import grant_role

ADMIN = "admin@example.com"
USER = "reader@example.com"
PASSWORD = "a-good-password"

PUBLIC_ROUTES = {
    ("GET", "/healthz"),
    ("GET", "/readyz"),
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/logout"),
    ("POST", "/api/v1/auth/verify-email"),
    ("POST", "/api/v1/auth/resend-verification"),
    ("POST", "/api/v1/auth/forgot-password"),
    ("POST", "/api/v1/auth/reset-password"),
}


@pytest.fixture
def admin(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> Iterator[Callable[[], None]]:
    sign_in(ADMIN)
    execute_sql(
        "INSERT INTO user_roles (user_id, role) "
        f"SELECT id, 'admin' FROM users WHERE email='{ADMIN}'"
    )

    def become_admin() -> None:
        sign_in(ADMIN)

    yield become_admin


def user_id(scalar: Callable[[str], object], email: str) -> object:
    return scalar(f"SELECT id FROM users WHERE email = '{email}'")


def _routes() -> list[RouteContext]:
    app = create_app(Settings(_env_file=None, env="test"))
    return [
        context
        for context in iter_route_contexts(app.routes)
        if isinstance(context.original_route, APIRoute)
    ]


def _calls(context: RouteContext) -> set[Any]:
    route = context.original_route
    assert isinstance(route, APIRoute)
    found: set[Any] = set()
    pending = list(route.dependant.dependencies)
    while pending:
        dependency = pending.pop()
        found.add(dependency.call)
        pending.extend(dependency.dependencies)
    return found


def _route_id(context: RouteContext) -> str:
    return f"{sorted(context.methods or [])} {context.path}"


def test_the_route_list_is_not_empty() -> None:
    assert len(_routes()) >= 20


@pytest.mark.parametrize("route", _routes(), ids=_route_id)
def test_every_route_declares_who_may_call_it(route: RouteContext) -> None:
    calls = _calls(route)
    assert public in calls or current_auth in calls


def test_the_list_of_public_routes_is_exact() -> None:
    declared = {
        (method, route.path)
        for route in _routes()
        if public in _calls(route)
        for method in route.methods or []
    }
    assert declared == PUBLIC_ROUTES


@pytest.mark.parametrize(
    "route", [route for route in _routes() if public not in _calls(route)], ids=_route_id
)
def test_protected_routes_reject_requests_without_a_session(
    api: TestClient, route: RouteContext
) -> None:
    path = str(route.path).replace("{address_id}", str(uuid4())).replace("{user_id}", str(uuid4()))
    for method in route.methods or []:
        assert api.request(method, path, json={}).status_code == 401


def test_non_admins_cannot_use_admin_routes(
    api: TestClient, sign_in: Callable[[str], None], scalar: Callable[[str], object]
) -> None:
    sign_in(USER)
    target = user_id(scalar, USER)
    for method, path in [
        ("GET", "/api/v1/admin/users"),
        ("POST", f"/api/v1/admin/users/{target}/suspend"),
        ("POST", f"/api/v1/admin/users/{target}/unsuspend"),
    ]:
        response = api.request(method, path)
        assert response.status_code == 403
        assert response.json()["code"] == "forbidden"


def test_suspended_user_is_rejected_on_their_next_request(
    api: TestClient,
    admin: Callable[[], None],
    sign_in: Callable[[str], None],
    scalar: Callable[[str], object],
) -> None:
    sign_in(USER)
    session = api.cookies[SESSION_COOKIE]
    assert api.get("/api/v1/me").status_code == 200
    target = user_id(scalar, USER)

    admin()
    response = api.post(f"/api/v1/admin/users/{target}/suspend")
    assert response.status_code == 200
    assert response.json()["status"] == "suspended"

    api.cookies.clear()
    api.cookies.set(SESSION_COOKIE, session)
    response = api.get("/api/v1/me")
    assert response.status_code == 403
    assert response.json()["code"] == "account_suspended"


def test_suspended_user_cannot_log_in_but_a_wrong_password_reveals_nothing(
    api: TestClient, sign_in: Callable[[str], None], execute_sql: Callable[[str], None]
) -> None:
    sign_in(USER)
    api.cookies.clear()
    execute_sql(f"UPDATE users SET status = 'suspended' WHERE email = '{USER}'")
    right = api.post("/api/v1/auth/login", json={"email": USER, "password": PASSWORD})
    assert right.status_code == 403
    assert right.json()["code"] == "account_suspended"
    assert SESSION_COOKIE not in right.cookies
    wrong = api.post("/api/v1/auth/login", json={"email": USER, "password": "wrong-password"})
    assert wrong.status_code == 401
    assert wrong.json()["code"] == "invalid_credentials"


def test_unsuspended_user_can_log_in_again(
    api: TestClient,
    admin: Callable[[], None],
    sign_in: Callable[[str], None],
    scalar: Callable[[str], object],
) -> None:
    sign_in(USER)
    target = user_id(scalar, USER)
    admin()
    api.post(f"/api/v1/admin/users/{target}/suspend")
    assert api.post(f"/api/v1/admin/users/{target}/unsuspend").json()["status"] == "active"
    api.cookies.clear()
    assert (
        api.post("/api/v1/auth/login", json={"email": USER, "password": PASSWORD}).status_code
        == 200
    )


def test_an_admin_cannot_suspend_themselves(
    api: TestClient, admin: Callable[[], None], scalar: Callable[[str], object]
) -> None:
    response = api.post(f"/api/v1/admin/users/{user_id(scalar, ADMIN)}/suspend")
    assert response.status_code == 409
    assert response.json()["code"] == "cannot_suspend_self"


def test_suspending_an_unknown_user_is_a_404(api: TestClient, admin: Callable[[], None]) -> None:
    assert api.post(f"/api/v1/admin/users/{uuid4()}/suspend").status_code == 404


def test_listing_users_uses_cursor_pagination(
    api: TestClient, admin: Callable[[], None], sign_in: Callable[[str], None]
) -> None:
    for number in range(3):
        sign_in(f"user{number}@example.com")
    admin()
    first = api.get("/api/v1/admin/users", params={"limit": 2}).json()
    assert len(first["items"]) == 2
    assert first["nextCursor"]
    second = api.get(
        "/api/v1/admin/users", params={"limit": 2, "cursor": first["nextCursor"]}
    ).json()
    assert len(second["items"]) == 2
    assert not {item["id"] for item in first["items"]} & {item["id"] for item in second["items"]}
    assert "passwordHash" not in first["items"][0]
    assert api.get("/api/v1/admin/users", params={"limit": 101}).status_code == 422


def test_admin_actions_and_role_changes_are_audited(
    api: TestClient,
    admin: Callable[[], None],
    sign_in: Callable[[str], None],
    scalar: Callable[[str], object],
) -> None:
    sign_in(USER)
    api.post("/api/v1/me/roles/seller")
    target = user_id(scalar, USER)
    assert scalar("SELECT action FROM audit_log") == "role.granted"

    admin()
    api.post(f"/api/v1/admin/users/{target}/suspend")
    api.post(f"/api/v1/admin/users/{target}/unsuspend")
    actor = user_id(scalar, ADMIN)
    assert (
        scalar(
            f"SELECT count(*) FROM audit_log WHERE actor_user_id = '{actor}' "
            f"AND target_id = '{target}' AND action IN ('user.suspended', 'user.unsuspended')"
        )
        == 2
    )


def test_adding_the_same_role_twice_is_audited_once(
    api: TestClient, sign_in: Callable[[str], None], scalar: Callable[[str], object]
) -> None:
    sign_in(USER)
    api.post("/api/v1/me/roles/seller")
    api.post("/api/v1/me/roles/seller")
    assert scalar("SELECT count(*) FROM audit_log") == 1


@pytest.mark.parametrize(
    "sql", ["UPDATE audit_log SET action = 'tampered'", "DELETE FROM audit_log"]
)
def test_the_audit_log_cannot_be_changed(
    api: TestClient,
    sign_in: Callable[[str], None],
    execute_sql: Callable[[str], None],
    scalar: Callable[[str], object],
    sql: str,
) -> None:
    sign_in(USER)
    api.post("/api/v1/me/roles/seller")
    with pytest.raises(DBAPIError, match="append-only"):
        execute_sql(sql)
    assert scalar("SELECT action FROM audit_log") == "role.granted"


def test_a_user_cannot_give_themselves_a_staff_role(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in(USER)
    for path in ("/api/v1/me/roles/admin", "/api/v1/me/roles/warehouse"):
        assert api.post(path).status_code in {404, 405}
    assert api.get("/api/v1/me").json()["roles"] == ["buyer"]


def test_the_script_grants_a_role_and_audits_it(
    api: TestClient,
    database_url: str,
    sign_in: Callable[[str], None],
    scalar: Callable[[str], object],
) -> None:
    sign_in(USER)

    async def run(email: str) -> bool:
        engine = create_engine(database_url)
        try:
            return await grant_role(engine, email, Role.ADMIN)
        finally:
            await engine.dispose()

    assert asyncio.run(run(USER)) is True
    assert asyncio.run(run("nobody@example.com")) is False
    assert "admin" in api.get("/api/v1/me").json()["roles"]
    assert scalar("SELECT count(*) FROM audit_log WHERE actor_user_id IS NULL") == 1


def test_dev_routes_need_an_admin(api: TestClient, sign_in: Callable[[str], None]) -> None:
    sign_in(USER)
    response = api.post("/api/v1/dev/clock/advance", json={"hours": 1})
    assert response.status_code == 403
