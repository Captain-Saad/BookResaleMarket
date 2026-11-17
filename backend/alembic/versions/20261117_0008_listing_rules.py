"""Listing state transitions, permanent identity locks, and append-only status history."""

from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

GUARD = """
CREATE FUNCTION enforce_listing_rules() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'listings must be deactivated, not deleted';
    END IF;
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'draft' THEN
            RAISE EXCEPTION 'new listings must be drafts';
        END IF;
        NEW.identity_locked := false;
        NEW.purchase_locked := false;
        RETURN NEW;
    END IF;
    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
        RAISE EXCEPTION 'listing owner is immutable';
    END IF;
    IF OLD.identity_locked AND
       ROW(NEW.isbn, NEW.condition, NEW.title, NEW.author) IS DISTINCT FROM
       ROW(OLD.isbn, OLD.condition, OLD.title, OLD.author) THEN
        RAISE EXCEPTION 'listing identity is locked';
    END IF;
    IF OLD.purchase_locked AND
       ROW(NEW.fulfillment, NEW.price_minor, NEW.currency, NEW.notes, NEW.address_id)
       IS DISTINCT FROM
       ROW(OLD.fulfillment, OLD.price_minor, OLD.currency, OLD.notes, OLD.address_id) THEN
        RAISE EXCEPTION 'buyer-committed listing is locked';
    END IF;
    IF NEW.status <> OLD.status AND NOT (
        (OLD.status = 'draft' AND NEW.status IN ('incoming','active','deactivated','suspended')) OR
        (OLD.status = 'incoming' AND NEW.status IN
            ('active','deactivated','intake_failed','suspended')) OR
        (OLD.status = 'active' AND NEW.status IN
            ('incoming','reserved','deactivated','suspended')) OR
        (OLD.status = 'reserved' AND NEW.status IN ('active','sold','suspended')) OR
        (OLD.status = 'deactivated' AND NEW.status IN ('draft','incoming','active','suspended')) OR
        (OLD.status = 'intake_failed' AND NEW.status IN ('deactivated','suspended')) OR
        (OLD.status = 'suspended' AND NEW.status IN ('draft','deactivated'))
    ) THEN
        RAISE EXCEPTION 'invalid listing transition';
    END IF;
    IF NEW.status IN ('active','reserved','sold') AND (
        NEW.title = '' OR NEW.author = '' OR NEW.price_minor IS NULL OR NEW.address_id IS NULL OR
        NOT EXISTS (SELECT 1 FROM listing_photos WHERE listing_id=NEW.id AND validated)
    ) THEN
        RAISE EXCEPTION 'purchasable listings must be complete' USING ERRCODE='23514';
    END IF;
    NEW.identity_locked := OLD.identity_locked OR NEW.status IN ('active','reserved','sold');
    NEW.purchase_locked := OLD.purchase_locked OR NEW.status IN ('reserved','sold');
    NEW.version := OLD.version + 1;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
"""
HISTORY = """
CREATE FUNCTION record_listing_status() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO listing_status_history(id,listing_id,from_status,to_status,created_at)
        VALUES (
            (lpad(to_hex((extract(epoch FROM clock_timestamp())*1000)::bigint),12,'0') ||
             '7' || substr(replace(gen_random_uuid()::text,'-',''),14))::uuid,
            NEW.id, CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,
            NEW.status, NEW.updated_at
        );
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
"""
APPEND_ONLY = """
CREATE FUNCTION listing_history_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'listing status history is append-only';
END $$ LANGUAGE plpgsql;
"""
PHOTOS = """
CREATE FUNCTION protect_listing_photos() RETURNS trigger AS $$
DECLARE
    target_id uuid;
    locked boolean;
BEGIN
    IF TG_OP='UPDATE' AND OLD.listing_id IS DISTINCT FROM NEW.listing_id THEN
        RAISE EXCEPTION 'photo owner listing is immutable';
    END IF;
    target_id := CASE WHEN TG_OP='DELETE' THEN OLD.listing_id ELSE NEW.listing_id END;
    SELECT purchase_locked INTO locked FROM listings WHERE id=target_id FOR UPDATE;
    IF locked THEN
        RAISE EXCEPTION 'buyer-committed photos are locked';
    END IF;
    IF TG_OP='INSERT' AND (SELECT count(*) FROM listing_photos WHERE listing_id=target_id)>=6 THEN
        RAISE EXCEPTION 'too many listing photos';
    END IF;
    IF TG_OP='DELETE' THEN
        IF OLD.validated AND EXISTS (SELECT 1 FROM listings WHERE id=target_id
           AND status IN ('active','reserved','sold')) AND
           (SELECT count(*) FROM listing_photos WHERE listing_id=target_id AND validated)<=1 THEN
            RAISE EXCEPTION 'active listings must retain a photo';
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
"""

ADDRESS_GUARD = """
CREATE FUNCTION protect_listing_address() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM listings WHERE address_id=OLD.id
       AND status IN ('incoming','active','reserved','sold')) THEN
        RAISE EXCEPTION 'address is in use by a listing' USING ERRCODE='23503';
    END IF;
    RETURN OLD;
END $$ LANGUAGE plpgsql;
"""


def upgrade() -> None:
    op.execute(GUARD)
    op.execute(HISTORY)
    op.execute(APPEND_ONLY)
    op.execute(PHOTOS)
    op.execute(ADDRESS_GUARD)
    op.execute(
        "CREATE TRIGGER listing_address_lock BEFORE DELETE ON addresses "
        "FOR EACH ROW EXECUTE FUNCTION protect_listing_address()"
    )
    op.execute(
        "CREATE TRIGGER listing_rules BEFORE INSERT OR UPDATE OR DELETE ON listings "
        "FOR EACH ROW EXECUTE FUNCTION enforce_listing_rules()"
    )
    op.execute(
        "CREATE TRIGGER listing_status_record AFTER INSERT OR UPDATE ON listings "
        "FOR EACH ROW EXECUTE FUNCTION record_listing_status()"
    )
    op.execute(
        "CREATE TRIGGER listing_history_lock BEFORE UPDATE OR DELETE ON listing_status_history "
        "FOR EACH ROW EXECUTE FUNCTION listing_history_append_only()"
    )
    op.execute(
        "CREATE TRIGGER listing_photo_lock BEFORE INSERT OR UPDATE OR DELETE ON listing_photos "
        "FOR EACH ROW EXECUTE FUNCTION protect_listing_photos()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER listing_address_lock ON addresses")
    op.execute("DROP FUNCTION protect_listing_address()")
    for trigger, table in (
        ("listing_photo_lock", "listing_photos"),
        ("listing_history_lock", "listing_status_history"),
        ("listing_status_record", "listings"),
        ("listing_rules", "listings"),
    ):
        op.execute(f"DROP TRIGGER {trigger} ON {table}")
    for function in (
        "protect_listing_photos",
        "listing_history_append_only",
        "record_listing_status",
        "enforce_listing_rules",
    ):
        op.execute(f"DROP FUNCTION {function}()")
