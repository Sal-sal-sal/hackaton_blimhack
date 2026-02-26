from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.database import get_session
from app.schemas.class_ import ClassCreate, ClassFeedItem, ClassResponse, ClassUpdate
from app.services.class_ import create_class, delete_class, get_class, list_classes, update_class

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("/", response_model=list[ClassFeedItem])
async def feed(
    offset: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
):
    rows = await list_classes(session, offset=offset, limit=limit)
    # Build response manually: ORM object doesn't have likes_count attribute,
    # so we can't use model_validate(orm_obj) directly for ClassFeedItem.
    result = []
    for cls, likes_count in rows:
        item = ClassFeedItem.model_validate(cls)
        item.likes_count = likes_count  # inject after construction (default was 0)
        result.append(item)
    return result


@router.get("/{class_id}", response_model=ClassResponse)
async def get_one(class_id: int, session: AsyncSession = Depends(get_session)):
    return await get_class(session, class_id)


@router.post("/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: ClassCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await create_class(session, author_id=user_id, data=data)


@router.patch("/{class_id}", response_model=ClassResponse)
async def update(
    class_id: int,
    data: ClassUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await update_class(session, class_id=class_id, requesting_user_id=user_id, data=data)


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    class_id: int,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    await delete_class(session, class_id=class_id, requesting_user_id=user_id)
