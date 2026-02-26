from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.database import get_session
from app.schemas.chat import ChatResponse, ChatWithLastMessage, MessageCreate, MessageResponse
from app.services.chat import get_or_create_direct_chat, list_messages, list_my_chats, send_message

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/", response_model=list[ChatWithLastMessage])
async def get_my_chats(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Return all chats the current user participates in, with last message."""
    return await list_my_chats(session, user_id=user_id)


@router.post("/direct/{other_user_id}", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def get_or_create_chat(
    other_user_id: int,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Find existing direct chat with a user, or create a new one."""
    return await get_or_create_direct_chat(session, user_a_id=user_id, user_b_id=other_user_id)


@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def post_message(
    chat_id: int,
    data: MessageCreate,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await send_message(session, chat_id=chat_id, sender_id=user_id, content=data.content)


@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    chat_id: int,
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await list_messages(
        session,
        chat_id=chat_id,
        requesting_user_id=user_id,
        offset=offset,
        limit=limit,
    )
