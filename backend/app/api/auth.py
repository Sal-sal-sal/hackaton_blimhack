from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.employer_profile import EmployerProfile
from app.models.organization import Organization
from app.models.profile import Profile
from app.models.user import User, UserRole
from app.models.candidate_profile import CandidateProfile
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import pwd_context, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ────────────────────────────────────────────

class RegisterEmployerRequest(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    display_name: str | None = None
    job_title: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    token: str

    model_config = {"from_attributes": True}


# ── Endpoints ──────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, session: AsyncSession = Depends(get_session)):
    """Register a candidate (default role)."""
    user = await register_user(session, data)
    return user


@router.post("/register-employer", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_employer(
    data: RegisterEmployerRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Register employer: creates User (role=employer) + Organization + Profile + EmployerProfile.
    Returns user data ready for immediate login (no JWT needed).
    """
    # Check if email already taken
    existing = await session.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email уже зарегистрирован",
        )

    # 1. Create user
    user = User(
        email=data.email,
        hashed_password=pwd_context.hash(data.password),
        role=UserRole.EMPLOYER,
    )
    session.add(user)
    await session.flush()

    # 2. Create organization
    org = Organization(name=data.company_name)
    session.add(org)
    await session.flush()

    # 3. Create profile
    display_name = data.display_name or data.email.split("@")[0]
    profile = Profile(
        user_id=user.id,
        display_name=display_name,
        organization_id=org.id,
        role=data.job_title,
    )
    session.add(profile)

    # 4. Create employer profile
    emp_profile = EmployerProfile(
        user_id=user.id,
        organization_id=org.id,
        job_title=data.job_title,
    )
    session.add(emp_profile)

    await session.commit()
    await session.refresh(user)

    return AuthResponse(
        id=user.id,
        email=user.email,
        name=display_name,
        role="employer",
        token=f"stub-token-{user.id}",
    )


@router.post("/register-candidate", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_candidate(
    data: UserCreate,
    session: AsyncSession = Depends(get_session),
):
    """Register a candidate with profile."""
    existing = await session.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email уже зарегистрирован",
        )

    user = User(
        email=data.email,
        hashed_password=pwd_context.hash(data.password),
        role=UserRole.CANDIDATE,
    )
    session.add(user)
    await session.flush()

    display_name = data.email.split("@")[0]
    profile = Profile(user_id=user.id, display_name=display_name)
    session.add(profile)

    candidate_profile = CandidateProfile(user_id=user.id)
    session.add(candidate_profile)

    await session.commit()
    await session.refresh(user)

    return AuthResponse(
        id=user.id,
        email=user.email,
        name=display_name,
        role="candidate",
        token=f"stub-token-{user.id}",
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    """Login: verify password, return user data."""
    result = await session.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    # Load profile for display_name
    profile_res = await session.execute(
        select(Profile).where(Profile.user_id == user.id)
    )
    profile = profile_res.scalar_one_or_none()
    display_name = profile.display_name if profile else user.email.split("@")[0]

    return AuthResponse(
        id=user.id,
        email=user.email,
        name=display_name,
        role=user.role.value,
        token=f"stub-token-{user.id}",
    )
