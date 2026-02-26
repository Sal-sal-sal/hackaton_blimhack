from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.database import get_session
from app.models.like import LikeTargetType
from app.schemas.like import LikeCreate, LikeToggleResult
from app.services.like import toggle_like

router = APIRouter(prefix="/likes", tags=["likes"])


@router.post("/toggle", response_model=LikeToggleResult)
async def toggle(
    data: LikeCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """
    Toggle like on any supported entity (class, profile, message).
    Returns { liked: bool, likes_count: int }.
    """
    liked, count = await toggle_like(
        session,
        user_id=user_id,
        target_type=data.target_type,
        target_id=data.target_id,
    )
    return LikeToggleResult(liked=liked, likes_count=count)
