from __future__ import annotations

import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile


class Resume(Base):
    """
    Candidate resume (1:N to CandidateProfile — one candidate, multiple directions).

    JSONB fields:
      skills:          [{"name": "Python", "level": "expert", "years": 5}, ...]
      work_experience: [{"company": "Acme", "role": "Dev", "start": "2020-01",
                         "end": "2023-01", "description": "..."}, ...]
      education:       [{"institution": "MSU", "degree": "BS",
                         "field": "CS", "year": 2019}, ...]

    Full-text search:
      search_vector — tsvector updated by DB trigger on INSERT/UPDATE.
      Populated from: title (A), skills names (B), work_experience descriptions (C).
      GIN index on search_vector for fast @@ queries.

    Skill filtering:
      GIN index on skills JSONB for containment queries:
        WHERE skills @> '[{"name": "Python"}]'

    Salary filtering:
      B-tree indexes on desired_salary_min, desired_salary_max.
    """

    __tablename__ = "resumes"
    __table_args__ = (
        # GIN index for full-text search
        Index("ix_resumes_search_vector", "search_vector", postgresql_using="gin"),
        # GIN index for skill containment queries: skills @> '[{"name": "Python"}]'
        Index("ix_resumes_skills", "skills", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_profile_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # JSONB — flexible arrays of structured objects
    skills: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, server_default="[]")
    work_experience: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, server_default="[]")
    education: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, server_default="[]")

    # Salary expectations
    desired_salary_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), index=True)
    desired_salary_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), index=True)

    # tsvector — populated by trigger `resume_search_vector_update` (migration 004)
    # Never set this manually; the trigger handles it on INSERT/UPDATE.
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    candidate_profile: Mapped[CandidateProfile] = relationship(
        "CandidateProfile", back_populates="resumes"
    )
