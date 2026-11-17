"""Request and response bodies for auth and the current user."""

from typing import Annotated

from pydantic import AfterValidator, EmailStr, Field

from app.core.schemas import ApiModel
from app.core.security import PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH
from app.modules.identity.models import UserStatus


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _check_password_bytes(value: str) -> str:
    if len(value.encode()) > PASSWORD_MAX_BYTES:
        raise ValueError(f"Password must be at most {PASSWORD_MAX_BYTES} bytes")
    return value


def _strip(value: str) -> str:
    return value.strip()


Email = Annotated[EmailStr, AfterValidator(_normalize_email)]
NewPassword = Annotated[
    str, Field(min_length=PASSWORD_MIN_LENGTH), AfterValidator(_check_password_bytes)
]
DisplayName = Annotated[str, AfterValidator(_strip), Field(min_length=1, max_length=100)]


class RegisterRequest(ApiModel):
    display_name: DisplayName
    email: Email
    password: NewPassword


class LoginRequest(ApiModel):
    email: Email
    password: str = Field(min_length=1, max_length=1000)


class EmailRequest(ApiModel):
    email: Email


class TokenRequest(ApiModel):
    token: str = Field(min_length=1, max_length=200)


class ResetPasswordRequest(TokenRequest):
    password: NewPassword


class AccountResponse(ApiModel):
    email: str
    email_verified: bool
    display_name: str
    phone: str | None
    status: UserStatus
    roles: list[str]
    seller_verification: str


class AccountUpdateRequest(ApiModel):
    display_name: DisplayName
    phone: Annotated[str, AfterValidator(_strip), Field(max_length=32)] = ""
