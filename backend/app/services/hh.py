import httpx

HH_BASE = "https://api.hh.ru"


async def search_hh_vacancies(keywords: list[str], area: int = 1) -> list[dict]:
    """Search HeadHunter for vacancies matching keywords. area=1 is Moscow."""
    query = "+".join(keywords)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{HH_BASE}/vacancies",
            params={"text": query, "area": area, "per_page": 10},
            headers={"User-Agent": "CareerAI/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    vacancies = []
    for item in data.get("items", []):
        salary = item.get("salary")
        salary_str = None
        if salary:
            parts = []
            if salary.get("from"):
                parts.append(f"от {salary['from']}")
            if salary.get("to"):
                parts.append(f"до {salary['to']}")
            currency = salary.get("currency", "")
            salary_str = " ".join(parts) + f" {currency}" if parts else None

        vacancies.append(
            {
                "id": item["id"],
                "title": item["name"],
                "employer": item.get("employer", {}).get("name", ""),
                "salary": salary_str,
                "requirement": (item.get("snippet") or {}).get("requirement", ""),
                "responsibility": (item.get("snippet") or {}).get("responsibility", ""),
                "url": item.get("alternate_url", ""),
            }
        )
    return vacancies


async def get_vacancy_details(vacancy_id: str) -> dict:
    """Fetch full vacancy details including key_skills."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{HH_BASE}/vacancies/{vacancy_id}",
            headers={"User-Agent": "CareerAI/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "id": data["id"],
        "title": data["name"],
        "key_skills": [s["name"] for s in data.get("key_skills", [])],
        "description": data.get("description", ""),
    }
