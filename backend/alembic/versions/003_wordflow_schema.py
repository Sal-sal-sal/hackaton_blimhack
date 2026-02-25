"""wordflow schema — restructure organizations, add job_posts, extend likes enum

Revision ID: 003
Revises: 002
Create Date: 2025-01-02 00:00:00.000000

Changes:
  organizations — remove profile_id FK, add logo_url + created_at (standalone company entity)
  profiles      — add organization_id FK (SET NULL) + role column
  job_posts     — new table
  liketargettype enum — add 'job_post' value
"""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Restructure organizations ──────────────────────────────────────────

    # Drop the old profile_id FK + index (orgs no longer belong to a profile)
    op.drop_index("ix_organizations_profile_id", table_name="organizations")
    op.drop_constraint("organizations_profile_id_fkey", "organizations", type_="foreignkey")
    op.drop_column("organizations", "profile_id")
    op.drop_column("organizations", "role")  # role moves to profiles

    # Add new columns to make Organization a standalone company entity
    op.add_column("organizations", sa.Column("logo_url", sa.String(2048), nullable=True))
    op.add_column(
        "organizations",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ── 2. Update profiles ────────────────────────────────────────────────────

    # organization_id: nullable FK → organizations (SET NULL when org deleted)
    op.add_column(
        "profiles",
        sa.Column("organization_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_profiles_organization_id",
        "profiles",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_profiles_organization_id", "profiles", ["organization_id"])

    # role: the user's job title at their current organization
    op.add_column("profiles", sa.Column("role", sa.String(100), nullable=True))

    # ── 3. Extend liketargettype enum ─────────────────────────────────────────
    # Note: ALTER TYPE ADD VALUE is transactional in PostgreSQL 12+ (we target 16)
    op.execute("ALTER TYPE liketargettype ADD VALUE IF NOT EXISTS 'job_post'")

    # ── 4. Create job_posts table ─────────────────────────────────────────────
    op.create_table(
        "job_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("salary_min", sa.Numeric(12, 2), nullable=True),
        sa.Column("salary_max", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "views_count",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_job_posts_author_id", "job_posts", ["author_id"])
    op.create_index("ix_job_posts_organization_id", "job_posts", ["organization_id"])
    # Compound index for salary range filtering queries
    op.create_index("ix_job_posts_salary", "job_posts", ["salary_min", "salary_max"])


def downgrade() -> None:
    # Drop job_posts
    op.drop_table("job_posts")

    # Revert profiles
    op.drop_index("ix_profiles_organization_id", table_name="profiles")
    op.drop_constraint("fk_profiles_organization_id", "profiles", type_="foreignkey")
    op.drop_column("profiles", "organization_id")
    op.drop_column("profiles", "role")

    # Revert organizations (restore profile_id)
    op.drop_column("organizations", "logo_url")
    op.drop_column("organizations", "created_at")
    op.add_column(
        "organizations",
        sa.Column(
            "profile_id",
            sa.Integer(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    op.add_column("organizations", sa.Column("role", sa.String(100), nullable=True))
    op.create_index("ix_organizations_profile_id", "organizations", ["profile_id"])

    # Note: PostgreSQL does not support removing enum values.
    # 'job_post' stays in liketargettype enum after downgrade.
    # To remove it, drop and recreate the enum manually.
