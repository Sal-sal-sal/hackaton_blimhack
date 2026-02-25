import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, model_validator


class SkillItem(BaseModel):
    name: str
    level: str | None = None   # "junior" | "middle" | "senior" | "expert"
    years: int | None = None


class WorkExperienceItem(BaseModel):
    company: str
    role: str
    start: str          # "YYYY-MM"
    end: str | None     # "YYYY-MM" or null (current)
    description: str | None = None


class EducationItem(BaseModel):
    institution: str
    degree: str         # "BS" | "MS" | "PhD" | "Certificate"
    field: str | None = None
    year: int | None = None


class ResumeCreate(BaseModel):
    title: str
    is_public: bool = True
    skills: list[SkillItem] = []
    work_experience: list[WorkExperienceItem] = []
    education: list[EducationItem] = []
    desired_salary_min: Decimal | None = None
    desired_salary_max: Decimal | None = None

    @model_validator(mode="after")
    def salary_valid(self) -> "ResumeCreate":
        if self.desired_salary_min and self.desired_salary_max:
            if self.desired_salary_min > self.desired_salary_max:
                raise ValueError("desired_salary_min must be <= desired_salary_max")
        return self


class ResumeUpdate(BaseModel):
    title: str | None = None
    is_public: bool | None = None
    skills: list[SkillItem] | None = None
    work_experience: list[WorkExperienceItem] | None = None
    education: list[EducationItem] | None = None
    desired_salary_min: Decimal | None = None
    desired_salary_max: Decimal | None = None


class ResumeResponse(BaseModel):
    id: int
    candidate_profile_id: int
    title: str
    is_public: bool
    skills: list[Any]
    work_experience: list[Any]
    education: list[Any]
    desired_salary_min: Decimal | None
    desired_salary_max: Decimal | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
