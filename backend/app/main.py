from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.classes import router as classes_router
from app.api.chats import router as chats_router
from app.api.likes import router as likes_router
from app.api.job_posts import router as job_posts_router
from app.api.organizations import router as organizations_router
from app.api.candidates import router as candidates_router
from app.api.employers import router as employers_router
from app.api.search import router as search_router
from app.api.profiles import router as profiles_router
from app.api.career_ai import router as career_ai_router

app = FastAPI(title="WordFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(classes_router,       prefix="/api")
app.include_router(chats_router,         prefix="/api")
app.include_router(likes_router,         prefix="/api")
app.include_router(job_posts_router,     prefix="/api")
app.include_router(organizations_router, prefix="/api")
app.include_router(candidates_router,    prefix="/api")
app.include_router(employers_router,     prefix="/api")
app.include_router(search_router,        prefix="/api")
app.include_router(profiles_router,      prefix="/api")
app.include_router(career_ai_router,     prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
