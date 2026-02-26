"""add conditions to job_posts

Revision ID: 009
Revises: 008
Create Date: 2026-02-26 00:00:00.000000

Changes:
  Add conditions column to job_posts table for work conditions
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_posts", sa.Column("conditions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("job_posts", "conditions")
