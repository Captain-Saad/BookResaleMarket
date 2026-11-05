"""Business rules for accounts and sessions."""

import asyncio
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.config import Settings
from app.core.errors import ForbiddenError, InvalidTokenError, NotFoundError, UnauthorizedError
from app.core.security import (
    dummy_password_hash,
    hash_password,
    hash_token,
    new_token,
    verify_password,
)
from app.integrations.email.base import EmailMessage
from app.integrations.seller_verification.base import SellerVerificationProvider
from app.modules.identity import repository
from app.modules.identity.models import (
    Address,
    AuthSession,
    Role,
    SellerVerification,
    SellerVerificationStatus,
    TokenPurpose,
    User,
)
from app.modules.identity.schemas import AccountResponse, AccountUpdateRequest, AddressRequest

LAST_SEEN_RESOLUTION = timedelta(minutes=1)


@dataclass(frozen=True)
class Authenticated:
    user: User
    session: AuthSession


async def _issue_token(
    db: AsyncSession, clock: Clock, user_id: UUID, purpose: TokenPurpose, lifetime: timedelta
) -> str:
    token = new_token()
    now = clock.now()
    await repository.replace_email_token(
        db,
        user_id=user_id,
        purpose=purpose,
        token_hash=hash_token(token),
        now=now,
        expires_at=now + lifetime,
    )
    await db.commit()
    return token


def _verification_email(settings: Settings, email: str, token: str) -> EmailMessage:
    link = f"{settings.frontend_base_url}/verify-email?token={token}"
    return EmailMessage(
        to=email,
        subject="Verify your BookLoop email",
        body=f"Welcome to BookLoop. Verify your email with this link:\n\n{link}\n",
    )


