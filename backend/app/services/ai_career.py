import json

from openai import OpenAI
from app.config import settings


def extract_keywords(resume_text: str) -> dict:
    """Extract skills and search keywords from resume text using AI."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — парсер резюме. Из текста резюме извлеки навыки и ключевые слова для поиска вакансий. "
                    "Верни ТОЛЬКО валидный JSON без markdown-обёртки, формат:\n"
                    '{"skills": ["Python", "React", ...], "keywords": ["Python developer", "Frontend", ...]}\n'
                    "skills — конкретные технологии/инструменты/языки (макс 15).\n"
                    "keywords — 3-5 коротких поисковых запроса для HeadHunter на основе профиля кандидата."
                ),
            },
            {"role": "user", "content": resume_text},
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"skills": [], "keywords": []}
    return {
        "skills": data.get("skills", []),
        "keywords": data.get("keywords", []),
    }


SCORE_CATEGORIES = [
    "competitiveness",
    "growth_potential",
    "technical_depth",
    "practical_experience",
    "presentation_quality",
    "job_relevance",
]


def score_resume(resume_text: str, skills: list[str], hh_vacancies: list[dict]) -> dict:
    """Score resume on 6 categories using structured output."""
    vacancies_summary = "\n".join(
        f"- {v['title']} ({', '.join(v.get('key_skills', [])) or 'н/д'})"
        for v in hh_vacancies[:5]
    )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Оцени резюме по 6 категориям от 0 до 10.\n"
                    "Верни строго JSON без текста.\n\n"
                    "Категории:\n"
                    "- competitiveness\n"
                    "- growth_potential\n"
                    "- technical_depth\n"
                    "- practical_experience\n"
                    "- presentation_quality\n"
                    "- job_relevance"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Резюме:\n{resume_text}\n\n"
                    f"Навыки: {', '.join(skills) if skills else 'не указаны'}\n\n"
                    f"Вакансии рынка:\n{vacancies_summary}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}

    scores = {}
    for cat in SCORE_CATEGORIES:
        val = data.get(cat, 0)
        scores[cat] = max(0, min(10, int(val))) if isinstance(val, (int, float)) else 0
    return scores


def analyze_resume(resume_text: str, skills: list[str], hh_vacancies: list[dict]) -> str:
    """Send resume + HH vacancies to OpenAI and get career feedback."""
    vacancies_block = ""
    for i, v in enumerate(hh_vacancies, 1):
        key_skills = ", ".join(v.get("key_skills", [])) or "не указаны"
        vacancies_block += (
            f"{i}. **{v['title']}** — {v.get('employer', '')}\n"
            f"   Требования: {v.get('requirement', 'н/д')}\n"
            f"   Ключевые навыки: {key_skills}\n"
            f"   Ссылка: {v.get('url', '')}\n\n"
        )

    prompt = f"""Ты — AI-карьерный консультант. Проанализируй резюме студента и сравни с реальными вакансиями с HeadHunter.

## Резюме студента
{resume_text}

## Навыки студента
{', '.join(skills) if skills else 'Не указаны'}

## Вакансии с HeadHunter
{vacancies_block}

## Задача
Дай развернутый анализ в формате Markdown:

1. **Процент соответствия** — для каждой вакансии оцени, насколько студент подходит (0–100%).
2. **Сильные стороны** — что уже хорошо в резюме и навыках студента.
3. **Недостающие навыки** — что нужно изучить для трудоустройства.
4. **Рекомендации** — конкретные курсы, проекты или шаги для развития.

Отвечай на русском языке. Будь конкретен и полезен."""

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""
