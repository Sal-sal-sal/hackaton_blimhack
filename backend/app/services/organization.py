from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate


async def create_organization(
    session: AsyncSession,
    data: OrganizationCreate,
) -> Organization:
    org = Organization(**data.model_dump())
    session.add(org)
    await session.commit()
    await session.refresh(org)
    return org


async def get_organization(session: AsyncSession, org_id: int) -> Organization:
    result = await session.execute(select(Organization).where(Organization.id == org_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return obj


async def update_organization(
    session: AsyncSession,
    org_id: int,
    data: OrganizationUpdate,
) -> Organization:
    obj = await get_organization(session, org_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await session.commit()
    await session.refresh(obj)
    return obj
