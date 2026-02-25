import datetime

from pydantic import BaseModel


# Lightweight org summary used inside profile responses
class OrganizationBrief(BaseModel):
    id: int
    name: str
    logo_url: str | None

    model_config = {"from_attributes": True}


# Lightweight profile used inside feed items (no nested lists, no lazy-load risk)
class ProfileBrief(BaseModel):
    id: int
    display_name: str | None
    bio: str | None
    avatar_url: str | None
    role: str | None
    organization: OrganizationBrief | None

    model_config = {"from_attributes": True}


class PortfolioItemResponse(BaseModel):
    id: int
    title: str
    description: str | None
    url: str | None
    cover_image_url: str | None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    organization_id: int | None = None
    role: str | None = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    display_name: str | None
    bio: str | None
    avatar_url: str | None
    role: str | None
    organization_id: int | None
    is_recruiter: bool
    created_at: datetime.datetime
    organization: OrganizationBrief | None
    portfolio_items: list[PortfolioItemResponse] = []

    model_config = {"from_attributes": True}
