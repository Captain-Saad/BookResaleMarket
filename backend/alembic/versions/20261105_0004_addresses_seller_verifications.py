"""Addresses and seller verifications.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-05
"""

from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ("addresses", "seller_verifications")


def _lock_down(table: str) -> str:
    return f"""
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE {table} FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE {table} FROM authenticated;
    END IF;
END $$
"""


def _timestamps() -> list[sa.Column[datetime]]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "addresses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("recipient_name", sa.String(100), nullable=False),
        sa.Column("line1", sa.String(200), nullable=False),
        sa.Column("line2", sa.String(200)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("postal_code", sa.String(20), nullable=False),
        sa.Column("country", sa.String(2), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_addresses_user_id", "addresses", ["user_id"])
    op.create_table(
        "seller_verifications",
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_reference", sa.String(200)),
        *_timestamps(),
        sa.CheckConstraint(
            "status IN ('not_started', 'pending', 'verified', 'rejected')", name="status"
        ),
    )
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(_lock_down(table))


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_table(table)
