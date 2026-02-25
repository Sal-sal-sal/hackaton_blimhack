from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.profile import Profile
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationResponse, OrganizationUpdate
from app.services.organization import create_organization, get_organization, update_organization

router = APIRouter(prefix="/organizations", tags=["organizations"])


# TODO: replace with real JWT dependency
async def get_current_user_id() -> int:
    return 1


@router.get("/my", response_model=OrganizationResponse)
async def get_my_organization(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Return the organization linked to the current user via their Profile."""
    result = await session.execute(
        select(Profile).where(Profile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if profile is None or profile.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization linked to this user",
        )

    org_result = await session.execute(
        select(Organization).where(Organization.id == profile.organization_id)
    )
    org = org_result.scalar_one_or_none()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return org


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create(data: OrganizationCreate, session: AsyncSession = Depends(get_session)):
    return await create_organization(session, data)


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_one(org_id: int, session: AsyncSession = Depends(get_session)):
    return await get_organization(session, org_id)


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update(
    org_id: int,
    data: OrganizationUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await update_organization(session, org_id, data)
