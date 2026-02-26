from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_id
from app.database import get_session
from app.models.profile import Profile
from app.schemas.profile import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Return the current user's profile, creating it if it doesn't exist."""
    result = await session.execute(
        select(Profile)
        .where(Profile.user_id == user_id)
        .options(selectinload(Profile.organization), selectinload(Profile.portfolio_items))
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = Profile(user_id=user_id)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)

    return profile


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Update the current user's profile fields."""
    result = await session.execute(
        select(Profile)
        .where(Profile.user_id == user_id)
        .options(selectinload(Profile.organization), selectinload(Profile.portfolio_items))
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = Profile(user_id=user_id)
        session.add(profile)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await session.commit()
    await session.refresh(profile)

    # Reload with relationships
    result = await session.execute(
        select(Profile)
        .where(Profile.id == profile.id)
        .options(selectinload(Profile.organization), selectinload(Profile.portfolio_items))
    )
    return result.scalar_one()


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Return any user's public profile."""
    result = await session.execute(
        select(Profile)
        .where(Profile.user_id == user_id)
        .options(selectinload(Profile.organization), selectinload(Profile.portfolio_items))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile
