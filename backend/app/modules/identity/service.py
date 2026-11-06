"""Business rules for accounts and sessions."""

import asyncio
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.config import Settings
from app.core.errors import UnauthorizedError
from app.core.security import (
    dummy_password_hash,
    hash_password,
    hash_token,
    new_token,
    verify_password,
)
from app.modules.identity import repository
from app.modules.identity.models import AuthSession, User
from app.modules.identity.schemas import AccountResponse, AccountUpdateRequest

LAST_SEEN_RESOLUTION = timedelta(minutes=1)


@dataclass(frozen=True)
class Authenticated:
    user: User
    session: AuthSession


async def register(
    db: AsyncSession, settings: Settings, *, email: str, password: str, display_name: str
) -> None:
    password_hash = await asyncio.to_thread(hash_password, password, settings.bcrypt_rounds)
    if await repository.get_user_by_email(db, email) is not None:
        return
    try:
        await repository.add_user(
            db, email=email, password_hash=password_hash, display_name=display_name
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()


async def _password_matches(user: User | None, password: str, settings: Settings) -> bool:
    stored = user.password_hash if user else dummy_password_hash(settings.bcrypt_rounds)
    matches = await asyncio.to_thread(verify_password, password, stored)
    return matches and user is not None


async def login(
    db: AsyncSession, settings: Settings, clock: Clock, *, email: str, password: str
) -> tuple[User, str]:
    user = await repository.get_user_by_email(db, email)
    if user is None or not await _password_matches(user, password, settings):
        if user is None:
            await _password_matches(None, password, settings)
        raise UnauthorizedError(code="invalid_credentials")
    token = new_token()
    now = clock.now()
    await repository.add_session(
        db,
        user_id=user.id,
        token_hash=hash_token(token),
        now=now,
        expires_at=now + timedelta(days=settings.session_absolute_days),
    )
    await db.commit()
    return user, token


async def logout(db: AsyncSession, clock: Clock, token: str | None) -> None:
    if token is None:
        return
    await repository.revoke_session(db, hash_token(token), clock.now())
    await db.commit()


async def authenticate(
    db: AsyncSession, settings: Settings, clock: Clock, token: str | None
) -> Authenticated:
    found = await repository.get_session_and_user(db, hash_token(token)) if token else None
    if found is None:
        raise UnauthorizedError()
    session, user = found
    now = clock.now()
    idle_limit = session.last_seen_at + timedelta(minutes=settings.session_idle_minutes)
    if session.revoked_at is not None or now >= session.expires_at or now >= idle_limit:
        raise UnauthorizedError()
    if now - session.last_seen_at >= LAST_SEEN_RESOLUTION:
        session.last_seen_at = now
        await db.commit()
    return Authenticated(user=user, session=session)


async def account(db: AsyncSession, user: User) -> AccountResponse:
    profile = await repository.get_profile(db, user.id)
    return AccountResponse(
        email=user.email,
        email_verified=user.email_verified_at is not None,
        display_name=profile.display_name,
        phone=profile.phone,
        status=user.status,
        roles=await repository.get_roles(db, user.id),
        seller_verification="not_started",
    )


async def update_account(
    db: AsyncSession, user: User, changes: AccountUpdateRequest
) -> AccountResponse:
    profile = await repository.get_profile(db, user.id)
    profile.display_name = changes.display_name
    profile.phone = changes.phone or None
    await db.commit()
    return await account(db, user)
