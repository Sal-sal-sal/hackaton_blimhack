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


def analyze_favorites(favorites_text: str, resume_text: str, skills: list[str]) -> dict:
    """Analyze liked vacancies against user's resume and skills."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — AI-карьерный аналитик. Тебе даны понравившиеся вакансии пользователя и его резюме/навыки.\n"
                    "Проанализируй и верни строго JSON:\n"
                    "{\n"
                    '  "matches": [{"title": "...", "match_percent": 85, "hire_chance": 60, "matching_skills": ["..."], "missing_skills": ["..."]}, ...],\n'
                    '  "gaps": [{"skill": "...", "priority": "high|medium|low", "vacancies_count": 3}, ...],\n'
                    '  "common_themes": ["...", "..."],\n'
                    '  "recommendations": ["навык1", "навык2", "навык3"]\n'
                    "}\n"
                    "matches — для каждой понравившейся вакансии: процент совпадения навыков, совпавшие и недостающие навыки.\n"
                    "hire_chance — вероятность получить работу при текущем уровне навыков (0-100%).\n"
                    "gaps — все навыки, которые требуются вакансиями, но отсутствуют у пользователя, с приоритетом.\n"
                    "common_themes — общие тематики/направления среди понравившихся вакансий.\n"
                    "recommendations — топ-3 навыка для изучения для максимального покрытия вакансий."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Резюме пользователя:\n{resume_text}\n\n"
                    f"Навыки: {', '.join(skills) if skills else 'не указаны'}\n\n"
                    f"Понравившиеся вакансии:\n{favorites_text}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}
    # Normalize hire_chance in matches
    matches = data.get("matches", [])
    for m in matches:
        hc = m.get("hire_chance", 0)
        m["hire_chance"] = max(0, min(100, int(hc))) if isinstance(hc, (int, float)) else 0

    return {
        "matches": matches,
        "gaps": data.get("gaps", []),
        "common_themes": data.get("common_themes", []),
        "recommendations": data.get("recommendations", []),
    }


def generate_recommendations(
    resume_text: str,
    skills: list[str],
    hh_vacancies: list[dict],
    career_interests: list[str],
) -> dict:
    """Generate structured recommendations: skills_to_learn, courses, projects, career_directions."""
    vacancies_summary = "\n".join(
        f"- {v['title']} ({', '.join(v.get('key_skills', [])) or 'н/д'})"
        for v in hh_vacancies[:5]
    )
    interests = ", ".join(career_interests) if career_interests else "не указаны"

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — AI-карьерный консультант. На основе резюме, навыков, интересов и вакансий "
                    "сгенерируй рекомендации. Верни строго JSON:\n"
                    "{\n"
                    '  "skills_to_learn": ["навык1", "навык2", ...],\n'
                    '  "courses": [{"title": "...", "platform": "...", "url": "..."}, ...],\n'
                    '  "projects": [{"title": "...", "description": "..."}, ...],\n'
                    '  "career_directions": [{"title": "...", "description": "...", "match_percent": 85}, ...]\n'
                    "}\n"
                    "skills_to_learn — 5-8 навыков, которые стоит изучить.\n"
                    "courses — 3-5 конкретных курсов (Coursera, Stepik, Udemy и т.д.).\n"
                    "projects — 3-4 pet-проекта для портфолио.\n"
                    "career_directions — 3-4 карьерных направления с % совпадения."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Резюме:\n{resume_text}\n\n"
                    f"Навыки: {', '.join(skills) if skills else 'не указаны'}\n\n"
                    f"Карьерные интересы: {interests}\n\n"
                    f"Вакансии рынка:\n{vacancies_summary}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}
    return {
        "skills_to_learn": data.get("skills_to_learn", []),
        "courses": data.get("courses", []),
        "projects": data.get("projects", []),
        "career_directions": data.get("career_directions", []),
    }


def match_professions(resume_text: str, skills: list[str]) -> list[dict]:
    """Determine which professions match the user's resume."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — AI-карьерный аналитик. На основе резюме и навыков определи, "
                    "на какие профессии/должности подходит кандидат.\n"
                    "Верни строго JSON:\n"
                    "{\n"
                    '  "professions": [\n'
                    '    {"title": "Frontend-разработчик", "match_percent": 85, "description": "Почему подходит..."},\n'
                    "    ...\n"
                    "  ]\n"
                    "}\n"
                    "professions — 5-8 профессий, отсортированных по match_percent (от большего к меньшему).\n"
                    "match_percent — от 0 до 100, насколько резюме соответствует профессии.\n"
                    "description — 1-2 предложения, почему кандидат подходит или что нужно подтянуть."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Резюме:\n{resume_text}\n\n"
                    f"Навыки: {', '.join(skills) if skills else 'не указаны'}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}
    return data.get("professions", [])


