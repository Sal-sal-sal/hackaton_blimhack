from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.like import LikeTargetType
from app.schemas.like import LikeCreate, LikeToggleResult
from app.services.like import toggle_like

router = APIRouter(prefix="/likes", tags=["likes"])


# TODO: replace with real auth dependency when JWT is implemented
async def get_current_user_id() -> int:
    """Placeholder. Replace with JWT token extraction."""
    return 1


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
