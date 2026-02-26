"""add image_url and conditions to job_posts

Revision ID: 008
Revises: 007
Create Date: 2026-02-26 00:00:00.000000

Changes:
  Add image_url and conditions columns to job_posts table
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_posts", sa.Column("image_url", sa.String(500), nullable=True))
    op.add_column("job_posts", sa.Column("conditions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("job_posts", "conditions")
    op.drop_column("job_posts", "image_url")