async def register(
    db: AsyncSession,
    settings: Settings,
    clock: Clock,
    *,
    email: str,
    password: str,
    display_name: str,
) -> EmailMessage:
    """Answers the same way for new and existing emails. The email itself tells them apart, and
    only the owner of the address can read it."""
    password_hash = await asyncio.to_thread(hash_password, password, settings.bcrypt_rounds)
    already_registered = EmailMessage(
        to=email,
        subject="You already have a BookLoop account",
        body="Someone tried to register with this email, which already has an account.\n"
        "If this was you, sign in or reset your password. If not, you can ignore this email.\n",
    )
    if await repository.get_user_by_email(db, email) is not None:
        return already_registered
    try:
        user = await repository.add_user(
            db, email=email, password_hash=password_hash, display_name=display_name
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return already_registered
    token = await _issue_token(
        db,
        clock,
        user.id,
        TokenPurpose.VERIFY_EMAIL,
        timedelta(hours=settings.email_verification_hours),
    )
    return _verification_email(settings, email, token)


async def resend_verification(
    db: AsyncSession, settings: Settings, clock: Clock, email: str
) -> EmailMessage | None:
    user = await repository.get_user_by_email(db, email)
    if user is None or user.email_verified_at is not None:
        return None
    token = await _issue_token(
        db,
        clock,
        user.id,
        TokenPurpose.VERIFY_EMAIL,
        timedelta(hours=settings.email_verification_hours),
    )
    return _verification_email(settings, email, token)


async def verify_email(db: AsyncSession, clock: Clock, token: str) -> None:
    now = clock.now()
    user_id = await repository.consume_email_token(
        db, purpose=TokenPurpose.VERIFY_EMAIL, token_hash=hash_token(token), now=now
    )
    if user_id is None:
        raise InvalidTokenError()
    user = await repository.get_user(db, user_id)
    user.email_verified_at = user.email_verified_at or now
    await db.commit()


async def forgot_password(
    db: AsyncSession, settings: Settings, clock: Clock, email: str
) -> EmailMessage | None:
    user = await repository.get_user_by_email(db, email)
    if user is None:
        return None
    token = await _issue_token(
        db,
        clock,
        user.id,
        TokenPurpose.RESET_PASSWORD,
        timedelta(minutes=settings.password_reset_minutes),
    )
    link = f"{settings.frontend_base_url}/reset-password?token={token}"
    return EmailMessage(
        to=email,
        subject="Reset your BookLoop password",
        body=f"Choose a new password with this link:\n\n{link}\n\n"
        "If you didn't ask for this, you can ignore this email.\n",
    )


async def reset_password(
    db: AsyncSession, settings: Settings, clock: Clock, *, token: str, password: str
) -> None:
    now = clock.now()
    user_id = await repository.consume_email_token(
        db, purpose=TokenPurpose.RESET_PASSWORD, token_hash=hash_token(token), now=now
    )
    if user_id is None:
        raise InvalidTokenError()
    user = await repository.get_user(db, user_id)
    user.password_hash = await asyncio.to_thread(hash_password, password, settings.bcrypt_rounds)
    user.email_verified_at = user.email_verified_at or now
    await repository.revoke_all_sessions(db, user_id, now)
    await db.commit()


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
    verification = await repository.get_seller_verification(db, user.id)
    return AccountResponse(
        email=user.email,
        email_verified=user.email_verified_at is not None,
        display_name=profile.display_name,
        phone=profile.phone,
        status=user.status,
        roles=await repository.get_roles(db, user.id),
        seller_verification=(
            verification.status if verification else SellerVerificationStatus.NOT_STARTED
        ),
    )


async def update_account(
    db: AsyncSession, user: User, changes: AccountUpdateRequest
) -> AccountResponse:
    profile = await repository.get_profile(db, user.id)
    profile.display_name = changes.display_name
    profile.phone = changes.phone or None
    await db.commit()
    return await account(db, user)


async def list_addresses(db: AsyncSession, user: User) -> list[Address]:
    return await repository.list_addresses(db, user.id)


async def create_address(db: AsyncSession, user: User, body: AddressRequest) -> Address:
    address = Address(
        user_id=user.id, **body.model_dump(exclude={"line2"}), line2=body.line2 or None
    )
    await repository.add_address(db, address)
    await db.commit()
    return address


async def update_address(
    db: AsyncSession, user: User, address_id: UUID, body: AddressRequest
) -> Address:
    address = await repository.get_owned_address(db, user.id, address_id)
    if address is None:
        raise NotFoundError()
    for field, value in body.model_dump().items():
        setattr(address, field, value or None if field == "line2" else value)
    await db.commit()
    return address


async def delete_address(db: AsyncSession, user: User, address_id: UUID) -> None:
    if not await repository.delete_owned_address(db, user.id, address_id):
        raise NotFoundError()
    await db.commit()


async def become_seller(db: AsyncSession, user: User) -> AccountResponse:
    await repository.add_role(db, user.id, Role.SELLER)
    await db.commit()
    return await account(db, user)


async def start_seller_verification(
    db: AsyncSession, provider: SellerVerificationProvider, user: User
) -> AccountResponse:
    if Role.SELLER not in await repository.get_roles(db, user.id):
        raise ForbiddenError()
    verification = await repository.get_seller_verification(db, user.id)
    if verification is None:
        reference = await provider.start(user.id)
        await repository.add_seller_verification(
            db,
            SellerVerification(
                user_id=user.id,
                status=SellerVerificationStatus.PENDING,
                provider_reference=reference,
            ),
        )
    elif verification.status == SellerVerificationStatus.REJECTED:
        verification.provider_reference = await provider.start(user.id)
        verification.status = SellerVerificationStatus.PENDING
    await db.commit()
    return await account(db, user)


def require_verified_seller(status: SellerVerificationStatus) -> None:
    """FR-34: S2's listing module calls this before a listing can become purchasable."""
    if status != SellerVerificationStatus.VERIFIED:
        raise ForbiddenError(code="seller_not_verified")
