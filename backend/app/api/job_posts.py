import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.job_post import JobPostCreate, JobPostFeedItem, JobPostResponse, JobPostUpdate
from app.api.deps import get_current_user_id
from app.services.job_post import (
    create_job_post,
    delete_job_post,
    get_job_post,
    list_job_posts,
    track_view,
    update_job_post,
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "job_images"

router = APIRouter(prefix="/job-posts", tags=["job-posts"])


@router.get("/", response_model=list[JobPostFeedItem])
async def feed(
    offset: int = 0,
    limit: int = 20,
    organization_id: int | None = None,
    session: AsyncSession = Depends(get_session),
):
    """
    Paginated job feed. Includes org data, author profile, and application counts.
    No N+1: single SQL for posts+counts, selectinload for relations.
    """
    rows = await list_job_posts(session, offset=offset, limit=limit, organization_id=organization_id)
    result = []
    for post, likes_count in rows:
        item = JobPostFeedItem.model_validate(post)
        item.likes_count = likes_count
        result.append(item)
    return result


@router.get("/{job_post_id}", response_model=JobPostResponse)
async def get_one(
    job_post_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Get a single job post and increment its view counter atomically."""
    post = await get_job_post(session, job_post_id)
    await track_view(session, job_post_id)
    return post


@router.post("/", response_model=JobPostResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: JobPostCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Create a job post. Author must be a member of the target organization."""
    return await create_job_post(session, author_id=user_id, data=data)


@router.patch("/{job_post_id}", response_model=JobPostResponse)
async def update(
    job_post_id: int,
    data: JobPostUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await update_job_post(session, job_post_id=job_post_id, requesting_user_id=user_id, data=data)


@router.delete("/{job_post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    job_post_id: int,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    await delete_job_post(session, job_post_id=job_post_id, requesting_user_id=user_id)


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    """Upload a background image for a job post. Returns the public URL."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "img.jpg")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Unsupported image format")

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/job_images/{filename}"}
