"""employer cabinet — organization extensions, application status

Revision ID: 005
Revises: 004
Create Date: 2026-02-25 00:00:00.000000

Changes:
  organizations — add industry (varchar 100), social_links (jsonb), is_verified (boolean)
  likes         — add status (varchar 20, nullable)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Extend organizations ────────────────────────────────────────────
    op.add_column("organizations", sa.Column("industry", sa.String(100), nullable=True))
    op.add_column("organizations", sa.Column("social_links", postgresql.JSONB(), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # ── 2. Extend likes with status ────────────────────────────────────────
    op.add_column("likes", sa.Column("status", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("likes", "status")
    op.drop_column("organizations", "is_verified")
    op.drop_column("organizations", "social_links")
    op.drop_column("organizations", "industry")
