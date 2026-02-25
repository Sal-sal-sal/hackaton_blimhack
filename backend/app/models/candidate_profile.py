from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.resume import Resume
    from app.models.survey import SurveyResult


class CandidateProfile(Base):
    """
    Candidate-specific profile data (1:1 with User where role='candidate').

    Separate from the generic Profile table to keep 3NF:
      - Profile: shared display data (name, avatar, bio)
      - CandidateProfile: candidate domain data (age, profession, city)
    """

    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    # Desired job title / profession (indexed for employer search)
    title: Mapped[str | None] = mapped_column(String(200), index=True)
    age: Mapped[int | None] = mapped_column(Integer)
    city: Mapped[str | None] = mapped_column(String(100), index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="candidate_profile")
    resumes: Mapped[list[Resume]] = relationship(
        "Resume", back_populates="candidate_profile", cascade="all, delete-orphan"
    )
    survey_results: Mapped[list[SurveyResult]] = relationship(
        "SurveyResult", back_populates="candidate_profile", cascade="all, delete-orphan"
    )
