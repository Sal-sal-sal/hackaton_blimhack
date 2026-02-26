from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_profile import CandidateProfile
from app.models.job_post import JobPost
from app.models.like import Like, LikeTargetType
from app.models.resume import Resume
from app.models.user import User
from app.schemas.application import ApplicationResponse


async def list_applications_for_job(
    session: AsyncSession,
    job_post_id: int,
    requesting_user_id: int,
) -> list[ApplicationResponse]:
    """List all applications (likes) for a specific job post."""
    job = await session.get(JobPost, job_post_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job post not found")

    stmt = (
        select(Like, User, CandidateProfile, Resume)
        .join(User, Like.user_id == User.id)
        .outerjoin(CandidateProfile, CandidateProfile.user_id == User.id)
        .outerjoin(Resume, Resume.candidate_profile_id == CandidateProfile.id)
        .where(
            Like.target_type == LikeTargetType.JOB_POST,
            Like.target_id == job_post_id,
        )
        .order_by(Like.created_at.desc())
    )
    result = await session.execute(stmt)
    rows = result.unique().all()

    applications = []
    for row in rows:
        like, user, candidate_profile, resume = row.tuple()
        applications.append(ApplicationResponse(
            id=like.id,
            user_id=user.id,
            user_email=user.email,
            candidate_name=candidate_profile.title if candidate_profile else None,
            candidate_title=candidate_profile.title if candidate_profile else None,
            resume_title=resume.title if resume else None,
            status=like.status,
            created_at=like.created_at,
        ))
    return applications


async def update_application_status(
    session: AsyncSession,
    like_id: int,
    new_status: str,
    requesting_user_id: int,
) -> Like:
    """Update the status of an application. Only the job post author can do this."""
    if new_status not in ("invited",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}. Allowed: invited",
        )

    like = await session.get(Like, like_id)
    if like is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if like.target_type != LikeTargetType.JOB_POST:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a job application")

    job = await session.get(JobPost, like.target_id)
    if job is None or job.author_id != requesting_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job post")

    like.status = new_status
    await session.commit()
    await session.refresh(like)
    return like


async def list_applications_for_employer(
    session: AsyncSession,
    user_id: int,
) -> list[ApplicationResponse]:
    """List all applications across all job posts owned by this employer."""
    stmt = (
        select(Like, User, CandidateProfile, Resume, JobPost)
        .join(JobPost, (Like.target_id == JobPost.id) & (Like.target_type == LikeTargetType.JOB_POST))
        .join(User, Like.user_id == User.id)
        .outerjoin(CandidateProfile, CandidateProfile.user_id == User.id)
        .outerjoin(Resume, Resume.candidate_profile_id == CandidateProfile.id)
        .where(JobPost.author_id == user_id)
        .order_by(Like.created_at.desc())
    )
    result = await session.execute(stmt)
    rows = result.unique().all()

    applications = []
    for row in rows:
        like, user, candidate_profile, resume, job = row.tuple()
        applications.append(ApplicationResponse(
            id=like.id,
            user_id=user.id,
            user_email=user.email,
            candidate_name=candidate_profile.title if candidate_profile else None,
            candidate_title=candidate_profile.title if candidate_profile else None,
            resume_title=resume.title if resume else None,
            status=like.status,
            created_at=like.created_at,
        ))
    return applications


async def get_candidates_context_for_job(
    session: AsyncSession,
    job_post_id: int,
    requesting_user_id: int,
) -> tuple[str, list[dict]]:
    """Build vacancy text + rich candidate contexts for AI scoring.

    Returns (vacancy_text, candidates_list) where each candidate has:
      candidate_id, name, resume_text, skills, ai_analysis
    """
    job = await session.get(JobPost, job_post_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job post not found")
    if job.author_id != requesting_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job post")

    # Build vacancy text
    vacancy_parts = [f"Название: {job.title}"]
    if job.description:
        vacancy_parts.append(f"Описание: {job.description}")
    if job.requirements:
        vacancy_parts.append(f"Требования: {job.requirements}")
    if job.tech_stack:
        vacancy_parts.append(f"Стек: {', '.join(job.tech_stack)}")
    vacancy_text = "\n".join(vacancy_parts)

    # Get all applicants for this job
    stmt = (
        select(Like, User, CandidateProfile)
        .join(User, Like.user_id == User.id)
        .outerjoin(CandidateProfile, CandidateProfile.user_id == User.id)
        .where(
            Like.target_type == LikeTargetType.JOB_POST,
            Like.target_id == job_post_id,
        )
        .order_by(Like.created_at.desc())
    )
    result = await session.execute(stmt)
    rows = result.unique().all()

    candidates = []
    for row in rows:
        like, user, candidate_profile = row.tuple()

        # Build resume text from profile + resumes
        parts: list[str] = []
        all_skills: list[str] = []
        name = user.email

        if candidate_profile:
            name = candidate_profile.title or user.email
            if candidate_profile.title:
                parts.append(f"Должность: {candidate_profile.title}")
            if candidate_profile.city:
                parts.append(f"Город: {candidate_profile.city}")
            if candidate_profile.career_interests:
                parts.append(f"Карьерные интересы: {', '.join(candidate_profile.career_interests)}")

            # Load resumes for this candidate
            resumes_result = await session.execute(
                select(Resume).where(Resume.candidate_profile_id == candidate_profile.id)
            )
            resumes = resumes_result.scalars().all()

            for resume in resumes:
                if resume.title:
                    parts.append(f"Резюме: {resume.title}")
                for skill in (resume.skills or []):
                    skill_name = skill.get("name", "") if isinstance(skill, dict) else str(skill)
                    if skill_name and skill_name not in all_skills:
                        all_skills.append(skill_name)
                for exp in (resume.work_experience or []):
                    if isinstance(exp, dict):
                        parts.append(
                            f"Опыт: {exp.get('role', '')} в {exp.get('company', '')} "
                            f"({exp.get('start', '')} — {exp.get('end', 'н.в.')})"
                        )
                        if exp.get("description"):
                            parts.append(f"  {exp['description']}")
                for edu in (resume.education or []):
                    if isinstance(edu, dict):
                        parts.append(
                            f"Образование: {edu.get('degree', '')} — {edu.get('institution', '')} "
                            f"({edu.get('field', '')}, {edu.get('year', '')})"
                        )

        if all_skills:
            parts.append(f"Навыки: {', '.join(all_skills)}")

        resume_text = "\n".join(parts) if parts else "Профиль не заполнен"

        candidates.append({
            "candidate_id": user.id,
            "name": name,
            "resume_text": resume_text,
            "skills": all_skills,
            "ai_analysis": "",  # Will be filled by caller if available
        })

    return vacancy_text, candidates


async def get_application_stats(
    session: AsyncSession,
    user_id: int,
) -> dict:
    """Get aggregate stats for all applications to this employer's job posts."""
    base = (
        select(Like.id, Like.status)
        .join(JobPost, (Like.target_id == JobPost.id) & (Like.target_type == LikeTargetType.JOB_POST))
        .where(JobPost.author_id == user_id)
    )

    total_q = select(func.count()).select_from(base.subquery())
    total = (await session.execute(total_q)).scalar_one()

    new_q = select(func.count()).select_from(
        base.where(Like.status.is_(None)).subquery()
    )
    new_count = (await session.execute(new_q)).scalar_one()

    invited_q = select(func.count()).select_from(
        base.where(Like.status == "invited").subquery()
    )
    invited_count = (await session.execute(invited_q)).scalar_one()

    return {
        "total_applications": total,
        "new_applications": new_count,
        "invited_applications": invited_count,
    }
