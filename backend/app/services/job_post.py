"""
JobPost service.

Feed query strategy (N+1 prevention):
  One SQL  → job_posts LEFT JOIN like_counts subquery  (counts for all rows)
  +1 query → SELECT authors WHERE id IN (...)           (selectinload, batched)
  +1 query → SELECT profiles WHERE user_id IN (...)     (selectinload, batched)
  +1 query → SELECT organizations WHERE id IN (...)     (selectinload, batched)

Total: 4 queries regardless of page size.

Views counter:
  Atomic UPDATE job_posts SET views_count = views_count + 1 WHERE id = ?
  No application-level read-modify-write → no race conditions.
  For very high traffic (>5k views/s per post), switch to Redis INCR
  with a Celery periodic flush — see services/like.py docstring for details.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.job_post import JobPost
from app.models.like import Like, LikeTargetType
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.user import User
from app.schemas.job_post import JobPostCreate, JobPostUpdate


async def list_job_posts(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 20,
    organization_id: int | None = None,
) -> list[tuple[JobPost, int]]:
    """
    Paginated feed of job posts with application (like) counts.
    Optionally filtered by organization.
    Returns list of (JobPost, likes_count).
    """
    like_counts = (
        select(
            Like.target_id.label("job_post_id"),
            func.count(Like.id).label("likes_count"),
        )
        .where(Like.target_type == LikeTargetType.JOB_POST)
        .group_by(Like.target_id)
        .subquery()
    )

    stmt = (
        select(JobPost, func.coalesce(like_counts.c.likes_count, 0).label("likes_count"))
        .outerjoin(like_counts, JobPost.id == like_counts.c.job_post_id)
        .options(
            selectinload(JobPost.author).selectinload(User.profile).selectinload(
                Profile.organization
            ),
            selectinload(JobPost.organization),
        )
        .order_by(JobPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if organization_id is not None:
        stmt = stmt.where(JobPost.organization_id == organization_id)

    result = await session.execute(stmt)
    return [(row.JobPost, row.likes_count) for row in result]


async def get_job_post(session: AsyncSession, job_post_id: int) -> JobPost:
    result = await session.execute(
        select(JobPost)
        .where(JobPost.id == job_post_id)
        .options(
            selectinload(JobPost.author).selectinload(User.profile).selectinload(
                Profile.organization
            ),
            selectinload(JobPost.organization),
        )
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="JobPost not found")
    return obj


async def create_job_post(
    session: AsyncSession,
    author_id: int,
    data: JobPostCreate,
) -> JobPost:
    # Verify the author actually belongs to that organization
    profile = (
        await session.execute(
            select(Profile).where(
                Profile.user_id == author_id,
                Profile.organization_id == data.organization_id,
            )
        )
    ).scalar_one_or_none()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )

    obj = JobPost(
        author_id=author_id,
        organization_id=data.organization_id,
        title=data.title,
        description=data.description,
        requirements=data.requirements,
        tech_stack=data.tech_stack,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


async def update_job_post(
    session: AsyncSession,
    job_post_id: int,
    requesting_user_id: int,
    data: JobPostUpdate,
) -> JobPost:
    obj = await get_job_post(session, job_post_id)
    if obj.author_id != requesting_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job post")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)

    await session.commit()
    await session.refresh(obj)
    return obj


async def delete_job_post(
    session: AsyncSession,
    job_post_id: int,
    requesting_user_id: int,
) -> None:
    obj = await get_job_post(session, job_post_id)
    if obj.author_id != requesting_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job post")
    await session.delete(obj)
    await session.commit()


async def track_view(session: AsyncSession, job_post_id: int) -> None:
    """
    Atomically increment views_count.

    PostgreSQL UPDATE is row-locking — no lost updates even under concurrency.
    No SELECT before UPDATE (avoids read-modify-write race).

    For >5k views/s per post, replace with Redis INCR + Celery flush.
    """
    await session.execute(
        update(JobPost)
        .where(JobPost.id == job_post_id)
        .values(views_count=JobPost.views_count + 1)
    )
    await session.commit()
