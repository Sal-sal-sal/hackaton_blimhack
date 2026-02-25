from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.employer_profile import EmployerProfile
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, session: AsyncSession = Depends(get_session)):
    user = await register_user(session, data)
    return user


@router.post("/seed-employer", status_code=status.HTTP_200_OK)
async def seed_employer(session: AsyncSession = Depends(get_session)):
    """
    Create (or return existing) demo employer user + organization.
    Idempotent: safe to call multiple times.
    """
    email = "employer@demo.com"

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is not None:
        # Already seeded — find related data
        profile_res = await session.execute(
            select(Profile).where(Profile.user_id == user.id)
        )
        profile = profile_res.scalar_one_or_none()
        return {
            "user_id": user.id,
            "org_id": profile.organization_id if profile else None,
            "message": "Already seeded",
        }

    # 1. Create user
    from app.services.auth import pwd_context

    user = User(
        email=email,
        hashed_password=pwd_context.hash("password"),
        role=UserRole.EMPLOYER,
    )
    session.add(user)
    await session.flush()

    # 2. Create organization
    org = Organization(name="Demo Corp", description="Demo employer organization")
    session.add(org)
    await session.flush()

    # 3. Create profile linked to org
    profile = Profile(
        user_id=user.id,
        display_name="Demo Employer",
        organization_id=org.id,
        role="HR Manager",
    )
    session.add(profile)

    # 4. Create employer profile
    emp_profile = EmployerProfile(
        user_id=user.id,
        organization_id=org.id,
        job_title="HR Manager",
    )
    session.add(emp_profile)

    await session.commit()

    return {
        "user_id": user.id,
        "org_id": org.id,
        "message": "Employer seeded successfully",
    }
