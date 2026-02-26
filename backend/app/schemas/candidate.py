import datetime

from pydantic import BaseModel


class CandidateProfileCreate(BaseModel):
    title: str | None = None
    age: int | None = None
    city: str | None = None
    career_interests: list[str] = []
    github_url: str | None = None
    portfolio_url: str | None = None


class CandidateProfileUpdate(BaseModel):
    title: str | None = None
    age: int | None = None
    city: str | None = None
    career_interests: list[str] | None = None
    github_url: str | None = None
    portfolio_url: str | None = None


class CandidateProfileResponse(BaseModel):
    id: int
    user_id: int
    title: str | None
    age: int | None
    city: str | None
    career_interests: list[str]
    github_url: str | None
    portfolio_url: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
