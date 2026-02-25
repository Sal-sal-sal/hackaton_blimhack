import datetime

from pydantic import BaseModel

# ProfileBrief — no organization/portfolio lists, safe for feed (no lazy-load)
from app.schemas.profile import OrganizationBrief, ProfileBrief


class AuthorResponse(BaseModel):
    id: int
    email: str
    profile: ProfileBrief | None  # includes org brief (organization_id, role, organization)

    model_config = {"from_attributes": True}


class ClassCreate(BaseModel):
    title: str
    body: str
    cover_image_url: str | None = None


class ClassUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    cover_image_url: str | None = None


class ClassResponse(BaseModel):
    id: int
    author_id: int
    title: str
    body: str
    cover_image_url: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class ClassFeedItem(ClassResponse):
    # Default 0 so model_validate(orm_obj) doesn't fail —
    # the real value is injected after construction in the route handler
    likes_count: int = 0
    author: AuthorResponse
