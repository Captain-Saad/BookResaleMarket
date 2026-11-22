"""Generated full-text document and public catalog indexes."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    namespace = op.get_bind().scalar(
        sa.text(
            "SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace "
            "WHERE e.extname='pg_trgm'"
        )
    )
    quoted = op.get_bind().dialect.identifier_preparer.quote(namespace)
    op.add_column(
        "listings",
        sa.Column(
            "search_document",
            TSVECTOR(),
            sa.Computed(
                "to_tsvector('english'::regconfig, title || ' ' || author)", persisted=True
            ),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_listings_search_document", "listings", ["search_document"], postgresql_using="gin"
    )
    op.execute(
        f"CREATE INDEX ix_listings_text_trigram ON listings USING gin "
        f"(lower(title || ' ' || author) {quoted}.gin_trgm_ops)"
    )
    op.execute(
        f"CREATE INDEX ix_listings_author_trigram ON listings USING gin "
        f"(lower(author) {quoted}.gin_trgm_ops)"
    )
    op.create_index("ix_listings_status_id", "listings", ["status", "id"])
    op.create_index("ix_listings_currency_price_id", "listings", ["currency", "price_minor", "id"])


def downgrade() -> None:
    for name in (
        "ix_listings_currency_price_id",
        "ix_listings_status_id",
        "ix_listings_author_trigram",
        "ix_listings_text_trigram",
        "ix_listings_search_document",
    ):
        op.drop_index(name, table_name="listings")
    op.drop_column("listings", "search_document")
