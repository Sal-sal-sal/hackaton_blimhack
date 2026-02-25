from __future__ import annotations

import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile


class Survey(Base):
    """
    Survey / test questionnaire template.

    questions JSONB schema:
      [
        {
          "id": 1,
          "text": "What is your Python experience?",
          "type": "single",         # single | multi | text | scale
          "options": ["<1yr", "1-3yr", "3+yr"],
          "weight": 1               # for score calculation
        },
        ...
      ]
    """

    __tablename__ = "surveys"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    questions: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, server_default="[]")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    results: Mapped[list[SurveyResult]] = relationship(
        "SurveyResult", back_populates="survey"
    )


class SurveyResult(Base):
    """
    A candidate's answers to a survey.

    answers JSONB schema:
      [{"question_id": 1, "answer": "3+yr"}, ...]

    score — nullable; calculated by the application or a scoring function.
    survey_id — SET NULL on survey delete to preserve historical results.
    """

    __tablename__ = "survey_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_profile_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"), index=True
    )
    survey_id: Mapped[int | None] = mapped_column(
        ForeignKey("surveys.id", ondelete="SET NULL"), index=True
    )
    answers: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, server_default="[]")
    score: Mapped[int | None] = mapped_column(Integer)
    completed_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    candidate_profile: Mapped[CandidateProfile] = relationship(
        "CandidateProfile", back_populates="survey_results"
    )
    survey: Mapped[Survey | None] = relationship("Survey", back_populates="results")
