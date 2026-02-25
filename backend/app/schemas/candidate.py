import datetime

from pydantic import BaseModel


class CandidateProfileCreate(BaseModel):
    title: str | None = None
    age: int | None = None
    city: str | None = None


class CandidateProfileUpdate(BaseModel):
    title: str | None = None
    age: int | None = None
    city: str | None = None


class CandidateProfileResponse(BaseModel):
    id: int
    user_id: int
    title: str | None
    age: int | None
    city: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
