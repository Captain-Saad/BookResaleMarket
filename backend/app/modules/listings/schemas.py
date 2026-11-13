from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field, model_validator

from app.core.schemas import ApiModel


class Condition(StrEnum):
    NEW = "new"
    LIKE_NEW = "like_new"
    VERY_GOOD = "very_good"
    GOOD = "good"
    ACCEPTABLE = "acceptable"


class Fulfillment(StrEnum):
    WAREHOUSE = "warehouse"
    ON_DEMAND = "on_demand"


class ListingStatus(StrEnum):
    DRAFT = "draft"
    INCOMING = "incoming"
    ACTIVE = "active"
    RESERVED = "reserved"
    SOLD = "sold"
    DEACTIVATED = "deactivated"
    SUSPENDED = "suspended"
    INTAKE_FAILED = "intake_failed"


class Currency(StrEnum):
    USD = "USD"
    EUR = "EUR"


class BookMetadata(ApiModel):
    isbn: str
    title: str = Field(max_length=300)
    author: str = Field(max_length=200)
    found: bool


class ListingDraftRequest(ApiModel):
    isbn: str | None = Field(default=None, max_length=32)
    title: str = Field(default="", max_length=300)
    author: str = Field(default="", max_length=200)
    condition: Condition = Condition.GOOD
    notes: str = Field(default="", max_length=2000)
    fulfillment: Fulfillment = Fulfillment.ON_DEMAND
    price_minor: int | None = Field(default=None, gt=0, le=100_000_000, strict=True)
    currency: Currency = Currency.USD
    address_id: UUID | None = None


class ListingPatchRequest(ApiModel):
    isbn: str | None = Field(default=None, max_length=32)
    title: str | None = Field(default=None, max_length=300)
    author: str | None = Field(default=None, max_length=200)
    condition: Condition | None = None
    notes: str | None = Field(default=None, max_length=2000)
    fulfillment: Fulfillment | None = None
    price_minor: int | None = Field(default=None, gt=0, le=100_000_000, strict=True)
    currency: Currency | None = None
    address_id: UUID | None = None
    version: int = Field(ge=1, strict=True)

    @model_validator(mode="after")
    def reject_null_values(self) -> "ListingPatchRequest":
        nullable = {"isbn", "price_minor", "address_id"}
        for name in self.model_fields_set - nullable:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class ListingPhoto(ApiModel):
    id: UUID
    url: str
    position: int


class ListingResponse(ApiModel):
    id: UUID
    isbn: str | None
    title: str
    author: str
    condition: Condition
    notes: str
    fulfillment: Fulfillment
    price_minor: int | None
    currency: Currency
    address_id: UUID | None
    status: ListingStatus
    version: int
    identity_locked: bool
    purchase_locked: bool
    return_or_donation_pending: bool
    photos: list[ListingPhoto]
    created_at: datetime
    updated_at: datetime


class ListingPage(ApiModel):
    items: list[ListingResponse]
    next_cursor: UUID | None


class PhotoUploadRequest(ApiModel):
    content_type: str = Field(pattern=r"^image/(jpeg|png|webp)$")
    size_bytes: int = Field(gt=0, le=5 * 1024 * 1024, strict=True)


class PhotoUploadResponse(ApiModel):
    photo_id: UUID
    upload_url: str
    expires_in: int


class PhotoCompleteRequest(ApiModel):
    photo_id: UUID


CONTRACT_MODELS = (
    BookMetadata,
    ListingDraftRequest,
    ListingPatchRequest,
    ListingResponse,
    ListingPage,
    PhotoUploadRequest,
    PhotoUploadResponse,
    PhotoCompleteRequest,
)
