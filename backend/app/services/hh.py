import httpx

HH_BASE = "https://api.hh.ru"


def _extract_name(obj: dict | None) -> str | None:
    """Extract 'name' from an HH dict-with-id-and-name, e.g. {"id": "1", "name": "Полный день"}."""
    if obj and isinstance(obj, dict):
        return obj.get("name")
    return None


def _format_salary(salary: dict | None) -> str | None:
    if not salary:
        return None
    parts = []
    if salary.get("from"):
        parts.append(f"от {salary['from']}")
    if salary.get("to"):
        parts.append(f"до {salary['to']}")
    currency = salary.get("currency", "")
    return " ".join(parts) + f" {currency}" if parts else None


async def search_hh_vacancies(keywords: list[str], area: int = 1, per_page: int = 10) -> list[dict]:
    """Search HeadHunter for vacancies matching keywords. area=1 is Moscow."""
    query = "+".join(keywords)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{HH_BASE}/vacancies",
            params={"text": query, "area": area, "per_page": per_page},
            headers={"User-Agent": "CareerAI/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    vacancies = []
    for item in data.get("items", []):
        employer_data = item.get("employer") or {}
        logo_urls = employer_data.get("logo_urls") or {}
        employer_logo = (
            logo_urls.get("240")
            or logo_urls.get("90")
            or logo_urls.get("original")
            or employer_data.get("logo_url")
        )

        area_data = item.get("area") or {}
        snippet = item.get("snippet") or {}
        address = item.get("address") or {}

        vacancies.append(
            {
                "id": item["id"],
                "title": item["name"],
                "employer": employer_data.get("name", ""),
                "employer_logo": employer_logo,
                "salary": _format_salary(item.get("salary")),
                "requirement": snippet.get("requirement", ""),
                "responsibility": snippet.get("responsibility", ""),
                "url": item.get("alternate_url", ""),
                "location": area_data.get("name"),
                # New fields from search results
                "experience": _extract_name(item.get("experience")),
                "schedule": _extract_name(item.get("schedule")),
                "employment": _extract_name(item.get("employment")),
                "address_raw": address.get("raw") if address else None,
                "has_test": item.get("has_test", False),
                "accept_temporary": item.get("accept_temporary", False),
            }
        )
    return vacancies


async def get_vacancy_details(vacancy_id: str) -> dict:
    """Fetch full vacancy details from HH — all useful fields."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{HH_BASE}/vacancies/{vacancy_id}",
            headers={"User-Agent": "CareerAI/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    # Professional roles
    prof_roles = [r.get("name", "") for r in data.get("professional_roles", []) if r.get("name")]

    # Languages
    languages = []
    for lang in data.get("languages", []):
        name = lang.get("name", "")
        level = _extract_name(lang.get("level"))
        languages.append(f"{name} ({level})" if level else name)

    # Driver license
    driver_license = [d.get("id", "") for d in data.get("driver_license_types", []) if d.get("id")]

    # Working schedule details
    working_days = [_extract_name(d) for d in data.get("working_days", []) if _extract_name(d)]
    working_time_intervals = [_extract_name(d) for d in data.get("working_time_intervals", []) if _extract_name(d)]
    working_time_modes = [_extract_name(d) for d in data.get("working_time_modes", []) if _extract_name(d)]
    work_format = [_extract_name(d) for d in data.get("work_format", []) if _extract_name(d)]
    work_schedule_by_days = [_extract_name(d) for d in data.get("work_schedule_by_days", []) if _extract_name(d)]
    working_hours = [_extract_name(d) for d in data.get("working_hours", []) if _extract_name(d)]

    # Address
    address_data = data.get("address") or {}
    address_raw = address_data.get("raw")

    # Contacts
    contacts = data.get("contacts")
    contacts_info = None
    if contacts:
        parts = []
        if contacts.get("name"):
            parts.append(contacts["name"])
        if contacts.get("email"):
            parts.append(contacts["email"])
        for phone in contacts.get("phones", []):
            formatted = phone.get("formatted")
            if formatted:
                parts.append(formatted)
        contacts_info = ", ".join(parts) if parts else None

    # Employment form (new HH field)
    employment_form = _extract_name(data.get("employment_form"))

    return {
        "id": data["id"],
        "title": data["name"],
        "description": data.get("branded_description") or data.get("description", ""),
        "key_skills": [s["name"] for s in data.get("key_skills", [])],
        # Salary
        "salary": _format_salary(data.get("salary")),
        # Conditions
        "experience": _extract_name(data.get("experience")),
        "schedule": _extract_name(data.get("schedule")),
        "employment": _extract_name(data.get("employment")),
        "employment_form": employment_form,
        "accept_temporary": data.get("accept_temporary", False),
        "has_test": data.get("has_test", False),
        # Location
        "location": _extract_name(data.get("area")),
        "address": address_raw,
        # Work format
        "work_format": work_format,
        "working_days": working_days,
        "working_time_intervals": working_time_intervals,
        "working_time_modes": working_time_modes,
        "work_schedule_by_days": work_schedule_by_days,
        "working_hours": working_hours,
        # Requirements
        "professional_roles": prof_roles,
        "languages": languages,
        "driver_license": driver_license,
        # Employer
        "employer": _extract_name(data.get("employer")),
        "url": data.get("alternate_url", ""),
        # Contacts
        "contacts": contacts_info,
        # Accessibility
        "accept_handicapped": data.get("accept_handicapped", False),
        "accept_kids": data.get("accept_kids", False),
        "accept_incomplete_resumes": data.get("accept_incomplete_resumes", False),
    }
