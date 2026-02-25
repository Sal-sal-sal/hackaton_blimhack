from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.candidate import (
    CandidateProfileCreate,
    CandidateProfileResponse,
    CandidateProfileUpdate,
)
from app.schemas.resume import ResumeCreate, ResumeResponse, ResumeUpdate
from app.schemas.survey import SurveyResultCreate, SurveyResultResponse
from app.services.candidate import (
    create_candidate_profile,
    create_resume,
    delete_resume,
    get_candidate_profile,
    submit_survey,
    update_candidate_profile,
    update_resume,
)

router = APIRouter(prefix="/candidates", tags=["candidates"])


async def get_current_user_id() -> int:
    """Placeholder — replace with JWT dependency."""
    return 1


# ─── Candidate Profile ────────────────────────────────────────────────────────

@router.post("/profile", response_model=CandidateProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: CandidateProfileCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await create_candidate_profile(session, user_id, data)


@router.get("/profile", response_model=CandidateProfileResponse)
async def get_profile(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await get_candidate_profile(session, user_id)


@router.patch("/profile", response_model=CandidateProfileResponse)
async def update_profile(
    data: CandidateProfileUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await update_candidate_profile(session, user_id, data)


# ─── Resumes ─────────────────────────────────────────────────────────────────

@router.post("/resumes", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: ResumeCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await create_resume(session, user_id, data)


@router.patch("/resumes/{resume_id}", response_model=ResumeResponse)
async def update(
    resume_id: int,
    data: ResumeUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await update_resume(session, resume_id, user_id, data)


@router.delete("/resumes/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    resume_id: int,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    await delete_resume(session, resume_id, user_id)


# ─── Surveys ─────────────────────────────────────────────────────────────────

@router.post("/surveys/submit", response_model=SurveyResultResponse, status_code=status.HTTP_201_CREATED)
async def submit(
    data: SurveyResultCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await submit_survey(session, user_id, data)
