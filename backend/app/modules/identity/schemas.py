"""Request and response bodies for auth and the current user."""

from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

from app.core.schemas import ApiModel
from app.core.security import PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH
from app.modules.identity.models import SellerVerificationStatus, UserStatus


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
    seller_verification: SellerVerificationStatus


class AccountUpdateRequest(ApiModel):
    display_name: DisplayName
    phone: Annotated[str, AfterValidator(_strip), Field(max_length=32)] = ""


def _strip_upper(value: str) -> str:
    return value.strip().upper()


class AddressRequest(ApiModel):
    recipient_name: Annotated[str, AfterValidator(_strip), Field(min_length=1, max_length=100)]
    line1: Annotated[str, AfterValidator(_strip), Field(min_length=1, max_length=200)]
    line2: Annotated[str, AfterValidator(_strip), Field(max_length=200)] = ""
    city: Annotated[str, AfterValidator(_strip), Field(min_length=1, max_length=100)]
    region: Annotated[str, AfterValidator(_strip), Field(min_length=1, max_length=100)]
    postal_code: Annotated[str, AfterValidator(_strip), Field(min_length=1, max_length=20)]
    country: Annotated[str, AfterValidator(_strip_upper), Field(pattern=r"^[A-Z]{2}$")]


class AddressResponse(ApiModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    recipient_name: str
    line1: str
    line2: str | None
    city: str
    region: str
    postal_code: str
    country: str


class AdminUserResponse(ApiModel):
    id: UUID
    email: str
    display_name: str
    status: UserStatus
    roles: list[str]


class AdminUserPage(ApiModel):
    items: list[AdminUserResponse]
    next_cursor: UUID | None
