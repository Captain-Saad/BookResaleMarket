import asyncio
import re
from collections.abc import Callable
from datetime import timedelta

import pytest
from arq import create_pool
from arq.connections import RedisSettings
from fastapi.testclient import TestClient

from app.core.config import SESSION_COOKIE
from app.core.rate_limit import RedisRateLimiter
from app.integrations.email.base import EmailMessage
from app.integrations.email.fake import FakeNotifier
from app.integrations.email.smtp import SmtpNotifier

EMAIL = "reader@example.com"
PASSWORD = "a-good-password"


def outbox(api: TestClient) -> list[EmailMessage]:
    notifier = api.app.state.notifier  # type: ignore[attr-defined]
    assert isinstance(notifier, FakeNotifier)
    return notifier.outbox


def register(api: TestClient, email: str = EMAIL) -> None:
    response = api.post(
        "/api/v1/auth/register",
        json={"displayName": "Ada", "email": email, "password": PASSWORD},
    )
    assert response.status_code == 202


def token_from(message: EmailMessage) -> str:
    match = re.search(r"token=([\w-]+)", message.body)
    assert match
    return match.group(1)


def login(api: TestClient, password: str = PASSWORD) -> int:
    return api.post("/api/v1/auth/login", json={"email": EMAIL, "password": password}).status_code


def test_registering_sends_a_verification_link(api: TestClient) -> None:
    register(api)
    message = outbox(api)[-1]
    assert message.to == EMAIL
    assert "http://localhost:3000/verify-email?token=" in message.body


def test_verifying_marks_the_email_and_works_only_once(api: TestClient) -> None:
    register(api)
    token = token_from(outbox(api)[-1])
    assert api.post("/api/v1/auth/verify-email", json={"token": token}).status_code == 204
    login(api)
    assert api.get("/api/v1/me").json()["emailVerified"] is True
    again = api.post("/api/v1/auth/verify-email", json={"token": token})
    assert again.status_code == 400
    assert again.json()["code"] == "invalid_token"


def test_verification_link_expires(api: TestClient) -> None:
    register(api)
    token = token_from(outbox(api)[-1])
    api.app.state.clock.advance(timedelta(hours=25))  # type: ignore[attr-defined]
    assert api.post("/api/v1/auth/verify-email", json={"token": token}).status_code == 400


def test_a_made_up_token_is_rejected(api: TestClient) -> None:
    assert api.post("/api/v1/auth/verify-email", json={"token": "nonsense"}).status_code == 400
    response = api.post(
        "/api/v1/auth/reset-password", json={"token": "nonsense", "password": PASSWORD}
    )
    assert response.status_code == 400


def test_registering_an_existing_email_sends_a_notice_not_a_link(api: TestClient) -> None:
    register(api)
    before = len(outbox(api))
    register(api)
    assert len(outbox(api)) == before + 1
    message = outbox(api)[-1]
    assert message.to == EMAIL
    assert "token=" not in message.body


def test_resend_replaces_the_old_verification_link(api: TestClient) -> None:
    register(api)
    old = token_from(outbox(api)[-1])
    assert api.post("/api/v1/auth/resend-verification", json={"email": EMAIL}).status_code == 202
    new = token_from(outbox(api)[-1])
    assert api.post("/api/v1/auth/verify-email", json={"token": old}).status_code == 400
    assert api.post("/api/v1/auth/verify-email", json={"token": new}).status_code == 204


def test_resend_says_nothing_about_unknown_or_verified_emails(api: TestClient) -> None:
    register(api)
    token = token_from(outbox(api)[-1])
    api.post("/api/v1/auth/verify-email", json={"token": token})
    before = len(outbox(api))
    verified = api.post("/api/v1/auth/resend-verification", json={"email": EMAIL})
    unknown = api.post("/api/v1/auth/resend-verification", json={"email": "no@example.com"})
    assert verified.status_code == unknown.status_code == 202
    assert len(outbox(api)) == before


def test_forgot_password_looks_the_same_for_any_email(api: TestClient) -> None:
    register(api)
    before = len(outbox(api))
    known = api.post("/api/v1/auth/forgot-password", json={"email": EMAIL})
    unknown = api.post("/api/v1/auth/forgot-password", json={"email": "no@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.content == unknown.content
    assert len(outbox(api)) == before + 1


def reset_token(api: TestClient) -> str:
    api.post("/api/v1/auth/forgot-password", json={"email": EMAIL})
    return token_from(outbox(api)[-1])


def test_resetting_changes_the_password(api: TestClient) -> None:
    register(api)
    token = reset_token(api)
    response = api.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "a-new-password"}
    )
    assert response.status_code == 204
    assert login(api) == 401
    assert login(api, "a-new-password") == 200


