"""
Full-text search service using PostgreSQL tsvector.

Both Job Posts and Resumes have a `search_vector` tsvector column
populated by DB triggers (migration 004).

Query syntax: spaces become AND operators.
  "python fastapi" → to_tsquery('russian', 'python & fastapi')

ts_rank() orders results by relevance.

GIN indexes on search_vector make these queries fast (~ms) even on
millions of rows.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.job_post import JobPost
from app.models.like import Like, LikeTargetType
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.resume import Resume
from app.models.user import User


def _build_tsquery(query: str) -> str:
    """Convert 'python fastapi' → 'python & fastapi' for to_tsquery."""
    tokens = [t.strip() for t in query.split() if t.strip()]
    return " & ".join(tokens)


async def search_job_posts(
    session: AsyncSession,
    query: str,
    offset: int = 0,
    limit: int = 20,
) -> list[tuple[JobPost, float]]:
    """
    Full-text search across job post title, description, requirements, tech_stack.
    Returns list of (JobPost, rank) ordered by relevance.
    """
    tsq = func.to_tsquery("russian", _build_tsquery(query))
    rank = func.ts_rank(JobPost.search_vector, tsq).label("rank")

    stmt = (
        select(JobPost, rank)
        .where(JobPost.search_vector.op("@@")(tsq))
        .options(
            selectinload(JobPost.organization),
            selectinload(JobPost.author).selectinload(User.profile).selectinload(
                Profile.organization
            ),
        )
        .order_by(rank.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await session.execute(stmt)
    return [(row.JobPost, float(row.rank)) for row in result]


async def search_resumes(
    session: AsyncSession,
    query: str,
    offset: int = 0,
    limit: int = 20,
) -> list[tuple[Resume, float]]:
    """
    Full-text search across resume title, skills, and work experience descriptions.
    Only public resumes are returned.
    Returns list of (Resume, rank) ordered by relevance.
    """
    from app.models.candidate_profile import CandidateProfile

    tsq = func.to_tsquery("russian", _build_tsquery(query))
    rank = func.ts_rank(Resume.search_vector, tsq).label("rank")

    stmt = (
        select(Resume, rank)
        .where(
            Resume.search_vector.op("@@")(tsq),
            Resume.is_public.is_(True),
        )
        .options(selectinload(Resume.candidate_profile))
        .order_by(rank.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await session.execute(stmt)
    return [(row.Resume, float(row.rank)) for row in result]
