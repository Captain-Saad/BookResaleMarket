from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    literal_column,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Book(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "books"
    isbn: Mapped[str] = mapped_column(String(13), unique=True)
    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[str] = mapped_column(String(200))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Listing(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint(
            "condition IN ('new','like_new','very_good','good','acceptable')", name="condition"
        ),
        CheckConstraint("fulfillment IN ('warehouse','on_demand')", name="fulfillment"),
        CheckConstraint(
            "status IN ('draft','incoming','active','reserved','sold',"
            "'deactivated','suspended','intake_failed')",
            name="status",
        ),
        CheckConstraint("currency IN ('USD','EUR')", name="currency"),
        CheckConstraint(
            "price_minor IS NULL OR price_minor BETWEEN 1 AND 9007199254740991", name="price"
        ),
        CheckConstraint("version > 0", name="version"),
        Index("ix_listings_seller_id_id", "seller_id", "id"),
        Index(
            "ix_listings_text_trigram",
            literal_column("lower((title::text || ' '::text) || author::text)").label(
                "search_text"
            ),
            postgresql_using="gin",
            postgresql_ops={"search_text": "gin_trgm_ops"},
        ),
        Index("ix_listings_search_document", "search_document", postgresql_using="gin"),
        Index("ix_listings_status_id", "status", "id"),
        Index("ix_listings_currency_price_id", "currency", "price_minor", "id"),
    )
    search_document: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english'::regconfig, title || ' ' || author)", persisted=True),
    )
    seller_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    book_id: Mapped[UUID | None] = mapped_column(ForeignKey("books.id"))
    isbn: Mapped[str | None] = mapped_column(String(13))
    title: Mapped[str] = mapped_column(String(300), default="", server_default="")
    author: Mapped[str] = mapped_column(String(200), default="", server_default="")
    condition: Mapped[str] = mapped_column(String(20), default="good", server_default="good")
    notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    fulfillment: Mapped[str] = mapped_column(
        String(20), default="on_demand", server_default="on_demand"
    )
    price_minor: Mapped[int | None] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="USD", server_default="USD")
    address_id: Mapped[UUID | None] = mapped_column(ForeignKey("addresses.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(20), default="draft", server_default="draft")
    identity_locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    purchase_locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    warehouse_intake_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    return_or_donation_pending: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class ListingPhoto(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "listing_photos"
    __table_args__ = (
        CheckConstraint("size_bytes BETWEEN 1 AND 5242880", name="size"),
        CheckConstraint("position BETWEEN 0 AND 5", name="position"),
        Index("ix_listing_photos_listing_id", "listing_id"),
    )
    listing_id: Mapped[UUID] = mapped_column(ForeignKey("listings.id"))
    path: Mapped[str] = mapped_column(Text, unique=True)
    content_type: Mapped[str] = mapped_column(String(30))
    size_bytes: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer)
    validated: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    upload_token_hash: Mapped[str | None] = mapped_column(String(64))
    upload_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ListingStatusHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "listing_status_history"
    __table_args__ = (Index("ix_listing_status_history_listing_id", "listing_id"),)
    listing_id: Mapped[UUID] = mapped_column(ForeignKey("listings.id"))
    from_status: Mapped[str | None] = mapped_column(String(20))
    to_status: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


Index(
    "ix_listings_author_trigram",
    func.lower(Listing.author).label("author_text"),
    postgresql_using="gin",
    postgresql_ops={"author_text": "gin_trgm_ops"},
)
