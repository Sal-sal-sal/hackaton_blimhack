import datetime

from pydantic import BaseModel


class OrganizationCreate(BaseModel):
    name: str
    description: str | None = None
    website_url: str | None = None
    logo_url: str | None = None
    industry: str | None = None
    social_links: dict | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    website_url: str | None = None
    logo_url: str | None = None
    industry: str | None = None
    social_links: dict | None = None
    is_verified: bool | None = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    description: str | None
    website_url: str | None
    logo_url: str | None
    industry: str | None
    social_links: dict | None
    is_verified: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
