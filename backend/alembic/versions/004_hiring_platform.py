"""hiring platform — candidates, employers, resumes, surveys, FTS triggers

Revision ID: 004
Revises: 003
Create Date: 2025-01-03 00:00:00.000000

Changes:
  users               — add role enum (userrole: candidate | employer)
  candidate_profiles  — new table
  employer_profiles   — new table
  resumes             — new table (JSONB skills/experience/education + tsvector)
  surveys             — new table
  survey_results      — new table
  job_posts           — add tech_stack (ARRAY Text) + search_vector (tsvector)
  liketargettype enum — add 'resume', 'candidate_profile'
  DB functions+triggers — resume_search_vector_update, job_post_search_vector_update
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. userrole enum ─────────────────────────────────────────────────────
    op.execute("CREATE TYPE userrole AS ENUM ('candidate', 'employer')")

    # ── 2. Add role to users ──────────────────────────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("candidate", "employer", name="userrole"),
            nullable=False,
            server_default="candidate",
        ),
    )

    # ── 3. candidate_profiles ─────────────────────────────────────────────────
    op.create_table(
        "candidate_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_candidate_profiles_user_id", "candidate_profiles", ["user_id"])
    op.create_index("ix_candidate_profiles_title",   "candidate_profiles", ["title"])
    op.create_index("ix_candidate_profiles_city",    "candidate_profiles", ["city"])

    # ── 4. employer_profiles ──────────────────────────────────────────────────
    op.create_table(
        "employer_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("job_title", sa.String(100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_employer_profiles_user_id",        "employer_profiles", ["user_id"])
    op.create_index("ix_employer_profiles_organization_id","employer_profiles", ["organization_id"])

    # ── 5. resumes ────────────────────────────────────────────────────────────
    op.create_table(
        "resumes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "candidate_profile_id",
            sa.Integer(),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("skills",          postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("work_experience", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("education",       postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("desired_salary_min", sa.Numeric(12, 2), nullable=True),
        sa.Column("desired_salary_max", sa.Numeric(12, 2), nullable=True),
        sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_resumes_candidate_profile_id", "resumes", ["candidate_profile_id"])
    op.create_index("ix_resumes_desired_salary_min",   "resumes", ["desired_salary_min"])
    op.create_index("ix_resumes_desired_salary_max",   "resumes", ["desired_salary_max"])
    # GIN — full-text search
    op.create_index(
        "ix_resumes_search_vector", "resumes", ["search_vector"], postgresql_using="gin"
    )
    # GIN — JSONB skills containment: WHERE skills @> '[{"name": "Python"}]'
    op.create_index(
        "ix_resumes_skills", "resumes", ["skills"], postgresql_using="gin"
    )

    # ── 6. surveys ────────────────────────────────────────────────────────────
    op.create_table(
        "surveys",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("questions", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    # ── 7. survey_results ─────────────────────────────────────────────────────
    op.create_table(
        "survey_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "candidate_profile_id",
            sa.Integer(),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "survey_id",
            sa.Integer(),
            sa.ForeignKey("surveys.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("answers", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column(
            "completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_survey_results_candidate_profile_id", "survey_results", ["candidate_profile_id"])
    op.create_index("ix_survey_results_survey_id",            "survey_results", ["survey_id"])

    # ── 8. Extend job_posts ───────────────────────────────────────────────────
    op.add_column(
        "job_posts",
        sa.Column(
            "tech_stack",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column("job_posts", sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True))
    # GIN for full-text search
    op.create_index(
        "ix_job_posts_search_vector", "job_posts", ["search_vector"], postgresql_using="gin"
    )
    # GIN for tech_stack containment: tech_stack @> ARRAY['Python', 'FastAPI']
    op.create_index(
        "ix_job_posts_tech_stack", "job_posts", ["tech_stack"], postgresql_using="gin"
    )

    # ── 9. Extend liketargettype enum ─────────────────────────────────────────
    op.execute("ALTER TYPE liketargettype ADD VALUE IF NOT EXISTS 'resume'")
    op.execute("ALTER TYPE liketargettype ADD VALUE IF NOT EXISTS 'candidate_profile'")

    # ── 10. tsvector triggers ─────────────────────────────────────────────────
    #
    # Resume search vector:
    #   A: title
    #   B: skill names (extracted from JSONB array)
    #   C: work experience descriptions
    #
    # We use jsonb_path_query_array to extract skill names from JSONB.
    # The `|| ' '` concatenation joins them into a searchable string.
    op.execute("""
        CREATE OR REPLACE FUNCTION resume_search_vector_update()
        RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE
          skills_text TEXT;
          work_text   TEXT;
        BEGIN
          -- Extract skill names from JSONB: [{"name":"Python",...}, ...]
          SELECT COALESCE(
            string_agg(elem->>'name', ' '),
            ''
          )
          INTO skills_text
          FROM jsonb_array_elements(NEW.skills) AS elem;

          -- Extract work descriptions
          SELECT COALESCE(
            string_agg(COALESCE(elem->>'description', ''), ' '),
            ''
          )
          INTO work_text
          FROM jsonb_array_elements(NEW.work_experience) AS elem;

          NEW.search_vector :=
            setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A') ||
            setweight(to_tsvector('russian', skills_text), 'B')             ||
            setweight(to_tsvector('russian', work_text), 'C');

          RETURN NEW;
        END;
        $$
    """)

    op.execute("""
        CREATE TRIGGER resume_search_vector_trigger
        BEFORE INSERT OR UPDATE ON resumes
        FOR EACH ROW EXECUTE FUNCTION resume_search_vector_update()
    """)

    #
    # Job post search vector:
    #   A: title
    #   B: tech_stack (array joined to string) + description
    #   C: requirements
    #
    op.execute("""
        CREATE OR REPLACE FUNCTION job_post_search_vector_update()
        RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE
          stack_text TEXT;
        BEGIN
          SELECT COALESCE(array_to_string(NEW.tech_stack, ' '), '')
          INTO stack_text;

          NEW.search_vector :=
            setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A')       ||
            setweight(to_tsvector('russian', stack_text), 'B')                    ||
            setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'B') ||
            setweight(to_tsvector('russian', COALESCE(NEW.requirements, '')), 'C');

          RETURN NEW;
        END;
        $$
    """)

    op.execute("""
        CREATE TRIGGER job_post_search_vector_trigger
        BEFORE INSERT OR UPDATE ON job_posts
        FOR EACH ROW EXECUTE FUNCTION job_post_search_vector_update()
    """)


def downgrade() -> None:
    # Drop triggers and functions
    op.execute("DROP TRIGGER IF EXISTS job_post_search_vector_trigger ON job_posts")
    op.execute("DROP FUNCTION IF EXISTS job_post_search_vector_update()")
    op.execute("DROP TRIGGER IF EXISTS resume_search_vector_trigger ON resumes")
    op.execute("DROP FUNCTION IF EXISTS resume_search_vector_update()")

    # Revert job_posts additions
    op.drop_index("ix_job_posts_tech_stack",     table_name="job_posts")
    op.drop_index("ix_job_posts_search_vector",  table_name="job_posts")
    op.drop_column("job_posts", "search_vector")
    op.drop_column("job_posts", "tech_stack")

    # Drop new tables
    op.drop_table("survey_results")
    op.drop_table("surveys")
    op.drop_table("resumes")
    op.drop_table("employer_profiles")
    op.drop_table("candidate_profiles")

    # Revert users
    op.drop_column("users", "role")
    op.execute("DROP TYPE IF EXISTS userrole")

    # Note: 'resume' and 'candidate_profile' stay in liketargettype enum
    # (PostgreSQL does not support removing enum values without recreation).
