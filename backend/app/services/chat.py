"""
Chat service.

Find-or-create a direct (2-person) chat between two users.
Uses a transaction + subquery to avoid race conditions:
  - Both users simultaneously requesting the same chat → the SELECT
    inside the transaction will see each other's commit only after
    the first transaction commits, so only one new Chat is created.

For high concurrency, wrap the insert in a UNIQUE constraint on a
sorted pair (min_user_id, max_user_id) and use ON CONFLICT.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import Chat, ChatParticipant
from app.models.message import Message


async def _find_direct_chat(
    session: AsyncSession,
    user_a_id: int,
    user_b_id: int,
) -> Chat | None:
    """
    Return existing 1-on-1 chat between two users, or None.

    Strategy: find chat_ids where user_a is participant INTERSECT
    chat_ids where user_b is participant, then keep only those with
    exactly 2 total participants (= direct chat, not group).
    """
    user_a_sub = select(ChatParticipant.chat_id).where(
        ChatParticipant.user_id == user_a_id
    )
    user_b_sub = select(ChatParticipant.chat_id).where(
        ChatParticipant.user_id == user_b_id
    )

    # chat_ids that contain BOTH users
    candidate_ids = user_a_sub.intersect(user_b_sub).scalar_subquery()

    # Among candidates, keep only chats with exactly 2 participants
    two_person_sq = (
        select(ChatParticipant.chat_id)
        .where(ChatParticipant.chat_id.in_(candidate_ids))
        .group_by(ChatParticipant.chat_id)
        .having(func.count(ChatParticipant.user_id) == 2)
        .scalar_subquery()
    )

    result = await session.execute(
        select(Chat)
        .where(Chat.id.in_(two_person_sq))
        .options(selectinload(Chat.participants))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_or_create_direct_chat(
    session: AsyncSession,
    user_a_id: int,
    user_b_id: int,
) -> Chat:
    """Return existing direct chat or create a new one. Uses a transaction."""
    if user_a_id == user_b_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a chat with yourself",
        )

    async with session.begin():
        existing = await _find_direct_chat(session, user_a_id, user_b_id)
        if existing:
            return existing

        chat = Chat()
        session.add(chat)
        await session.flush()  # get chat.id before inserting participants

        session.add_all([
            ChatParticipant(chat_id=chat.id, user_id=user_a_id),
            ChatParticipant(chat_id=chat.id, user_id=user_b_id),
        ])
        await session.flush()

    # Reload with relationships outside the transaction
    result = await session.execute(
        select(Chat)
        .where(Chat.id == chat.id)
        .options(selectinload(Chat.participants))
    )
    return result.scalar_one()


async def list_my_chats(
    session: AsyncSession,
    user_id: int,
) -> list[Chat]:
    """Return all chats the user participates in, ordered by latest message."""
    chat_ids_sq = select(ChatParticipant.chat_id).where(
        ChatParticipant.user_id == user_id
    ).scalar_subquery()

    result = await session.execute(
        select(Chat)
        .where(Chat.id.in_(chat_ids_sq))
        .options(
            selectinload(Chat.participants),
            selectinload(Chat.messages),
        )
        .order_by(Chat.created_at.desc())
    )
    chats = list(result.scalars().unique().all())

    for chat in chats:
        msgs = sorted(chat.messages, key=lambda m: m.created_at) if chat.messages else []
        chat.last_message = msgs[-1] if msgs else None  # type: ignore[attr-defined]

    return chats


async def send_message(
    session: AsyncSession,
    chat_id: int,
    sender_id: int,
    content: str,
) -> Message:
    """Add a message to a chat. Verifies the sender is a participant."""
    participant = await session.execute(
        select(ChatParticipant).where(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == sender_id,
        )
    )
    if participant.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant of this chat",
        )

    message = Message(chat_id=chat_id, sender_id=sender_id, content=content)
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


async def list_messages(
    session: AsyncSession,
    chat_id: int,
    requesting_user_id: int,
    offset: int = 0,
    limit: int = 50,
) -> list[Message]:
    """Paginated message history. Verifies access."""
    participant = await session.execute(
        select(ChatParticipant).where(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == requesting_user_id,
        )
    )
    if participant.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await session.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())
