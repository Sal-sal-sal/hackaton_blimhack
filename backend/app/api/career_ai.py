import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.api.deps import get_current_user_id
from app.services.hh import search_hh_vacancies, get_vacancy_details
from app.services.unsplash import get_city_photo
from app.services.ai_career import (
    analyze_resume, extract_keywords, score_resume, generate_recommendations,
    analyze_favorites, match_professions, compare_with_market,
    score_candidates_for_vacancy,
)

router = APIRouter(prefix="/career-ai", tags=["career-ai"])


class AnalyzeRequest(BaseModel):
    resume_text: str
    skills: list[str] = []
    keywords: list[str] = []


class VacancyOut(BaseModel):
    id: str
    title: str
    employer: str | None = None
    employer_logo: str | None = None
    salary: str | None = None
    requirement: str | None = None
    responsibility: str | None = None
    url: str | None = None
    key_skills: list[str] = []
    location: str | None = None
    experience: str | None = None
    schedule: str | None = None
    employment: str | None = None


class ResumeScores(BaseModel):
    competitiveness: int = 0
    growth_potential: int = 0
    technical_depth: int = 0
    practical_experience: int = 0
    presentation_quality: int = 0
    job_relevance: int = 0


class AnalyzeResponse(BaseModel):
    vacancies: list[VacancyOut]
    ai_feedback: str
    scores: ResumeScores


class ExtractKeywordsRequest(BaseModel):
    resume_text: str


class ExtractKeywordsResponse(BaseModel):
    skills: list[str]
    keywords: list[str]


class ParseCsvResponse(BaseModel):
    skills: list[str]
    keywords: list[str]
    raw_text: str


@router.post("/extract-keywords", response_model=ExtractKeywordsResponse)
async def extract_keywords_endpoint(body: ExtractKeywordsRequest):
    if not body.resume_text.strip():
        raise HTTPException(400, "Текст резюме пуст")
    result = extract_keywords(body.resume_text)
    return ExtractKeywordsResponse(**result)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest):
    # Auto-extract keywords from resume if none provided
    if not body.keywords and not body.skills and body.resume_text.strip():
        extracted = extract_keywords(body.resume_text)
        body.skills = extracted["skills"]
        body.keywords = extracted["keywords"]

    kw = body.keywords if body.keywords else body.skills
    if not kw:
        raise HTTPException(400, "Укажите навыки или ключевые слова для поиска вакансий")

    # 1. Search HH
    hh_results = await search_hh_vacancies(kw)

    # 2. Get key_skills for top-5
    enriched: list[dict] = []
    for v in hh_results[:5]:
        try:
            details = await get_vacancy_details(v["id"])
            v["key_skills"] = details["key_skills"]
        except Exception:
            v["key_skills"] = []
        enriched.append(v)

    # Keep remaining vacancies as-is
    for v in hh_results[5:]:
        v["key_skills"] = []
        enriched.append(v)

    # 3. AI analysis + scoring
    ai_feedback = analyze_resume(body.resume_text, body.skills, enriched)
    scores = score_resume(body.resume_text, body.skills, enriched)

    return AnalyzeResponse(
        vacancies=[VacancyOut(**v) for v in enriched],
        ai_feedback=ai_feedback,
        scores=ResumeScores(**scores),
    )


@router.post("/parse-csv", response_model=ParseCsvResponse)
async def parse_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Загрузите CSV-файл")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    skills: list[str] = []
    raw_parts: list[str] = []

    for row in reader:
        for key, value in row.items():
            if not value:
                continue
            raw_parts.append(f"{key}: {value}")
            key_lower = key.lower()
            if any(w in key_lower for w in ("skill", "навык", "технолог", "язык", "stack")):
                skills.extend(s.strip() for s in value.replace(";", ",").split(",") if s.strip())

    raw_text = "\n".join(raw_parts)
    keywords = skills[:10] if skills else []

    return ParseCsvResponse(skills=skills, keywords=keywords, raw_text=raw_text)


# ─── Profile-based analysis ──────────────────────────────────────────────────

class CourseOut(BaseModel):
    title: str
    platform: str = ""
    url: str = ""


class ProjectOut(BaseModel):
    title: str
    description: str = ""


class CareerDirectionOut(BaseModel):
    title: str
    description: str = ""
    match_percent: int = 0


class RecommendationsOut(BaseModel):
    skills_to_learn: list[str] = []
    courses: list[CourseOut] = []
    projects: list[ProjectOut] = []
    career_directions: list[CareerDirectionOut] = []


