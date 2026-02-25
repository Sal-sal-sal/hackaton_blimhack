from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.job_post import JobPostResponse
from app.schemas.resume import ResumeResponse
from app.services.search import search_job_posts, search_resumes

router = APIRouter(prefix="/search", tags=["search"])


class JobPostSearchResult(JobPostResponse):
    rank: float = 0.0


class ResumeSearchResult(ResumeResponse):
    rank: float = 0.0


@router.get("/job-posts", response_model=list[JobPostSearchResult])
async def fts_job_posts(
    q: str = Query(..., min_length=2, description="Full-text search query"),
    offset: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
):
    """
    Full-text search over job posts.
    Searches: title (A) > tech_stack+description (B) > requirements (C).
    Results ordered by ts_rank relevance.
    """
    rows = await search_job_posts(session, q, offset=offset, limit=limit)
    result = []
    for post, rank in rows:
        item = JobPostSearchResult.model_validate(post)
        item.rank = rank
        result.append(item)
    return result


@router.get("/resumes", response_model=list[ResumeSearchResult])
async def fts_resumes(
    q: str = Query(..., min_length=2, description="Full-text search query"),
    offset: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
):
    """
    Full-text search over public resumes.
    Searches: title (A) > skills (B) > work experience (C).
    Results ordered by ts_rank relevance.
    """
    rows = await search_resumes(session, q, offset=offset, limit=limit)
    result = []
    for resume, rank in rows:
        item = ResumeSearchResult.model_validate(resume)
        item.rank = rank
        result.append(item)
    return result
