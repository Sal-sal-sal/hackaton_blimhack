from __future__ import annotations

import datetime
import enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class LikeTargetType(str, enum.Enum):
    CLASS = "class"
    PROFILE = "profile"
    MESSAGE = "message"
    JOB_POST = "job_post"           # Candidate likes JobPost   → applies for the job
    RESUME = "resume"               # Employer likes Resume      → invites candidate
    CANDIDATE_PROFILE = "candidate_profile"  # Employer likes CandidateProfile → invites


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_likes_user_target"),
        Index("ix_likes_target", "target_type", "target_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    target_type: Mapped[LikeTargetType] = mapped_column(
        Enum(LikeTargetType, name="liketargettype", values_callable=lambda e: [x.value for x in e])
    )
    target_id: Mapped[int] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship("User")
