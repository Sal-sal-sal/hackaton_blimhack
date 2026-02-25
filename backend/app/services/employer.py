from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employer_profile import EmployerProfile
from app.models.organization import Organization
from app.schemas.employer import EmployerProfileCreate, EmployerProfileUpdate


async def create_employer_profile(
    session: AsyncSession,
    user_id: int,
    data: EmployerProfileCreate,
) -> EmployerProfile:
    existing = await session.execute(
        select(EmployerProfile).where(EmployerProfile.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employer profile already exists")

    if data.organization_id:
        org = await session.get(Organization, data.organization_id)
        if org is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    profile = EmployerProfile(user_id=user_id, **data.model_dump())
    session.add(profile)
    await session.commit()
    # Reload with organization relationship for response serialization
    return await get_employer_profile(session, user_id)


async def get_employer_profile(session: AsyncSession, user_id: int) -> EmployerProfile:
    result = await session.execute(
        select(EmployerProfile)
        .where(EmployerProfile.user_id == user_id)
        .options(selectinload(EmployerProfile.organization))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employer profile not found")
    return profile


async def update_employer_profile(
    session: AsyncSession,
    user_id: int,
    data: EmployerProfileUpdate,
) -> EmployerProfile:
    profile = await get_employer_profile(session, user_id)

    if data.organization_id is not None:
        org = await session.get(Organization, data.organization_id)
        if org is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await session.commit()
    # Reload with organization relationship for response serialization
    return await get_employer_profile(session, user_id)
