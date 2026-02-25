import datetime
from typing import Any

from pydantic import BaseModel


class SurveyCreate(BaseModel):
    title: str
    description: str | None = None
    questions: list[dict[str, Any]] = []


class SurveyResponse(BaseModel):
    id: int
    title: str
    description: str | None
    questions: list[Any]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class SurveyResultCreate(BaseModel):
    survey_id: int
    answers: list[dict[str, Any]]


class SurveyResultResponse(BaseModel):
    id: int
    candidate_profile_id: int
    survey_id: int | None
    answers: list[Any]
    score: int | None
    completed_at: datetime.datetime

    model_config = {"from_attributes": True}
