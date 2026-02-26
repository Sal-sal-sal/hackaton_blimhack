from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
from app.api.applications import router as applications_router
from app.api.favorites import router as favorites_router

app = FastAPI(title="WordFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
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
app.include_router(applications_router,  prefix="/api")
app.include_router(favorites_router,     prefix="/api")


# Serve uploaded files (job images, etc.)
_uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
