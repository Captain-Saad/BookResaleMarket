"""Books, listings, photos and status history; owner access is enforced by the API."""

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
CREATE TABLE books (
        isbn VARCHAR(13) NOT NULL,
        title VARCHAR(300) NOT NULL,
        author VARCHAR(200) NOT NULL,
        fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
        id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT pk_books PRIMARY KEY (id),
        CONSTRAINT uq_books_isbn UNIQUE (isbn)
)
""")
    op.execute("ALTER TABLE books ENABLE ROW LEVEL SECURITY")
    op.execute("""
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON
books FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
THEN REVOKE ALL ON books FROM authenticated; END IF; END $$
""")
    op.execute("""
CREATE TABLE listings (
        seller_id UUID NOT NULL,
        book_id UUID,
        isbn VARCHAR(13),
        title VARCHAR(300) DEFAULT '' NOT NULL,
        author VARCHAR(200) DEFAULT '' NOT NULL,
        condition VARCHAR(20) DEFAULT 'good' NOT NULL,
        notes TEXT DEFAULT '' NOT NULL,
        fulfillment VARCHAR(20) DEFAULT 'on_demand' NOT NULL,
        price_minor BIGINT,
        currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
        address_id UUID,
        status VARCHAR(20) DEFAULT 'draft' NOT NULL,
        identity_locked BOOLEAN DEFAULT 'false' NOT NULL,
        purchase_locked BOOLEAN DEFAULT 'false' NOT NULL,
        warehouse_intake_at TIMESTAMP WITH TIME ZONE,
        return_or_donation_pending BOOLEAN DEFAULT 'false' NOT NULL,
        version INTEGER DEFAULT '1' NOT NULL,
        id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT pk_listings PRIMARY KEY (id),
        CONSTRAINT ck_listings_condition CHECK (condition IN
('new','like_new','very_good','good','acceptable')),
        CONSTRAINT ck_listings_fulfillment CHECK (fulfillment IN
('warehouse','on_demand')),
        CONSTRAINT ck_listings_status CHECK (status IN
('draft','incoming','active','reserved','sold','deactivated','suspended','intake_failed')),
        CONSTRAINT ck_listings_currency CHECK (currency IN ('USD','EUR')),
        CONSTRAINT ck_listings_price CHECK (price_minor IS NULL OR price_minor BETWEEN 1
AND 9007199254740991),
        CONSTRAINT ck_listings_version CHECK (version > 0),
        CONSTRAINT fk_listings_seller_id_users FOREIGN KEY(seller_id) REFERENCES users
(id),
        CONSTRAINT fk_listings_book_id_books FOREIGN KEY(book_id) REFERENCES books (id),
        CONSTRAINT fk_listings_address_id_addresses FOREIGN KEY(address_id) REFERENCES
addresses (id) ON DELETE SET NULL
)
""")
    op.execute("CREATE INDEX ix_listings_seller_id_id ON listings (seller_id, id)")
    op.execute("ALTER TABLE listings ENABLE ROW LEVEL SECURITY")
    op.execute("""
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON
listings FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE
rolname='authenticated') THEN REVOKE ALL ON listings FROM authenticated; END IF; END $$
""")
    op.execute("""
CREATE TABLE listing_photos (
        listing_id UUID NOT NULL,
        path TEXT NOT NULL,
        content_type VARCHAR(30) NOT NULL,
        size_bytes INTEGER NOT NULL,
        position INTEGER NOT NULL,
        validated BOOLEAN DEFAULT 'false' NOT NULL,
        upload_token_hash VARCHAR(64),
        upload_expires_at TIMESTAMP WITH TIME ZONE,
        id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT pk_listing_photos PRIMARY KEY (id),
        CONSTRAINT ck_listing_photos_size CHECK (size_bytes BETWEEN 1 AND 5242880),
        CONSTRAINT ck_listing_photos_position CHECK (position BETWEEN 0 AND 5),
        CONSTRAINT fk_listing_photos_listing_id_listings FOREIGN KEY(listing_id)
REFERENCES listings (id),
        CONSTRAINT uq_listing_photos_path UNIQUE (path)
)
""")
    op.execute("CREATE INDEX ix_listing_photos_listing_id ON listing_photos (listing_id)")
    op.execute("ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY")
    op.execute("""
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON
listing_photos FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE
rolname='authenticated') THEN REVOKE ALL ON listing_photos FROM authenticated; END IF; END
$$
""")
    op.execute("""
CREATE TABLE listing_status_history (
        listing_id UUID NOT NULL,
        from_status VARCHAR(20),
        to_status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        id UUID NOT NULL,
        CONSTRAINT pk_listing_status_history PRIMARY KEY (id),
        CONSTRAINT fk_listing_status_history_listing_id_listings FOREIGN KEY(listing_id)
REFERENCES listings (id)
)
""")
    op.execute(
        "CREATE INDEX ix_listing_status_history_listing_id ON listing_status_history (listing_id)"
    )
    op.execute("ALTER TABLE listing_status_history ENABLE ROW LEVEL SECURITY")
    op.execute("""
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON
listing_status_history FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE
rolname='authenticated') THEN REVOKE ALL ON listing_status_history FROM authenticated; END
IF; END $$
""")


def downgrade() -> None:
    for table in ("listing_status_history", "listing_photos", "listings", "books"):
        op.drop_table(table)