def compare_with_market(
    resume_text: str, skills: list[str], hh_vacancies: list[dict]
) -> dict:
    """Compare user's resume against HH market requirements and return dashboard data."""
    vacancies_summary = "\n".join(
        f"- {v['title']} ({', '.join(v.get('key_skills', [])) or 'н/д'}) — {v.get('employer', '')}"
        for v in hh_vacancies[:10]
    )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — AI-аналитик резюме. Оцени резюме кандидата в сравнении с требованиями рынка "
                    "(вакансии с HeadHunter). Верни строго JSON:\n"
                    "{\n"
                    '  "overall_score": 78,\n'
                    '  "category_scores": {\n'
                    '    "content": 78,\n'
                    '    "structure": 88,\n'
                    '    "formatting": 72,\n'
                    '    "keywords": 65,\n'
                    '    "achievements": 70\n'
                    "  },\n"
                    '  "market_position": 22,\n'
                    '  "market_comparison": [\n'
                    '    {"axis": "Технические навыки", "user": 80, "market": 70},\n'
                    '    {"axis": "Опыт", "user": 60, "market": 75},\n'
                    '    {"axis": "Образование", "user": 85, "market": 70},\n'
                    '    {"axis": "Soft Skills", "user": 70, "market": 65},\n'
                    '    {"axis": "Достижения", "user": 50, "market": 60},\n'
                    '    {"axis": "Оформление", "user": 75, "market": 70}\n'
                    "  ],\n"
                    '  "strengths": [\n'
                    '    {"title": "Сильная сторона", "description": "Описание..."}\n'
                    "  ],\n"
                    '  "improvements": [\n'
                    '    {"title": "Что улучшить", "description": "Описание...", "priority": "high"}\n'
                    "  ]\n"
                    "}\n\n"
                    "overall_score — общая оценка резюме от 0 до 100.\n"
                    "category_scores — оценки по 5 категориям (0-100): content (содержание/опыт), "
                    "structure (структура), formatting (оформление), keywords (ключевые слова), "
                    "achievements (достижения).\n"
                    "market_position — позиция на рынке: число от 1 до 100 (Топ N% среди кандидатов).\n"
                    "market_comparison — 6 осей для радарной диаграммы: оценка кандидата (user) и средний "
                    "показатель рынка (market), оба 0-100.\n"
                    "strengths — 3-5 сильных сторон резюме.\n"
                    "improvements — 3-5 рекомендаций по улучшению с приоритетом (high/medium/low)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Резюме кандидата:\n{resume_text}\n\n"
                    f"Навыки: {', '.join(skills) if skills else 'не указаны'}\n\n"
                    f"Вакансии рынка (HeadHunter):\n{vacancies_summary}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}

    # Normalize category_scores
    cat_scores = data.get("category_scores", {})
    for key in ("content", "structure", "formatting", "keywords", "achievements"):
        val = cat_scores.get(key, 0)
        cat_scores[key] = max(0, min(100, int(val))) if isinstance(val, (int, float)) else 0

    # Normalize overall_score
    os_val = data.get("overall_score", 0)
    overall_score = max(0, min(100, int(os_val))) if isinstance(os_val, (int, float)) else 0

    # Normalize market_position
    mp_val = data.get("market_position", 50)
    market_position = max(1, min(100, int(mp_val))) if isinstance(mp_val, (int, float)) else 50

    return {
        "overall_score": overall_score,
        "category_scores": cat_scores,
        "market_position": market_position,
        "market_comparison": data.get("market_comparison", []),
        "strengths": data.get("strengths", []),
        "improvements": data.get("improvements", []),
    }


