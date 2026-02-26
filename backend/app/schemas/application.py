import datetime

from pydantic import BaseModel


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    candidate_name: str | None = None
    candidate_title: str | None = None
    resume_title: str | None = None
    status: str | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ApplicationStatusUpdate(BaseModel):
    status: str  # "invited"


class ApplicationStats(BaseModel):
    total_applications: int
    new_applications: int
    invited_applications: int