def test_resetting_signs_out_every_session(api: TestClient) -> None:
    register(api)
    assert login(api) == 200
    session = api.cookies[SESSION_COOKIE]
    token = reset_token(api)
    api.post("/api/v1/auth/reset-password", json={"token": token, "password": "a-new-password"})
    api.cookies.set(SESSION_COOKIE, session)
    assert api.get("/api/v1/me").status_code == 401


def test_reset_link_works_once_and_expires(api: TestClient) -> None:
    register(api)
    token = reset_token(api)
    body = {"token": token, "password": "a-new-password"}
    assert api.post("/api/v1/auth/reset-password", json=body).status_code == 204
    assert api.post("/api/v1/auth/reset-password", json=body).status_code == 400

    expiring = reset_token(api)
    api.app.state.clock.advance(timedelta(hours=2))  # type: ignore[attr-defined]
    response = api.post(
        "/api/v1/auth/reset-password", json={"token": expiring, "password": "another-password"}
    )
    assert response.status_code == 400


def test_reset_rejects_a_weak_password_without_using_the_link(api: TestClient) -> None:
    register(api)
    token = reset_token(api)
    weak = api.post("/api/v1/auth/reset-password", json={"token": token, "password": "short"})
    assert weak.status_code == 422
    good = api.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "a-new-password"}
    )
    assert good.status_code == 204


def test_a_verification_token_cannot_reset_a_password(api: TestClient) -> None:
    register(api)
    token = token_from(outbox(api)[-1])
    response = api.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "a-new-password"}
    )
    assert response.status_code == 400
    assert login(api) == 200


def test_only_a_hash_of_the_email_token_is_stored(
    api: TestClient, scalar: Callable[[str], object]
) -> None:
    register(api)
    token = token_from(outbox(api)[-1])
    assert scalar("SELECT token_hash FROM email_tokens") != token


class _InMemoryLimiter:
    def __init__(self) -> None:
        self.hits: dict[str, int] = {}

    async def retry_after(self, key: str, limit: int, window_seconds: int) -> int | None:
        self.hits[key] = self.hits.get(key, 0) + 1
        return window_seconds if self.hits[key] > limit else None


def test_login_is_rate_limited_with_retry_after(api: TestClient) -> None:
    api.app.state.rate_limiter = _InMemoryLimiter()  # type: ignore[attr-defined]
    body = {"email": EMAIL, "password": "wrong-password"}
    statuses = [api.post("/api/v1/auth/login", json=body).status_code for _ in range(11)]
    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429
    limited = api.post("/api/v1/auth/login", json=body)
    assert limited.json()["code"] == "rate_limited"
    assert int(limited.headers["retry-after"]) > 0


def test_login_limit_also_applies_per_email(api: TestClient) -> None:
    limiter = _InMemoryLimiter()
    api.app.state.rate_limiter = limiter  # type: ignore[attr-defined]
    api.post("/api/v1/auth/login", json={"email": EMAIL, "password": "wrong-password"})
    assert f"login-email:{EMAIL}" in limiter.hits


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/auth/register",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/resend-verification",
        "/api/v1/auth/verify-email",
        "/api/v1/auth/reset-password",
    ],
)
def test_other_auth_routes_are_rate_limited(api: TestClient, path: str) -> None:
    api.app.state.rate_limiter = _InMemoryLimiter()  # type: ignore[attr-defined]
    last = 0
    for _ in range(31):
        last = api.post(path, json={}).status_code
    assert last == 429


@pytest.mark.redis
def test_redis_limiter_allows_then_blocks() -> None:
    async def run() -> list[int | None]:
        redis = await create_pool(RedisSettings(port=6380))
        limiter = RedisRateLimiter(redis)
        key = f"test:{PASSWORD}:{id(redis)}"
        results = [await limiter.retry_after(key, 2, 60) for _ in range(3)]
        await redis.delete(f"rate:{key}")
        await redis.aclose(close_connection_pool=True)
        return results

    first, second, third = asyncio.run(run())
    assert first is None
    assert second is None
    assert third is not None
    assert third > 0


def test_limiter_allows_requests_when_redis_is_down() -> None:
    class _Broken:
        def pipeline(self, transaction: bool) -> object:
            raise ConnectionError

    async def run() -> int | None:
        limiter = RedisRateLimiter(_Broken())  # type: ignore[arg-type]
        return await limiter.retry_after("key", 1, 60)

    assert asyncio.run(run()) is None


def test_a_mail_outage_does_not_raise() -> None:
    notifier = SmtpNotifier("localhost", 1, "from@example.com")
    asyncio.run(notifier.send(EmailMessage(to="a@b.c", subject="s", body="b")))
