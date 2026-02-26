from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.database import get_session
from app.schemas.application import ApplicationResponse, ApplicationStats, ApplicationStatusUpdate
from app.schemas.like import LikeResponse
from app.services.application import (
    get_application_stats,
    list_applications_for_employer,
    list_applications_for_job,
    update_application_status,
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/job/{job_post_id}", response_model=list[ApplicationResponse])
async def get_job_applications(
    job_post_id: int,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """List all applicants for a specific vacancy."""
    return await list_applications_for_job(session, job_post_id, user_id)


@router.patch("/{like_id}/status", response_model=LikeResponse)
async def patch_application_status(
    like_id: int,
    data: ApplicationStatusUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Update application status (e.g. invite candidate)."""
    return await update_application_status(session, like_id, data.status, user_id)


@router.get("/stats", response_model=ApplicationStats)
async def get_stats(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Employer dashboard stats for applications."""
    return await get_application_stats(session, user_id)


@router.get("/", response_model=list[ApplicationResponse])
async def get_all_applications(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """List all applications across all employer's job posts."""
    return await list_applications_for_employer(session, user_id)
