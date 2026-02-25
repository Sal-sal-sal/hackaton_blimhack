"""
Class (content) service.

Feed query avoids N+1 by:
  1. Loading Class + likes_count in a single SQL via LEFT JOIN on a
     subquery (one round-trip to the DB).
  2. Using selectinload chains for author → profile → organization.
     SQLAlchemy batches each level into one IN query.

Total: 4 DB queries for any page size, regardless of row count:
  Q1: SELECT classes LEFT JOIN like_counts_subquery
  Q2: SELECT users WHERE id IN (...)
  Q3: SELECT profiles WHERE user_id IN (...)
  Q4: SELECT organizations WHERE id IN (...)

Note: Profile.organization must be loaded because ProfileBrief
(used in AuthorResponse inside ClassFeedItem) includes the
organization field. Accessing an unloaded async relation raises
MissingGreenlet.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.class_ import Class
from app.models.like import Like, LikeTargetType
from app.models.profile import Profile
from app.models.user import User
from app.schemas.class_ import ClassCreate, ClassUpdate


def _author_options():
    """Reusable selectinload chain: author → profile → organization."""
    return selectinload(Class.author).selectinload(User.profile).selectinload(
        Profile.organization
    )


async def list_classes(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 20,
) -> list[tuple[Class, int]]:
    """
    Returns list of (Class, likes_count) ordered by newest first.
    Author, profile, and organization are eagerly loaded (no N+1).
    """
    like_counts = (
        select(
            Like.target_id.label("class_id"),
            func.count(Like.id).label("likes_count"),
        )
        .where(Like.target_type == LikeTargetType.CLASS)
        .group_by(Like.target_id)
        .subquery()
    )

    stmt = (
        select(Class, func.coalesce(like_counts.c.likes_count, 0).label("likes_count"))
        .outerjoin(like_counts, Class.id == like_counts.c.class_id)
        .options(_author_options())
        .order_by(Class.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await session.execute(stmt)
    return [(row.Class, row.likes_count) for row in result]


async def get_class(session: AsyncSession, class_id: int) -> Class:
    result = await session.execute(
        select(Class)
        .where(Class.id == class_id)
        .options(_author_options())
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return obj


async def create_class(
    session: AsyncSession,
    author_id: int,
    data: ClassCreate,
) -> Class:
    obj = Class(
        author_id=author_id,
        title=data.title,
        body=data.body,
        cover_image_url=data.cover_image_url,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


async def update_class(
    session: AsyncSession,
    class_id: int,
    requesting_user_id: int,
    data: ClassUpdate,
) -> Class:
    obj = await get_class(session, class_id)
    if obj.author_id != requesting_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your class")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)

    await session.commit()
    await session.refresh(obj)
    return obj


async def delete_class(
    session: AsyncSession,
    class_id: int,
    requesting_user_id: int,
) -> None:
    obj = await get_class(session, class_id)
    if obj.author_id != requesting_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your class")
    await session.delete(obj)
    await session.commit()
