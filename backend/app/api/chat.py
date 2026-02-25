from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from openai import OpenAI
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


@router.post("/")
async def chat(request: ChatRequest):
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    def generate():
        with client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True,
        ) as stream:
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text is None:
                    continue
                escaped = text.replace("\n", "\\n")
                yield f"data: {escaped}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
