from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.organization import Organization
    from app.models.portfolio import Portfolio


class Profile(Base):
    """
    Extended user information (1:1 with User).

    organization_id / role represent the user's CURRENT employer.
    If organization_id is None → the user is a job seeker only.
    If organization_id is set  → the user is also a recruiter for that company.
    This implements "Unified Identity" — one user, two roles.
    """

    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    display_name: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(2048))

    # Optional employer — SET NULL when org is deleted (profile survives)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), index=True
    )
    # User's job title at that organization (e.g. "Senior Engineer", "CTO")
    role: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="profile")
    organization: Mapped[Organization | None] = relationship(
        "Organization", back_populates="profiles"
    )
    portfolio_items: Mapped[list[Portfolio]] = relationship(
        "Portfolio", back_populates="profile", cascade="all, delete-orphan"
    )

    @property
    def is_recruiter(self) -> bool:
        return self.organization_id is not None
