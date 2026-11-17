"""Database checks: emails stay lowercase (one address can't become two accounts) and countries
stay two capital letters.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-05
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_check_constraint("email_lowercase", "users", "email = lower(email)")
    op.create_check_constraint("country_format", "addresses", "country ~ '^[A-Z]{2}$'")


def downgrade() -> None:
    op.drop_constraint("country_format", "addresses", type_="check")
    op.drop_constraint("email_lowercase", "users", type_="check")
