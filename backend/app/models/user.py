from __future__ import annotations

import datetime
import enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.profile import Profile
    from app.models.candidate_profile import CandidateProfile
    from app.models.employer_profile import EmployerProfile


class UserRole(str, enum.Enum):
    CANDIDATE = "candidate"
    EMPLOYER = "employer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(1024), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"), nullable=False, server_default=UserRole.CANDIDATE.value
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    profile: Mapped[Profile | None] = relationship(
        "Profile", back_populates="user", uselist=False
    )
    candidate_profile: Mapped[CandidateProfile | None] = relationship(
        "CandidateProfile", back_populates="user", uselist=False
    )
    employer_profile: Mapped[EmployerProfile | None] = relationship(
        "EmployerProfile", back_populates="user", uselist=False
    )
