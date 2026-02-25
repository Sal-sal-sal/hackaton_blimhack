"""
Polymorphic Like service — two interaction patterns:

══════════════════════════════════════════════════════════════════════════
PATTERN A — Candidate → JobPost  ("Like as Application")
  User likes a JobPost:
    1. INSERT like ON CONFLICT DO NOTHING RETURNING id
    2. Load job_post.author_id (recruiter)
    3. Find or create 1-on-1 chat
    4. System message: "Новый отклик на вакансию «{title}»"
    All in ONE transaction.

PATTERN B — Employer → Resume / CandidateProfile  ("Like as Invitation")
  Employer likes a resume or candidate profile:
    1. INSERT like ON CONFLICT DO NOTHING RETURNING id
    2. Resolve candidate's user_id from resume or candidate_profile
    3. Find or create 1-on-1 chat
    4. System message: "Работодатель заинтересовался вашим профилем"
    All in ONE transaction.

PATTERN C — Standard like (Class / Profile / Message)
  Simple INSERT ON CONFLICT DO NOTHING — no side effects.

══════════════════════════════════════════════════════════════════════════
RACE CONDITION PROTECTION:
  All inserts use INSERT ... ON CONFLICT DO NOTHING + RETURNING id.
  If RETURNING id is NULL → concurrent request already inserted.
  The DB constraint uq_likes_user_target is the single source of truth.

══════════════════════════════════════════════════════════════════════════
VIEWS COUNTER:
  Simple: UPDATE job_posts SET views_count = views_count + 1 WHERE id = ?
  High-load: Redis INCR + Celery periodic bulk UPDATE (see job_post service).
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.models.chat import Chat, ChatParticipant
from app.models.class_ import Class
from app.models.job_post import JobPost
from app.models.like import Like, LikeTargetType
from app.models.message import Message
from app.models.profile import Profile
from app.models.resume import Resume


async def _validate_target(
    session: AsyncSession,
    target_type: LikeTargetType,
    target_id: int,
) -> None:
    """Verify the target entity exists before creating a like."""
    model_map = {
        LikeTargetType.CLASS: Class,
        LikeTargetType.PROFILE: Profile,
        LikeTargetType.MESSAGE: Message,
        LikeTargetType.JOB_POST: JobPost,
        LikeTargetType.RESUME: Resume,
        LikeTargetType.CANDIDATE_PROFILE: CandidateProfile,
    }
    model = model_map[target_type]
    result = await session.execute(select(model).where(model.id == target_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{target_type.value} with id={target_id} not found",
        )


async def _find_chat_id_for_pair(
    session: AsyncSession,
    user_a_id: int,
    user_b_id: int,
) -> int | None:
    """
    Return chat.id of an existing 1-on-1 chat, or None.
    Called inside an active transaction — no separate commit.
    Uses INTERSECT + count==2 to distinguish direct chats from groups.
    """
    a_chats = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user_a_id)
    b_chats = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user_b_id)
    both = a_chats.intersect(b_chats).scalar_subquery()

    direct_sq = (
        select(ChatParticipant.chat_id)
        .where(ChatParticipant.chat_id.in_(both))
        .group_by(ChatParticipant.chat_id)
        .having(func.count(ChatParticipant.user_id) == 2)
        .scalar_subquery()
    )
    result = await session.execute(select(Chat.id).where(Chat.id.in_(direct_sq)).limit(1))
    return result.scalar_one_or_none()


async def _create_or_find_chat_and_notify(
    session: AsyncSession,
    user_a_id: int,
    user_b_id: int,
    message_text: str,
) -> None:
    """Find or create a 1-on-1 chat and post a system message. No commit — caller commits."""
    chat_id = await _find_chat_id_for_pair(session, user_a_id, user_b_id)
    if chat_id is None:
        chat = Chat()
        session.add(chat)
        await session.flush()
        session.add_all([
            ChatParticipant(chat_id=chat.id, user_id=user_a_id),
            ChatParticipant(chat_id=chat.id, user_id=user_b_id),
        ])
        await session.flush()
        chat_id = chat.id

    # sender_id=None → system message (not tied to any user)
    session.add(Message(chat_id=chat_id, sender_id=None, content=message_text))


async def _apply_to_job_post(
    session: AsyncSession,
    applicant_id: int,
    job_post_id: int,
) -> bool:
    """
    Pattern A: Candidate applies to a JobPost.
    Atomically: INSERT like + find/create chat + system message.
    """
    stmt = (
        pg_insert(Like)
        .values(user_id=applicant_id, target_type=LikeTargetType.JOB_POST, target_id=job_post_id)
        .on_conflict_do_nothing(constraint="uq_likes_user_target")
        .returning(Like.id)
    )
    if (await session.execute(stmt)).first() is None:
        return False  # concurrent duplicate

    job_post = await session.get(JobPost, job_post_id)
    recruiter_id = job_post.author_id

    if recruiter_id != applicant_id:
        await _create_or_find_chat_and_notify(
            session, applicant_id, recruiter_id,
            f'📨 Новый отклик на вакансию «{job_post.title}»',
        )

    await session.commit()
    return True


async def _invite_candidate(
    session: AsyncSession,
    employer_user_id: int,
    target_type: LikeTargetType,
    target_id: int,
) -> bool:
    """
    Pattern B: Employer likes Resume or CandidateProfile → invitation.
    Resolves the candidate's user_id, then creates chat + system message.
    """
    stmt = (
        pg_insert(Like)
        .values(user_id=employer_user_id, target_type=target_type, target_id=target_id)
        .on_conflict_do_nothing(constraint="uq_likes_user_target")
        .returning(Like.id)
    )
    if (await session.execute(stmt)).first() is None:
        return False

    # Resolve candidate user_id
    if target_type == LikeTargetType.RESUME:
        row = await session.execute(
            select(CandidateProfile.user_id)
            .join(Resume, Resume.candidate_profile_id == CandidateProfile.id)
            .where(Resume.id == target_id)
        )
        candidate_user_id = row.scalar_one_or_none()
    else:  # CANDIDATE_PROFILE
        row = await session.execute(
            select(CandidateProfile.user_id).where(CandidateProfile.id == target_id)
        )
        candidate_user_id = row.scalar_one_or_none()

    if candidate_user_id and candidate_user_id != employer_user_id:
        await _create_or_find_chat_and_notify(
            session, employer_user_id, candidate_user_id,
            '👀 Работодатель заинтересовался вашим профилем и хочет пообщаться.',
        )

    await session.commit()
    return True


async def toggle_like(
    session: AsyncSession,
    user_id: int,
    target_type: LikeTargetType,
    target_id: int,
) -> tuple[bool, int]:
    """
    Toggle like. Returns (liked: bool, likes_count: int).

    Routing:
      JOB_POST              → Pattern A (candidate applies)
      RESUME / CANDIDATE_PROFILE → Pattern B (employer invites)
      CLASS / PROFILE / MESSAGE  → Pattern C (simple like, no side effects)
    """
    await _validate_target(session, target_type, target_id)

    existing = (
        await session.execute(
            select(Like).where(
                Like.user_id == user_id,
                Like.target_type == target_type,
                Like.target_id == target_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        await session.delete(existing)
        await session.commit()
        liked = False
    elif target_type == LikeTargetType.JOB_POST:
        liked = await _apply_to_job_post(session, user_id, target_id)
    elif target_type in (LikeTargetType.RESUME, LikeTargetType.CANDIDATE_PROFILE):
        liked = await _invite_candidate(session, user_id, target_type, target_id)
    else:
        stmt = (
            pg_insert(Like)
            .values(user_id=user_id, target_type=target_type, target_id=target_id)
            .on_conflict_do_nothing(constraint="uq_likes_user_target")
        )
        await session.execute(stmt)
        await session.commit()
        liked = True

    count = await get_likes_count(session, target_type, target_id)
    return liked, count


async def get_likes_count(
    session: AsyncSession,
    target_type: LikeTargetType,
    target_id: int,
) -> int:
    result = await session.execute(
        select(func.count(Like.id)).where(
            Like.target_type == target_type,
            Like.target_id == target_id,
        )
    )
    return result.scalar_one()
