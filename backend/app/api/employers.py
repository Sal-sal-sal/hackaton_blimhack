from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.job_post import JobPost
from app.models.like import Like, LikeTargetType
from app.api.deps import get_current_user_id
from app.schemas.employer import EmployerProfileCreate, EmployerProfileResponse, EmployerProfileUpdate
from app.services.employer import create_employer_profile, get_employer_profile, update_employer_profile

router = APIRouter(prefix="/employers", tags=["employers"])


@router.post("/profile", response_model=EmployerProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: EmployerProfileCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await create_employer_profile(session, user_id, data)


@router.get("/profile", response_model=EmployerProfileResponse)
async def get_profile(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await get_employer_profile(session, user_id)


@router.patch("/profile", response_model=EmployerProfileResponse)
async def update_profile(
    data: EmployerProfileUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await update_employer_profile(session, user_id, data)


@router.get("/dashboard")
async def get_dashboard(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Employer dashboard stats: vacancies, views, applications."""
    # Total vacancies
    vacancies_q = select(func.count(JobPost.id)).where(JobPost.author_id == user_id)
    total_vacancies = (await session.execute(vacancies_q)).scalar_one()

    # Total views across all vacancies
    views_q = select(func.coalesce(func.sum(JobPost.views_count), 0)).where(
        JobPost.author_id == user_id
    )
    total_views = (await session.execute(views_q)).scalar_one()

    # Applications (likes targeting employer's job posts)
    apps_base = (
        select(Like.id, Like.status)
        .join(JobPost, (Like.target_id == JobPost.id) & (Like.target_type == LikeTargetType.JOB_POST))
        .where(JobPost.author_id == user_id)
    )
    total_apps = (await session.execute(
        select(func.count()).select_from(apps_base.subquery())
    )).scalar_one()

    new_apps = (await session.execute(
        select(func.count()).select_from(
            apps_base.where(Like.status.is_(None)).subquery()
        )
    )).scalar_one()

    return {
        "total_vacancies": total_vacancies,
        "total_views": int(total_views),
        "total_applications": total_apps,
        "new_applications": new_apps,
    }
