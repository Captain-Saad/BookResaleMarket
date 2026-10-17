"""Baseline: lock down Alembic's own version table.

Alembic creates `alembic_version` in the `public` schema, which Supabase exposes through its
REST API to the public `anon` key. Enable row-level security with no policies (deny by default,
backend.md §3.11) and revoke the API roles' privileges.

Revision ID: 0001
Revises:
Create Date: 2026-10-17
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

REVOKE_SUPABASE_API_ROLES = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE alembic_version FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE alembic_version FROM authenticated;
    END IF;
END $$
"""


def upgrade() -> None:
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute(REVOKE_SUPABASE_API_ROLES)


def downgrade() -> None:
    op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY")