def score_candidates_for_vacancy(vacancy_text: str, candidates: list[dict]) -> list[dict]:
    """Score and sort candidates against a specific vacancy.

    Each candidate dict should have:
      - candidate_id: int
      - name: str
      - resume_text: str (compiled from profile + resumes)
      - skills: list[str]
      - ai_analysis: str (previous AI analysis summary, if available)

    Returns sorted list (highest score first) with:
      - candidate_id, name, score (0-100), reasoning, matching_skills, missing_skills
    """
    if not candidates:
        return []

    candidates_block = ""
    for i, c in enumerate(candidates, 1):
        candidates_block += (
            f"--- Кандидат {i} (ID: {c['candidate_id']}, Имя: {c['name']}) ---\n"
            f"Резюме:\n{c['resume_text']}\n"
            f"Навыки: {', '.join(c['skills']) if c['skills'] else 'не указаны'}\n"
        )
        if c.get("ai_analysis"):
            candidates_block += f"AI-анализ способностей:\n{c['ai_analysis']}\n"
        candidates_block += "\n"

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — Smart Recruiting Assistant. Тебе дана вакансия и список кандидатов.\n"
                    "Для каждого кандидата выполни детальную оценку по трём категориям с весами:\n\n"
                    "1. Hard Skills (вес 0.5) — соответствие tech stack, конкретных технологий и инструментов.\n"
                    "2. Experience (вес 0.3) — релевантный опыт работы, стаж, сложность проектов.\n"
                    "3. Soft Skills (вес 0.2) — коммуникация, командная работа, лидерство (по сигналам из резюме).\n\n"
                    "Итоговый compatibility_score = hard_skills_score * 0.5 + experience_score * 0.3 + soft_skills_score * 0.2\n\n"
                    "Верни строго JSON:\n"
                    "{\n"
                    '  "scored_candidates": [\n'
                    "    {\n"
                    '      "candidate_id": 1,\n'
                    '      "hard_skills_score": 80,\n'
                    '      "experience_score": 70,\n'
                    '      "soft_skills_score": 60,\n'
                    '      "compatibility_score": 74,\n'
                    '      "pro_arguments": "Почему кандидат подходит (1-3 предложения)",\n'
                    '      "matching_skills": ["Python", "FastAPI"],\n'
                    '      "missing_competencies": ["Docker", "Kubernetes"],\n'
                    '      "skill_gap_analysis": "Краткий анализ пробелов в навыках (1-2 предложения)",\n'
                    '      "recommendation": "invite"\n'
                    "    }\n"
                    "  ]\n"
                    "}\n\n"
                    "recommendation — одно из: \"invite\" (стоит пригласить), \"consider\" (стоит рассмотреть), \"reject\" (не подходит).\n"
                    "Все текстовые поля — на русском языке, кратко и конкретно.\n"
                    "Отсортируй scored_candidates по compatibility_score от большего к меньшему."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"## Вакансия\n{vacancy_text}\n\n"
                    f"## Кандидаты\n{candidates_block}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}

    scored = data.get("scored_candidates", [])

    def _clamp(val: object) -> int:
        return max(0, min(100, int(val))) if isinstance(val, (int, float)) else 0

    result = []
    for item in scored:
        hard = _clamp(item.get("hard_skills_score", 0))
        exp = _clamp(item.get("experience_score", 0))
        soft = _clamp(item.get("soft_skills_score", 0))
        compat = _clamp(item.get("compatibility_score", 0))
        # Fallback: compute weighted score if AI returned 0
        if compat == 0 and (hard or exp or soft):
            compat = round(hard * 0.5 + exp * 0.3 + soft * 0.2)

        result.append({
            "candidate_id": item.get("candidate_id"),
            "score": compat,
            "reasoning": item.get("pro_arguments", item.get("reasoning", "")),
            "matching_skills": item.get("matching_skills", []),
            "missing_skills": item.get("missing_competencies", item.get("missing_skills", [])),
            "hard_skills_score": hard,
            "experience_score": exp,
            "soft_skills_score": soft,
            "skill_gap_analysis": item.get("skill_gap_analysis", ""),
            "recommendation": item.get("recommendation", "consider"),
        })
    # Sort by score descending
    result.sort(key=lambda x: x["score"], reverse=True)
    return result