class ProfessionMatchOut(BaseModel):
    title: str
    match_percent: int = 0
    description: str = ""


class CategoryScoresOut(BaseModel):
    content: int = 0
    structure: int = 0
    formatting: int = 0
    keywords: int = 0
    achievements: int = 0


class MarketComparisonOut(BaseModel):
    axis: str
    user: int = 0
    market: int = 0


class StrengthOut(BaseModel):
    title: str
    description: str = ""


class ImprovementOut(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"


class DashboardOut(BaseModel):
    overall_score: int = 0
    category_scores: CategoryScoresOut = CategoryScoresOut()
    market_position: int = 50
    market_comparison: list[MarketComparisonOut] = []
    strengths: list[StrengthOut] = []
    improvements: list[ImprovementOut] = []


class ProfileAnalyzeResponse(BaseModel):
    vacancies: list[VacancyOut]
    ai_feedback: str
    scores: ResumeScores
    recommendations: RecommendationsOut
    professions: list[ProfessionMatchOut] = []
    dashboard: DashboardOut = DashboardOut()


@router.post("/analyze-profile", response_model=ProfileAnalyzeResponse)
async def analyze_profile(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Auto-build resume from profile + resumes, analyze against HH vacancies."""
    from app.services.candidate import get_candidate_profile, get_candidate_resumes

    try:
        profile = await get_candidate_profile(session, user_id)
    except Exception:
        raise HTTPException(404, "Сначала создайте профиль кандидата")

    resumes = await get_candidate_resumes(session, user_id)

    # Build resume text from profile + resumes data
    parts: list[str] = []
    if profile.title:
        parts.append(f"Должность: {profile.title}")
    if profile.city:
        parts.append(f"Город: {profile.city}")

    all_skills: list[str] = []
    for resume in resumes:
        if resume.title:
            parts.append(f"Резюме: {resume.title}")
        for skill in (resume.skills or []):
            name = skill.get("name", "") if isinstance(skill, dict) else str(skill)
            if name and name not in all_skills:
                all_skills.append(name)
        for exp in (resume.work_experience or []):
            if isinstance(exp, dict):
                parts.append(
                    f"Опыт: {exp.get('role', '')} в {exp.get('company', '')} "
                    f"({exp.get('start', '')} — {exp.get('end', 'н.в.')})"
                )
                if exp.get("description"):
                    parts.append(f"  {exp['description']}")
        for edu in (resume.education or []):
            if isinstance(edu, dict):
                parts.append(
                    f"Образование: {edu.get('degree', '')} — {edu.get('institution', '')} "
                    f"({edu.get('field', '')}, {edu.get('year', '')})"
                )

    if all_skills:
        parts.append(f"Навыки: {', '.join(all_skills)}")

    career_interests = profile.career_interests or []
    if career_interests:
        parts.append(f"Карьерные интересы: {', '.join(career_interests)}")

    resume_text = "\n".join(parts) if parts else "Профиль не заполнен"

    # Extract keywords for HH search
    kw = all_skills[:5] if all_skills else career_interests[:3]
    if not kw and profile.title:
        kw = [profile.title]
    if not kw:
        kw = ["developer"]

    # Search HH
    hh_results = await search_hh_vacancies(kw)

    # Enrich top-5 with key_skills
    enriched: list[dict] = []
    for v in hh_results[:5]:
        try:
            details = await get_vacancy_details(v["id"])
            v["key_skills"] = details["key_skills"]
        except Exception:
            v["key_skills"] = []
        enriched.append(v)
    for v in hh_results[5:]:
        v["key_skills"] = []
        enriched.append(v)

    # AI analysis + scoring + recommendations + professions + dashboard
    ai_feedback = analyze_resume(resume_text, all_skills, enriched)
    scores = score_resume(resume_text, all_skills, enriched)
    recommendations = generate_recommendations(resume_text, all_skills, enriched, career_interests)
    professions = match_professions(resume_text, all_skills)
    dashboard = compare_with_market(resume_text, all_skills, enriched)

    return ProfileAnalyzeResponse(
        vacancies=[VacancyOut(**v) for v in enriched],
        ai_feedback=ai_feedback,
        scores=ResumeScores(**scores),
        recommendations=RecommendationsOut(**recommendations),
        professions=[ProfessionMatchOut(**p) for p in professions],
        dashboard=DashboardOut(**dashboard),
    )


# ─── Favorites analysis ──────────────────────────────────────────────────────

class FavMatchOut(BaseModel):
    title: str
    match_percent: int = 0
    matching_skills: list[str] = []
    missing_skills: list[str] = []


class FavGapOut(BaseModel):
    skill: str
    priority: str = "medium"
    vacancies_count: int = 0


class FavoritesAnalysisResponse(BaseModel):
    matches: list[FavMatchOut] = []
    gaps: list[FavGapOut] = []
    common_themes: list[str] = []
    recommendations: list[str] = []


@router.post("/analyze-favorites", response_model=FavoritesAnalysisResponse)
async def analyze_favorites_endpoint(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Analyze liked vacancies vs user profile/skills."""
    from app.services.favorite import get_favorites_for_ai
    from app.services.candidate import get_candidate_profile, get_candidate_resumes

    # Get favorites text
    favorites_text = await get_favorites_for_ai(session, user_id)
    if not favorites_text:
        raise HTTPException(400, "Нет понравившихся вакансий для анализа")

    # Build resume text from profile
    try:
        profile = await get_candidate_profile(session, user_id)
    except Exception:
        raise HTTPException(404, "Сначала создайте профиль кандидата")

    resumes = await get_candidate_resumes(session, user_id)

    parts: list[str] = []
    if profile.title:
        parts.append(f"Должность: {profile.title}")
    if profile.city:
        parts.append(f"Город: {profile.city}")

    all_skills: list[str] = []
    for resume in resumes:
        if resume.title:
            parts.append(f"Резюме: {resume.title}")
        for skill in (resume.skills or []):
            name = skill.get("name", "") if isinstance(skill, dict) else str(skill)
            if name and name not in all_skills:
                all_skills.append(name)
        for exp in (resume.work_experience or []):
            if isinstance(exp, dict):
                parts.append(
                    f"Опыт: {exp.get('role', '')} в {exp.get('company', '')} "
                    f"({exp.get('start', '')} — {exp.get('end', 'н.в.')})"
                )

    if all_skills:
        parts.append(f"Навыки: {', '.join(all_skills)}")

    resume_text = "\n".join(parts) if parts else "Профиль не заполнен"

    result = analyze_favorites(favorites_text, resume_text, all_skills)
    return FavoritesAnalysisResponse(**result)


# ─── AI Candidate Scoring & Sorting ──────────────────────────────────────────

class ScoredCandidateOut(BaseModel):
    candidate_id: int
    name: str = ""
    score: int = 0
    reasoning: str = ""
    matching_skills: list[str] = []
    missing_skills: list[str] = []


class ScoreCandidatesRequest(BaseModel):
    job_post_id: int
    vacancy_text: str | None = None  # optional HH vacancy text override


class ScoreCandidatesResponse(BaseModel):
    vacancy_title: str
    scored_candidates: list[ScoredCandidateOut]


@router.post("/score-candidates", response_model=ScoreCandidatesResponse)
async def score_candidates_endpoint(
    body: ScoreCandidatesRequest,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """Score and sort all applicants for a job post using AI."""
    from app.services.application import get_candidates_context_for_job

    vacancy_text, candidates = await get_candidates_context_for_job(
        session, body.job_post_id, user_id
    )

    if not candidates:
        from app.models.job_post import JobPost
        job = await session.get(JobPost, body.job_post_id)
        return ScoreCandidatesResponse(
            vacancy_title=job.title if job else "",
            scored_candidates=[],
        )

    # Use HH vacancy text override if provided (richer context)
    effective_vacancy = body.vacancy_text or vacancy_text

    scored = score_candidates_for_vacancy(effective_vacancy, candidates)

    # Enrich with names from candidates list
    name_map = {c["candidate_id"]: c["name"] for c in candidates}
    for item in scored:
        item["name"] = name_map.get(item["candidate_id"], "")

    from app.models.job_post import JobPost
    job = await session.get(JobPost, body.job_post_id)

    return ScoreCandidatesResponse(
        vacancy_title=job.title if job else "",
        scored_candidates=[ScoredCandidateOut(**s) for s in scored],
    )


# ─── HH vacancy search proxy ─────────────────────────────────────────────────

@router.get("/hh-vacancies")
async def hh_vacancies_search(
    q: str = Query(..., min_length=1),
    area: int = Query(1),
):
    """HH vacancy search proxy for employer vacancy browser."""
    keywords = [k.strip() for k in q.split() if k.strip()]
    if not keywords:
        raise HTTPException(400, "Укажите поисковый запрос")

    results = await search_hh_vacancies(keywords, area=area)

    # Enrich top-5
    for v in results[:5]:
        try:
            details = await get_vacancy_details(v["id"])
            v["key_skills"] = details["key_skills"]
        except Exception:
            v["key_skills"] = []
    for v in results[5:]:
        v.setdefault("key_skills", [])

    return [VacancyOut(**v) for v in results]


# ─── HH swipe feed for candidates ──────────────────────────────────────────

class HHSwipeCard(BaseModel):
    id: str
    source: str = "hh"
    title: str
    subtitle: str | None = None
    salary: str | None = None
    tags: list[str] = []
    description: str | None = None
    logoUrl: str | None = None
    imageUrl: str | None = None
    location: str | None = None
    url: str | None = None
    experience: str | None = None
    schedule: str | None = None
    employment: str | None = None


@router.get("/hh-swipe-feed", response_model=list[HHSwipeCard])
async def hh_swipe_feed(
    q: str = Query(..., min_length=1),
    area: int = Query(1),
    per_page: int = Query(20, ge=1, le=50),
):
    """HH vacancies formatted for the swipe deck."""
    keywords = [k.strip() for k in q.split() if k.strip()]
    if not keywords:
        raise HTTPException(400, "Укажите поисковый запрос")

    results = await search_hh_vacancies(keywords, area=area, per_page=per_page)

    # Enrich top-5 with key_skills + full description + conditions
    for v in results[:5]:
        try:
            details = await get_vacancy_details(v["id"])
            v["key_skills"] = details["key_skills"]
            v["full_description"] = details.get("description", "")
            # Overwrite with richer data from details endpoint
            if details.get("experience"):
                v["experience"] = details["experience"]
            if details.get("schedule"):
                v["schedule"] = details["schedule"]
            if details.get("employment"):
                v["employment"] = details["employment"]
        except Exception:
            v["key_skills"] = []
            v["full_description"] = None
    for v in results[5:]:
        v.setdefault("key_skills", [])
        v.setdefault("full_description", None)

    # Fetch city photos for unique locations (cached per city)
    locations = {v.get("location") for v in results if v.get("location")}
    city_photos: dict[str, str | None] = {}
    for city in locations:
        if city:
            city_photos[city] = await get_city_photo(city)

    cards = []
    for v in results:
        # Use full description if available, otherwise fall back to snippets
        description = v.get("full_description")
        if not description:
            desc_parts = []
            if v.get("requirement"):
                desc_parts.append(v["requirement"])
            if v.get("responsibility"):
                desc_parts.append(v["responsibility"])
            description = " · ".join(desc_parts) if desc_parts else None

        location = v.get("location")
        image_url = city_photos.get(location) if location else None

        cards.append(HHSwipeCard(
            id=v["id"],
            title=v["title"],
            subtitle=v.get("employer"),
            salary=v.get("salary"),
            tags=v.get("key_skills", []),
            description=description,
            logoUrl=v.get("employer_logo"),
            imageUrl=image_url,
            location=location,
            url=v.get("url"),
            experience=v.get("experience"),
            schedule=v.get("schedule"),
            employment=v.get("employment"),
        ))
    return cards


class HHVacancyDetail(BaseModel):
    id: str
    title: str
    description: str | None = None
    key_skills: list[str] = []
    salary: str | None = None
    experience: str | None = None
    schedule: str | None = None
    employment: str | None = None
    employment_form: str | None = None
    location: str | None = None
    address: str | None = None
    work_format: list[str] = []
    working_days: list[str] = []
    working_time_intervals: list[str] = []
    working_time_modes: list[str] = []
    work_schedule_by_days: list[str] = []
    working_hours: list[str] = []
    professional_roles: list[str] = []
    languages: list[str] = []
    driver_license: list[str] = []
    employer: str | None = None
    url: str | None = None
    contacts: str | None = None
    has_test: bool = False
    accept_temporary: bool = False
    accept_handicapped: bool = False
    accept_kids: bool = False
    accept_incomplete_resumes: bool = False


@router.get("/hh-vacancy/{vacancy_id}", response_model=HHVacancyDetail)
async def hh_vacancy_detail(vacancy_id: str):
    """Fetch full vacancy details from HeadHunter."""
    try:
        details = await get_vacancy_details(vacancy_id)
    except Exception:
        raise HTTPException(502, "Не удалось получить данные с HeadHunter")

    return HHVacancyDetail(**details)


@router.get("/city-image")
async def city_image(city: str = Query(..., min_length=1)):
    """Get a city background image URL from Unsplash (cached)."""
    url = await get_city_photo(city)
    return {"city": city, "image_url": url}
