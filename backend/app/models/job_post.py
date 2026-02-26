from __future__ import annotations

import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.organization import Organization


class JobPost(Base):
    """
    A job vacancy ("Вилка") posted by an employer on behalf of their organization.

    tech_stack:    ARRAY(Text) — list of required technologies, e.g. ["Python", "FastAPI"].
                   GIN indexed for containment queries:
                     WHERE tech_stack @> ARRAY['Python', 'FastAPI']

    search_vector: tsvector updated by trigger `job_post_search_vector_update`.
                   Weighted: title (A) > tech_stack (B) > description (B) > requirements (C).
                   GIN indexed for @@ full-text queries.

    views_count:   BigInt — atomic UPDATE SET views_count + 1 (no lost updates).
                   For >5k req/s: buffer in Redis INCR + Celery periodic flush.
    """

    __tablename__ = "job_posts"
    __table_args__ = (
        # GIN for full-text search
        Index("ix_job_posts_search_vector", "search_vector", postgresql_using="gin"),
        # GIN for tech stack containment: tech_stack @> ARRAY['Python']
        Index("ix_job_posts_tech_stack", "tech_stack", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[str | None] = mapped_column(Text)
    conditions: Mapped[str | None] = mapped_column(Text)
    # Tech stack: ["Python", "FastAPI", "PostgreSQL", "Redis"]
    tech_stack: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default="{}"
    )
    image_url: Mapped[str | None] = mapped_column(String(500))
    salary_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), index=True)
    salary_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), index=True)
    # BigInt — supports billions of views
    views_count: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    # tsvector — populated by trigger `job_post_search_vector_update`
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    author: Mapped[User] = relationship("User")
    organization: Mapped[Organization] = relationship("Organization", back_populates="job_posts")
