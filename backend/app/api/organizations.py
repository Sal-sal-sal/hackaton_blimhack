from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.database import get_session
from app.models.profile import Profile
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationResponse, OrganizationUpdate
from app.services.organization import create_organization, get_organization, update_organization
from app.services.job_post import list_job_posts

router = APIRouter(prefix="/organizations", tags=["organizations"])


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


@router.get("/{org_id}/public")
async def get_public_profile(
    org_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Public company page: organization info + active job posts."""
    org = await get_organization(session, org_id)
    jobs = await list_job_posts(session, offset=0, limit=50, organization_id=org_id)

    return {
        "organization": OrganizationResponse.model_validate(org),
        "job_posts": [
            {
                "id": jp.id,
                "title": jp.title,
                "description": jp.description,
                "tech_stack": jp.tech_stack,
                "salary_min": float(jp.salary_min) if jp.salary_min else None,
                "salary_max": float(jp.salary_max) if jp.salary_max else None,
                "views_count": jp.views_count,
                "likes_count": likes_count,
                "created_at": jp.created_at.isoformat(),
            }
            for jp, likes_count in jobs
        ],
    }
