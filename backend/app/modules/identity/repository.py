"""Database access for identity. Callers commit."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.models import (
    AuthSession,
    EmailToken,
    Profile,
    Role,
    TokenPurpose,
    User,
    UserRole,
)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email))


async def add_user(db: AsyncSession, *, email: str, password_hash: str, display_name: str) -> User:
    user = User(email=email, password_hash=password_hash)
    db.add(user)
    await db.flush()
    db.add(Profile(user_id=user.id, display_name=display_name))
    db.add(UserRole(user_id=user.id, role=Role.BUYER))
    await db.flush()
    return user


async def get_profile(db: AsyncSession, user_id: UUID) -> Profile:
    return await db.get_one(Profile, user_id)


async def get_roles(db: AsyncSession, user_id: UUID) -> list[str]:
    rows = await db.scalars(
        select(UserRole.role).where(UserRole.user_id == user_id).order_by(UserRole.role)
    )
    return list(rows)


async def add_session(
    db: AsyncSession, *, user_id: UUID, token_hash: str, now: datetime, expires_at: datetime
) -> None:
    db.add(
        AuthSession(
            user_id=user_id,
            token_hash=token_hash,
            created_at=now,
            last_seen_at=now,
            expires_at=expires_at,
        )
    )
    await db.flush()


async def get_session_and_user(
    db: AsyncSession, token_hash: str
) -> tuple[AuthSession, User] | None:
    row = (
        await db.execute(
            select(AuthSession, User)
            .join(User, User.id == AuthSession.user_id)
            .where(AuthSession.token_hash == token_hash)
        )
    ).first()
    return (row[0], row[1]) if row else None


async def revoke_session(db: AsyncSession, token_hash: str, now: datetime) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.token_hash == token_hash, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )


async def revoke_all_sessions(db: AsyncSession, user_id: UUID, now: datetime) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )


async def replace_email_token(
    db: AsyncSession,
    *,
    user_id: UUID,
    purpose: TokenPurpose,
    token_hash: str,
    now: datetime,
    expires_at: datetime,
) -> None:
    await db.execute(
        update(EmailToken)
        .where(
            EmailToken.user_id == user_id,
            EmailToken.purpose == purpose,
            EmailToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    db.add(
        EmailToken(user_id=user_id, purpose=purpose, token_hash=token_hash, expires_at=expires_at)
    )
    await db.flush()


async def consume_email_token(
    db: AsyncSession, *, purpose: TokenPurpose, token_hash: str, now: datetime
) -> UUID | None:
    """One atomic update, so two simultaneous requests can't both use the same link."""
    return await db.scalar(
        update(EmailToken)
        .where(
            EmailToken.token_hash == token_hash,
            EmailToken.purpose == purpose,
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > now,
        )
        .values(used_at=now)
        .returning(EmailToken.user_id)
    )


async def get_user(db: AsyncSession, user_id: UUID) -> User:
    return await db.get_one(User, user_id)
