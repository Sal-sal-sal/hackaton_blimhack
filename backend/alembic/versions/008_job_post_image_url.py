"""add image_url to job_posts

Revision ID: 008
Revises: 007
Create Date: 2026-02-26 00:00:00.000000

Changes:
  Add image_url column to job_posts table for background images
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_posts", sa.Column("image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("job_posts", "image_url")
