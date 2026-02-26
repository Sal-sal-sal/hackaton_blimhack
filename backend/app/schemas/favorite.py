import datetime

from pydantic import BaseModel


class FavoriteCreate(BaseModel):
    vacancy_id: str
    source: str
    title: str
    subtitle: str | None = None
    salary: str | None = None
    tags: list[str] = []
    description: str | None = None
    logo_url: str | None = None
    location: str | None = None
    url: str | None = None


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    vacancy_id: str
    source: str
    title: str
    subtitle: str | None = None
    salary: str | None = None
    tags: list[str] = []
    description: str | None = None
    logo_url: str | None = None
    location: str | None = None
    url: str | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class FavoriteForAI(BaseModel):
    items: list[FavoriteResponse]
    formatted_text: str
