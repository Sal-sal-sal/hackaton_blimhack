from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.api.deps import get_current_user_id
from app.schemas.favorite import FavoriteCreate, FavoriteResponse, FavoriteForAI
from app.services.favorite import (
    add_favorite as svc_add_favorite,
    get_favorites as svc_get_favorites,
    delete_favorite as svc_delete_favorite,
    get_favorites_for_ai as svc_get_favorites_for_ai,
)

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("/", response_model=FavoriteResponse)
async def add_favorite(
    data: FavoriteCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    fav = await svc_add_favorite(session, user_id, data)
    return fav


@router.get("/", response_model=list[FavoriteResponse])
async def get_favorites(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await svc_get_favorites(session, user_id)


@router.delete("/{favorite_id}")
async def delete_favorite(
    favorite_id: int,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    deleted = await svc_delete_favorite(session, user_id, favorite_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")
    return {"ok": True}


@router.get("/for-ai", response_model=FavoriteForAI)
async def get_favorites_for_ai(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    favorites = await svc_get_favorites(session, user_id)
    formatted = await svc_get_favorites_for_ai(session, user_id)
    return FavoriteForAI(
        items=[FavoriteResponse.model_validate(f) for f in favorites],
        formatted_text=formatted,
    )
