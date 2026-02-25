import datetime

from pydantic import BaseModel

from app.schemas.profile import OrganizationBrief


class EmployerProfileCreate(BaseModel):
    organization_id: int | None = None
    job_title: str | None = None


class EmployerProfileUpdate(BaseModel):
    organization_id: int | None = None
    job_title: str | None = None


class EmployerProfileResponse(BaseModel):
    id: int
    user_id: int
    organization_id: int | None
    job_title: str | None
    organization: OrganizationBrief | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
