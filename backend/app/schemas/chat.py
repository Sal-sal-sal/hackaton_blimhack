import datetime

from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int | None
    content: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ChatParticipantResponse(BaseModel):
    user_id: int
    joined_at: datetime.datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    id: int
    created_at: datetime.datetime
    participants: list[ChatParticipantResponse] = []

    model_config = {"from_attributes": True}


class ChatWithLastMessage(ChatResponse):
    last_message: MessageResponse | None = None
