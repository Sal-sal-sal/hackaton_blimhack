import csv
import io

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.hh import search_hh_vacancies, get_vacancy_details
from app.services.ai_career import analyze_resume, extract_keywords, score_resume

router = APIRouter(prefix="/career-ai", tags=["career-ai"])


class AnalyzeRequest(BaseModel):
    resume_text: str
    skills: list[str] = []
    keywords: list[str] = []


class VacancyOut(BaseModel):
    id: str
    title: str
    employer: str | None = None
    salary: str | None = None
    requirement: str | None = None
    responsibility: str | None = None
    url: str | None = None
    key_skills: list[str] = []


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
