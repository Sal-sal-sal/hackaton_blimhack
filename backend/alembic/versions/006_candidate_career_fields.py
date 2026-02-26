"""candidate career fields — career_interests, github_url, portfolio_url

Revision ID: 006
Revises: 005
Create Date: 2026-02-25 00:00:00.000000

Changes:
  candidate_profiles — add career_interests (jsonb), github_url (varchar 500), portfolio_url (varchar 500)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "candidate_profiles",
        sa.Column("career_interests", postgresql.JSONB(), server_default="[]", nullable=False),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("github_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("portfolio_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidate_profiles", "portfolio_url")
    op.drop_column("candidate_profiles", "github_url")
    op.drop_column("candidate_profiles", "career_interests")
