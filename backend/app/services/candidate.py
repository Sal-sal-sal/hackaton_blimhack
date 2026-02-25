"""
Candidate profile & resume service.

Resume search strategy:
  Full-text (tsvector):
    WHERE search_vector @@ to_tsquery('russian', 'python & fastapi')
    ORDER BY ts_rank(search_vector, query) DESC

  Skill containment (exact match via GIN on JSONB):
    WHERE skills @> '[{"name": "Python"}]'

  Salary filter (B-tree index):
    WHERE desired_salary_min >= :min AND desired_salary_max <= :max
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_profile import CandidateProfile
from app.models.resume import Resume
from app.models.survey import Survey, SurveyResult
from app.schemas.candidate import CandidateProfileCreate, CandidateProfileUpdate
from app.schemas.resume import ResumeCreate, ResumeUpdate
from app.schemas.survey import SurveyResultCreate


# ─── Candidate Profile ────────────────────────────────────────────────────────

async def create_candidate_profile(
    session: AsyncSession,
    user_id: int,
    data: CandidateProfileCreate,
) -> CandidateProfile:
    existing = await session.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")

    profile = CandidateProfile(user_id=user_id, **data.model_dump())
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile


async def get_candidate_profile(session: AsyncSession, user_id: int) -> CandidateProfile:
    result = await session.execute(
        select(CandidateProfile)
        .where(CandidateProfile.user_id == user_id)
        .options(selectinload(CandidateProfile.resumes))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return profile


async def update_candidate_profile(
    session: AsyncSession,
    user_id: int,
    data: CandidateProfileUpdate,
) -> CandidateProfile:
    profile = await get_candidate_profile(session, user_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    await session.commit()
    await session.refresh(profile)
    return profile


# ─── Resumes ─────────────────────────────────────────────────────────────────

async def _get_candidate_profile_id(session: AsyncSession, user_id: int) -> int:
    result = await session.execute(
        select(CandidateProfile.id).where(CandidateProfile.user_id == user_id)
    )
    cp_id = result.scalar_one_or_none()
    if cp_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Create a candidate profile first",
        )
    return cp_id


async def create_resume(
    session: AsyncSession,
    user_id: int,
    data: ResumeCreate,
) -> Resume:
    cp_id = await _get_candidate_profile_id(session, user_id)
    resume = Resume(
        candidate_profile_id=cp_id,
        title=data.title,
        is_public=data.is_public,
        skills=[s.model_dump() for s in data.skills],
        work_experience=[w.model_dump() for w in data.work_experience],
        education=[e.model_dump() for e in data.education],
        desired_salary_min=data.desired_salary_min,
        desired_salary_max=data.desired_salary_max,
    )
    session.add(resume)
    await session.commit()
    await session.refresh(resume)
    return resume


async def update_resume(
    session: AsyncSession,
    resume_id: int,
    user_id: int,
    data: ResumeUpdate,
) -> Resume:
    result = await session.execute(
        select(Resume)
        .join(CandidateProfile, Resume.candidate_profile_id == CandidateProfile.id)
        .where(Resume.id == resume_id, CandidateProfile.user_id == user_id)
    )
    resume = result.scalar_one_or_none()
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    for field, value in data.model_dump(exclude_none=True).items():
        # model_dump() already serializes nested Pydantic models (SkillItem etc.) to dicts
        setattr(resume, field, value)

    await session.commit()
    await session.refresh(resume)
    return resume


async def delete_resume(session: AsyncSession, resume_id: int, user_id: int) -> None:
    result = await session.execute(
        select(Resume)
        .join(CandidateProfile, Resume.candidate_profile_id == CandidateProfile.id)
        .where(Resume.id == resume_id, CandidateProfile.user_id == user_id)
    )
    resume = result.scalar_one_or_none()
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    await session.delete(resume)
    await session.commit()


async def search_resumes(
    session: AsyncSession,
    query: str | None = None,
    skill: str | None = None,
    city: str | None = None,
    salary_min: float | None = None,
    salary_max: float | None = None,
    offset: int = 0,
    limit: int = 20,
) -> list[Resume]:
    """
    Resume search with multiple filters.

    query  → full-text search via tsvector @@ to_tsquery (GIN index)
    skill  → exact skill name match: skills @> '[{"name": <skill>}]' (GIN on JSONB)
    city   → filter by candidate city (B-tree index)
    salary → desired_salary_min / desired_salary_max range (B-tree indexes)
    """
    stmt = (
        select(Resume)
        .join(CandidateProfile, Resume.candidate_profile_id == CandidateProfile.id)
        .where(Resume.is_public.is_(True))
        .options(selectinload(Resume.candidate_profile))
        .order_by(Resume.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if query:
        # Full-text search with ts_rank ordering
        tsq = func.to_tsquery("russian", query.replace(" ", " & "))
        stmt = stmt.where(Resume.search_vector.op("@@")(tsq))
        stmt = stmt.order_by(func.ts_rank(Resume.search_vector, tsq).desc())

    if skill:
        # JSONB containment: WHERE skills @> '[{"name": "Python"}]'
        stmt = stmt.where(
            Resume.skills.op("@>")(
                func.cast(f'[{{"name": "{skill}"}}]', Resume.skills.type)
            )
        )

    if city:
        stmt = stmt.where(CandidateProfile.city.ilike(f"%{city}%"))

    if salary_min is not None:
        stmt = stmt.where(Resume.desired_salary_min >= salary_min)

    if salary_max is not None:
        stmt = stmt.where(Resume.desired_salary_max <= salary_max)

    result = await session.execute(stmt)
    return list(result.scalars().all())


# ─── Surveys ─────────────────────────────────────────────────────────────────

async def submit_survey(
    session: AsyncSession,
    user_id: int,
    data: SurveyResultCreate,
) -> SurveyResult:
    cp_id = await _get_candidate_profile_id(session, user_id)

    # Verify survey exists
    survey = await session.get(Survey, data.survey_id)
    if survey is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    # Simple score: count matched expected answers (if survey questions have 'correct')
    score = None

    sr = SurveyResult(
        candidate_profile_id=cp_id,
        survey_id=data.survey_id,
        answers=data.answers,
        score=score,
    )
    session.add(sr)
    await session.commit()
    await session.refresh(sr)
    return sr
