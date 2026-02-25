from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.employer import EmployerProfileCreate, EmployerProfileResponse, EmployerProfileUpdate
from app.services.employer import create_employer_profile, get_employer_profile, update_employer_profile

router = APIRouter(prefix="/employers", tags=["employers"])


async def get_current_user_id() -> int:
    """Placeholder — replace with JWT dependency."""
    return 1


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
