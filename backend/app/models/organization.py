from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.profile import Profile
    from app.models.job_post import JobPost


class Organization(Base):
    """
    A company/employer entity.

    Relationship direction (1:N):
      Organization → Profile   (one employer has many employee profiles)
      Organization → JobPost   (one employer posts many vacancies)

    A User becomes a recruiter when their Profile.organization_id is set.
    """

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(String(2048))
    logo_url: Mapped[str | None] = mapped_column(String(2048))
    industry: Mapped[str | None] = mapped_column(String(100))
    social_links: Mapped[dict | None] = mapped_column(JSONB, default=None)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    profiles: Mapped[list[Profile]] = relationship("Profile", back_populates="organization")
    job_posts: Mapped[list[JobPost]] = relationship(
        "JobPost", back_populates="organization", cascade="all, delete-orphan"
    )
