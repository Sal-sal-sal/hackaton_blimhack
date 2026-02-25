import datetime

from pydantic import BaseModel


class OrganizationCreate(BaseModel):
    name: str
    description: str | None = None
    website_url: str | None = None
    logo_url: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    website_url: str | None = None
    logo_url: str | None = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    description: str | None
    website_url: str | None
    logo_url: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
