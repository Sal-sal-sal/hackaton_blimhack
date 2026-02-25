import datetime

from pydantic import BaseModel

from app.models.like import LikeTargetType


class LikeCreate(BaseModel):
    target_type: LikeTargetType
    target_id: int


class LikeResponse(BaseModel):
    id: int
    user_id: int
    target_type: LikeTargetType
    target_id: int
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class LikeToggleResult(BaseModel):
    liked: bool  # True = like created, False = like removed
    likes_count: int
