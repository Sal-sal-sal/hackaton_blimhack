import datetime
from decimal import Decimal

from pydantic import BaseModel, model_validator

from app.schemas.profile import OrganizationBrief, ProfileBrief


class AuthorWithProfile(BaseModel):
    id: int
    email: str
    profile: ProfileBrief | None

    model_config = {"from_attributes": True}


class JobPostCreate(BaseModel):
    organization_id: int
    title: str
    description: str
    requirements: str | None = None
    conditions: str | None = None
    tech_stack: list[str] = []
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    image_url: str | None = None

    @model_validator(mode="after")
    def salary_range_valid(self) -> "JobPostCreate":
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                raise ValueError("salary_min must be <= salary_max")
        return self


class JobPostUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    requirements: str | None = None
    conditions: str | None = None
    tech_stack: list[str] | None = None
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    image_url: str | None = None


class JobPostResponse(BaseModel):
    id: int
    author_id: int
    organization_id: int
    title: str
    description: str
    requirements: str | None
    conditions: str | None
    tech_stack: list[str]
    salary_min: Decimal | None
    salary_max: Decimal | None
    image_url: str | None
    views_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class JobPostFeedItem(JobPostResponse):
    """
    Used in feed listings. Includes author + org data + likes count.
    Loaded without N+1:
      - likes_count via LEFT JOIN subquery (injected after model_validate)
      - author + profile + organization via selectinload chains (batched IN queries)
    """
    likes_count: int = 0
    author: AuthorWithProfile
    organization: OrganizationBrief
