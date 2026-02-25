# Backend Documentation — WordFlow

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Core Concept — Dual Identity](#core-concept--dual-identity)
4. [Data Model](#data-model)
5. [Business Logic — Key Workflows](#business-logic--key-workflows)
6. [API Reference](#api-reference)
7. [Services — Implementation Details](#services--implementation-details)
8. [Database & Migrations](#database--migrations)
9. [Configuration](#configuration)
10. [Running Locally](#running-locally)
11. [Docker](#docker)
12. [Extending the Project](#extending-the-project)

---

> **See also:** [`POETRY_DOCS.md`](./POETRY_DOCS.md) — полное руководство по зависимостям, командам Poetry и работе с virtualenv.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Web Framework | **FastAPI** 0.115+ | Async HTTP, auto OpenAPI docs |
| ASGI Server | **Uvicorn** | Serves the FastAPI app |
| Database | **PostgreSQL 16** | Primary data store |
| ORM | **SQLAlchemy 2.0** (async) | Database access layer |
| DB Driver | **asyncpg** | High-performance async PostgreSQL driver |
| Migrations | **Alembic** | Schema versioning |
| Cache / Broker | **Redis 7** | Caching + Celery message broker |
| Task Queue | **Celery** | Background tasks (views counter flush) |
| Config | **pydantic-settings** | Typed settings from `.env` |
| Auth | **passlib + bcrypt** | Password hashing |
| AI Chat | **OpenAI SDK** (GPT-4o) | Streaming chat completions |
| Packaging | **Poetry** | Dependency management |
| Containerization | **Docker + Docker Compose** | Local and production |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── config.py                # Pydantic settings (.env)
│   ├── database.py              # SQLAlchemy async engine + session factory
│   ├── redis.py                 # Redis async client
│   ├── celery_app.py            # Celery instance
│   │
│   ├── api/                     # Route handlers (HTTP layer only, no SQL)
│   │   ├── auth.py              # POST /auth/register
│   │   ├── chat.py              # POST /api/chat  (GPT-4o SSE streaming)
│   │   ├── classes.py           # CRUD /api/classes
│   │   ├── chats.py             # /api/chats  (DMs + message history)
│   │   ├── likes.py             # POST /api/likes/toggle
│   │   ├── job_posts.py         # CRUD /api/job-posts + view tracking
│   │   ├── organizations.py     # CRUD /api/organizations
│   │   ├── candidates.py        # /api/candidates  (profile + resumes + surveys)
│   │   ├── employers.py         # /api/employers   (employer profile)
│   │   └── search.py            # GET /api/search/job-posts, /api/search/resumes
│   │
│   ├── models/                  # SQLAlchemy ORM table definitions
│   │   ├── user.py              # User + UserRole enum
│   │   ├── profile.py           # Profile 1:1 User — has optional org link
│   │   ├── candidate_profile.py # CandidateProfile 1:1 User (hiring domain)
│   │   ├── employer_profile.py  # EmployerProfile 1:1 User (hiring domain)
│   │   ├── organization.py      # Organization (standalone company entity)
│   │   ├── portfolio.py         # Portfolio item N:1 Profile
│   │   ├── resume.py            # Resume (JSONB + tsvector FTS)
│   │   ├── survey.py            # Survey + SurveyResult
│   │   ├── chat.py              # Chat + ChatParticipant (M:N join)
│   │   ├── message.py           # Message (sender SET NULL on user delete)
│   │   ├── class_.py            # Class (educational content post)
│   │   ├── job_post.py          # JobPost — vacancy (ARRAY tech_stack + tsvector)
│   │   └── like.py              # Like (polymorphic: 6 target types)
│   │
│   ├── schemas/                 # Pydantic request/response models
│   │   ├── user.py
│   │   ├── profile.py           # ProfileBrief (feed), ProfileResponse (full page)
│   │   ├── organization.py
│   │   ├── candidate.py         # CandidateProfile CRUD schemas
│   │   ├── employer.py          # EmployerProfile CRUD schemas
│   │   ├── resume.py            # Resume CRUD schemas + JSONB item schemas
│   │   ├── survey.py            # Survey + SurveyResult schemas
│   │   ├── chat.py
│   │   ├── class_.py
│   │   ├── job_post.py          # JobPostFeedItem + salary/tech_stack validator
│   │   └── like.py
│   │
│   └── services/                # Business logic — all DB/external calls
│       ├── auth.py              # register_user
│       ├── like.py              # toggle_like (3 patterns: apply/invite/standard)
│       ├── chat.py              # get_or_create_direct_chat, send_message
│       ├── class_.py            # list_classes (feed), CRUD
│       ├── job_post.py          # list_job_posts, track_view, CRUD
│       ├── organization.py      # create/get/update organization
│       ├── candidate.py         # candidate profile + resume CRUD + survey submit
│       ├── employer.py          # employer profile CRUD
│       └── search.py            # FTS: search_job_posts, search_resumes
│
├── alembic/versions/
│   ├── 001_create_users_table.py
│   ├── 002_social_platform_schema.py
│   ├── 003_wordflow_schema.py
│   └── 004_hiring_platform.py
│
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```

### Layer responsibilities

```
Request → api/ (HTTP) → services/ (business logic + DB) → models/ (ORM)
```

---

## Core Concept — Dual Identity

A single `User` can be **both a job seeker and an employer** simultaneously, using two separate role-specific profile tables:

```
User (role: candidate | employer)
 ├─ Profile                ← shared display data (name, avatar, bio, org link)
 │    └─ organization_id?  ← set for recruiters posting jobs
 │
 ├─ CandidateProfile?      ← age, profession title, city (hiring domain)
 │    └─ Resume[]           ← JSONB skills + tsvector FTS
 │
 └─ EmployerProfile?       ← organization link, job title (HR/CTO/etc.)
```

**Key rules:**
- `users.role` — default: `candidate`. Controls which profile type is primary.
- Both `CandidateProfile` and `EmployerProfile` can exist for the same user (unified identity).
- Posting job vacancies requires a `Profile.organization_id` (existing system) or `EmployerProfile.organization_id` (hiring domain).
- Liking a `JobPost` = submitting an application (Pattern A).
- Liking a `Resume` or `CandidateProfile` = sending a hiring invitation (Pattern B).

---

## Data Model

### Entity overview

```
User (role enum) ──── Profile (1:1)
                          ├─ organization_id? ──── Organization (1:N profiles, 1:N job_posts)
                          └─ portfolio_items[]

User ──── CandidateProfile (1:1)?
               └─ Resume[] (JSONB skills/experience/education + tsvector)
               └─ SurveyResult[]

User ──── EmployerProfile (1:1)?
               └─ organization_id? → Organization

User ─── ChatParticipant ─── Chat (M:N)
                                  └─ Message[]

User ──── Class[]          (authored educational content)
User ──── JobPost[]        (authored vacancies, via organization)
                                └─ tech_stack: ARRAY(Text) + tsvector

Like (polymorphic)
  target_type: "class" | "profile" | "message" | "job_post" | "resume" | "candidate_profile"
  target_id: points to the respective table (validated in service layer)

Survey (template) ──── SurveyResult[] (candidate answers + score)
```

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| email | varchar(320) | unique, indexed |
| hashed_password | varchar(1024) | bcrypt — **never in API response** |
| role | enum `userrole` | `candidate` / `employer`, default `candidate` |
| created_at | timestamptz | server default |

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| user_id | int FK → users | unique, CASCADE delete |
| display_name | varchar(100) | nullable |
| bio | text | nullable |
| avatar_url | varchar(2048) | nullable |
| organization_id | int FK → organizations | nullable, **SET NULL** — determines recruiter status |
| role | varchar(100) | nullable — job title at current org |
| created_at | timestamptz | |

`profile.is_recruiter` property: `True` when `organization_id IS NOT NULL`.

#### `candidate_profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| user_id | int FK → users | unique, CASCADE delete |
| title | varchar(200) | profession/desired job title, indexed |
| age | int | nullable |
| city | varchar(100) | nullable, indexed |
| created_at / updated_at | timestamptz | |

#### `employer_profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| user_id | int FK → users | unique, CASCADE delete |
| organization_id | int FK → organizations | nullable, **SET NULL** |
| job_title | varchar(100) | nullable — position (HR Manager, CTO, etc.) |
| created_at / updated_at | timestamptz | |

#### `organizations`
Standalone company entity. Profiles and EmployerProfiles link to it.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| name | varchar(255) | |
| description | text | nullable |
| website_url | varchar(2048) | nullable |
| logo_url | varchar(2048) | nullable |
| created_at | timestamptz | |

#### `portfolio_items`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| profile_id | int FK → profiles | CASCADE delete |
| title | varchar(255) | |
| description | text | nullable |
| url / cover_image_url | varchar(2048) | nullable |

#### `resumes`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| candidate_profile_id | int FK → candidate_profiles | CASCADE delete |
| title | varchar(255) | |
| is_public | bool | default `true` — only public resumes appear in search |
| skills | JSONB | `[{"name":"Python","level":"expert","years":5}]` |
| work_experience | JSONB | `[{"company":"Acme","role":"Dev","start":"2020-01","end":null,"description":"..."}]` |
| education | JSONB | `[{"institution":"MSU","degree":"BS","field":"CS","year":2019}]` |
| desired_salary_min | numeric(12,2) | nullable, B-tree indexed |
| desired_salary_max | numeric(12,2) | nullable, B-tree indexed |
| search_vector | tsvector | populated by trigger `resume_search_vector_update` |
| created_at / updated_at | timestamptz | |

**GIN indexes:** `search_vector` (FTS), `skills` (containment: `skills @> '[{"name":"Python"}]'`).
**Trigger weights:** title (A) > skill names (B) > work descriptions (C).

#### `surveys`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| title | varchar(255) | |
| description | text | nullable |
| questions | JSONB | `[{"id":1,"text":"...","type":"single","options":[...],"weight":1}]` |
| created_at | timestamptz | |

Question types: `single` / `multi` / `text` / `scale`.

#### `survey_results`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| candidate_profile_id | int FK → candidate_profiles | CASCADE delete |
| survey_id | int FK → surveys | **SET NULL** — preserve results if survey deleted |
| answers | JSONB | `[{"question_id":1,"answer":"3+yr"}]` |
| score | int | nullable — calculated by application |
| completed_at | timestamptz | |

#### `job_posts` ("Вилки")
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| author_id | int FK → users | CASCADE delete |
| organization_id | int FK → organizations | CASCADE delete |
| title | varchar(255) | |
| description | text | |
| requirements | text | nullable |
| tech_stack | text[] | `["Python","FastAPI","PostgreSQL"]` — GIN indexed |
| salary_min / salary_max | numeric(12,2) | nullable, B-tree indexed |
| views_count | bigint | atomic increment, server default 0 |
| search_vector | tsvector | populated by trigger `job_post_search_vector_update` |
| created_at / updated_at | timestamptz | |

**GIN indexes:** `search_vector` (FTS via `@@`), `tech_stack` (containment: `tech_stack @> ARRAY['Python']`).
**Trigger weights:** title (A) > tech_stack + description (B) > requirements (C).

#### `chats`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| created_at | timestamptz | |

#### `chat_participants`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| chat_id | int FK → chats | CASCADE delete |
| user_id | int FK → users | CASCADE delete |
| joined_at | timestamptz | |

Constraints: `UNIQUE(chat_id, user_id)` + composite index.

#### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| chat_id | int FK → chats | CASCADE delete |
| sender_id | int FK → users | **SET NULL** — message stays when user deleted |
| content | text | |
| created_at | timestamptz | |

`sender_id = NULL` → **system message** (e.g. application notification).

#### `classes`
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| author_id | int FK → users | CASCADE delete |
| title | varchar(255) | |
| body | text | |
| cover_image_url | varchar(2048) | nullable |
| created_at / updated_at | timestamptz | |

#### `likes` (polymorphic)
| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| user_id | int FK → users | CASCADE delete |
| target_type | enum `liketargettype` | 6 values (see below) |
| target_id | int | no DB FK — validated in service |
| created_at | timestamptz | |

`liketargettype` values: `class` / `profile` / `message` / `job_post` / `resume` / `candidate_profile`

**Indexes:**
- `UNIQUE(user_id, target_type, target_id)` — prevents duplicates, UPSERT conflict target
- `(target_type, target_id)` — fast count-likes-for-entity queries

---

## Business Logic — Key Workflows

### Pattern A — "Like as Application" (Candidate → JobPost)

When `POST /api/likes/toggle` is called with `target_type: "job_post"`:

```
toggle_like
  │
  ├─ target exists? (JobPost)
  ├─ already liked? → DELETE (unlike), no chat side-effect
  └─ not liked yet → _apply_to_job_post (single transaction)
        │
        ├─ INSERT like ON CONFLICT DO NOTHING RETURNING id
        │     ↳ if id is NULL → concurrent dup, abort silently
        │
        ├─ SELECT job_post.author_id  (recruiter)
        ├─ author == applicant? → skip chat (self-application)
        │
        ├─ find existing 1-on-1 chat (INTERSECT + count==2)
        ├─ if no chat → CREATE Chat + 2 ChatParticipants (flush)
        │
        └─ INSERT Message(sender_id=NULL, "Новый отклик на вакансию «X»")
              ↳ COMMIT
```

### Pattern B — "Like as Invitation" (Employer → Resume / CandidateProfile)

When `target_type: "resume"` or `"candidate_profile"`:

```
toggle_like
  └─ _invite_candidate (single transaction)
        │
        ├─ INSERT like ON CONFLICT DO NOTHING RETURNING id
        │
        ├─ Resolve candidate user_id:
        │     resume → JOIN candidate_profiles → user_id
        │     candidate_profile → SELECT user_id directly
        │
        ├─ employer == candidate? → skip (self-like)
        ├─ find/create 1-on-1 chat (same as Pattern A)
        │
        └─ INSERT Message(sender_id=NULL, "Работодатель заинтересовался вашим профилем")
              ↳ COMMIT
```

### Pattern C — Standard Like (Class / Profile / Message)

Simple `INSERT ON CONFLICT DO NOTHING` — no side effects. Returns updated count.

### Find-or-create chat (shared by both patterns)

```sql
-- Step 1: find chat_ids with both users
SELECT chat_id FROM chat_participants WHERE user_id = :a
INTERSECT
SELECT chat_id FROM chat_participants WHERE user_id = :b

-- Step 2: keep only direct chats (exactly 2 participants)
SELECT chat_id FROM chat_participants
WHERE chat_id IN (<above>)
GROUP BY chat_id HAVING COUNT(user_id) = 2
```

### Full-Text Search (tsvector)

Both `resumes` and `job_posts` have a `search_vector tsvector` column populated by DB triggers on `INSERT/UPDATE`.

```sql
-- Resume trigger extracts text from JSONB:
search_vector :=
  setweight(to_tsvector('russian', title), 'A') ||
  setweight(to_tsvector('russian', skill_names_from_jsonb), 'B') ||
  setweight(to_tsvector('russian', work_descriptions_from_jsonb), 'C')

-- JobPost trigger:
search_vector :=
  setweight(to_tsvector('russian', title), 'A') ||
  setweight(to_tsvector('russian', array_to_string(tech_stack, ' ')), 'B') ||
  setweight(to_tsvector('russian', description), 'B') ||
  setweight(to_tsvector('russian', requirements), 'C')
```

Search query: spaces → `&` operators for `to_tsquery`. Results ordered by `ts_rank`.

### Views counter

```python
# Atomic — no read-modify-write race:
UPDATE job_posts SET views_count = views_count + 1 WHERE id = ?
```

**High-traffic scaling (>5k views/s per post):** Redis `INCR` + Celery 30s bulk flush.

---

## API Reference

Full interactive docs: `http://localhost:8000/docs`

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |

### AI Chat (GPT-4o)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/` | Stream SSE response from GPT-4o |

### Classes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/classes/` | Feed (offset/limit), likes counts, author+profile |
| GET | `/api/classes/{id}` | Single class |
| POST | `/api/classes/` | Create class |
| PATCH | `/api/classes/{id}` | Update own class |
| DELETE | `/api/classes/{id}` | Delete own class |

### Job Posts ("Вилки")

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/job-posts/` | Feed — with org data, author, application counts |
| GET | `/api/job-posts/{id}` | Get one + **atomically increment views_count** |
| POST | `/api/job-posts/` | Create vacancy (must be org member) |
| PATCH | `/api/job-posts/{id}` | Update own vacancy |
| DELETE | `/api/job-posts/{id}` | Delete own vacancy |

Query params for feed: `offset`, `limit`, `organization_id` (filter by company).

**Create request:**
```json
{
  "organization_id": 1,
  "title": "Senior Python Developer",
  "description": "...",
  "requirements": "3+ years FastAPI",
  "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
  "salary_min": 150000,
  "salary_max": 250000
}
```

**Validation:** `salary_min <= salary_max` enforced by Pydantic `@model_validator`.

### Chats

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chats/direct/{other_user_id}` | Find or create 1-on-1 chat (idempotent) |
| POST | `/api/chats/{id}/messages` | Send message |
| GET | `/api/chats/{id}/messages` | Paginated history (oldest first) |

### Likes / Applications

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/likes/toggle` | Toggle like on any entity |

**Request:**
```json
{ "target_type": "job_post", "target_id": 42 }
```
**Response:**
```json
{ "liked": true, "likes_count": 13 }
```

| `target_type` | Effect |
|---------------|--------|
| `"job_post"` | Pattern A: application → auto-chat with recruiter |
| `"resume"` / `"candidate_profile"` | Pattern B: invitation → auto-chat with candidate |
| `"class"` / `"profile"` / `"message"` | Pattern C: simple like, no side effects |

### Organizations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/organizations/` | Create a company |
| GET | `/api/organizations/{id}` | Get company info |
| PATCH | `/api/organizations/{id}` | Update company info |

### Candidates

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/candidates/profile` | Create candidate profile |
| GET | `/api/candidates/profile` | Get own candidate profile |
| PATCH | `/api/candidates/profile` | Update own candidate profile |
| POST | `/api/candidates/resumes` | Create resume |
| PATCH | `/api/candidates/resumes/{id}` | Update resume |
| DELETE | `/api/candidates/resumes/{id}` | Delete resume |
| POST | `/api/candidates/surveys/submit` | Submit survey answers |

**Resume create/update payload:**
```json
{
  "title": "Python Backend Developer",
  "is_public": true,
  "skills": [{"name": "Python", "level": "expert", "years": 5}],
  "work_experience": [{"company": "Acme", "role": "Dev", "start": "2020-01", "end": null, "description": "..."}],
  "education": [{"institution": "MSU", "degree": "BS", "field": "CS", "year": 2019}],
  "desired_salary_min": 120000,
  "desired_salary_max": 200000
}
```

### Employers

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/employers/profile` | Create employer profile |
| GET | `/api/employers/profile` | Get own employer profile |
| PATCH | `/api/employers/profile` | Update own employer profile |

### Search (Full-Text)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search/job-posts?q=python` | FTS over job posts (title+tech_stack+description) |
| GET | `/api/search/resumes?q=fastapi` | FTS over public resumes (title+skills+work) |

Query params: `q` (required, min 2 chars), `offset`, `limit`.

Response includes `rank: float` — ts_rank relevance score.

---

## Services — Implementation Details

### N+1 Prevention

**Classes feed** — 4 DB queries total:
1. `SELECT classes LEFT JOIN like_counts_subquery` — posts + counts
2. `SELECT users WHERE id IN (...)` — authors (selectinload batch)
3. `SELECT profiles WHERE user_id IN (...)` — profiles (selectinload batch)
4. `SELECT organizations WHERE id IN (...)` — orgs (selectinload batch)

**Job posts feed** — 4 DB queries total (same structure).

**Critical:** Author profiles in feeds use `ProfileBrief` — a flat schema with `organization: OrganizationBrief | None` but **no** `portfolio_items`. `Profile.organization` must be explicitly loaded via `selectinload(Profile.organization)` — otherwise async SQLAlchemy raises `MissingGreenlet` on attribute access.

Use `ProfileResponse` (with `portfolio_items`) only on the full profile page where you explicitly `selectinload(Profile.portfolio_items)`.

### Race condition map

| Scenario | Solution |
|----------|---------|
| Duplicate like from concurrent requests | `INSERT ON CONFLICT DO NOTHING` (DB-level, atomic) |
| Duplicate job application / employer invitation | Same + `RETURNING id` check — no double chat creation |
| Duplicate direct chat creation | Transaction + INTERSECT subquery — second tx sees first's commit |
| View count lost update | `UPDATE SET views_count = views_count + 1` — row-level lock |

### Schema serialization gotchas

- `MissingGreenlet` — accessing an unloaded lazy relationship outside async context. Always use `selectinload` for any relationship you reference in response schemas.
- `create_employer_profile` / `update_employer_profile` reload the profile via `get_employer_profile` after commit to get the `organization` relationship loaded.
- `ResumeUpdate.model_dump()` already converts nested Pydantic models (SkillItem, etc.) to dicts — no extra `.model_dump()` needed on items.

---

## Database & Migrations

### Migration chain

| File | Description |
|------|-------------|
| `001_create_users_table.py` | `users` table |
| `002_social_platform_schema.py` | profiles, orgs (old), portfolio, chats, messages, classes, likes |
| `003_wordflow_schema.py` | Restructure orgs (standalone), add `job_posts`, extend enum with `job_post` |
| `004_hiring_platform.py` | Hiring platform: role enum, candidate/employer profiles, resumes (JSONB+tsvector), surveys, extend job_posts (tech_stack+tsvector), DB triggers, enum extension |

### Migration 004 details

- `userrole` enum: `candidate` / `employer` → added to `users.role`
- `candidate_profiles` table (user_id, title, age, city + indexes)
- `employer_profiles` table (user_id, organization_id SET NULL, job_title)
- `resumes` table (JSONB skills/work_experience/education + tsvector + GIN indexes)
- `surveys` table (JSONB questions)
- `survey_results` table (candidate FK CASCADE, survey FK SET NULL, JSONB answers)
- `job_posts`: added `tech_stack ARRAY(Text)` (GIN) + `search_vector tsvector` (GIN)
- `liketargettype`: added `resume` and `candidate_profile` values
- DB function `resume_search_vector_update()` — BEFORE INSERT/UPDATE trigger on resumes
- DB function `job_post_search_vector_update()` — BEFORE INSERT/UPDATE trigger on job_posts

> PostgreSQL does not allow removing enum values. Downgrade leaves `resume` and `candidate_profile` in the enum.

### Common Alembic commands

```bash
# Apply all migrations
alembic upgrade head

# New migration (from model changes)
alembic revision --autogenerate -m "add tags table"

# Roll back one step
alembic downgrade -1

# Show current state
alembic current && alembic history
```

> Always import new models in `app/models/__init__.py` so Alembic detects them.

### Index reference

| Table | Index | Purpose |
|-------|-------|---------|
| users | `email` UNIQUE | Login lookup |
| users | `role` | Filter by candidate/employer |
| profiles | `user_id` UNIQUE | Profile by user |
| profiles | `organization_id` | All profiles in a company |
| candidate_profiles | `user_id` UNIQUE | Candidate profile by user |
| candidate_profiles | `title`, `city` | Employer search by profession/location |
| employer_profiles | `user_id` UNIQUE | Employer profile by user |
| employer_profiles | `organization_id` | Employers in a company |
| organizations | — | PKs only |
| portfolio_items | `profile_id` | Portfolio for profile |
| resumes | `candidate_profile_id` | All resumes by candidate |
| resumes | `search_vector` GIN | Full-text search (`@@`) |
| resumes | `skills` GIN | JSONB containment (`@>`) |
| resumes | `desired_salary_min/max` | Salary range filter |
| surveys | — | PKs only |
| survey_results | `candidate_profile_id`, `survey_id` | Results lookup |
| chat_participants | `(chat_id, user_id)` UNIQUE | Prevent duplicates, fast lookup |
| chat_participants | `user_id` | All chats for a user |
| messages | `chat_id` | Messages in a chat |
| messages | `sender_id` | Messages by user |
| classes | `author_id` | Posts by author |
| job_posts | `author_id` | Posts by recruiter |
| job_posts | `organization_id` | Posts by company |
| job_posts | `search_vector` GIN | Full-text search (`@@`) |
| job_posts | `tech_stack` GIN | Array containment (`@>`) |
| job_posts | `salary_min/max` | Salary range filter |
| likes | `(user_id, target_type, target_id)` UNIQUE | Prevents duplicates, UPSERT target |
| likes | `(target_type, target_id)` | Count likes/applications per entity |

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | `redis://host:6379/0` |
| `SECRET_KEY` | Yes | Random string for token signing |
| `OPENAI_API_KEY` | Yes (AI chat) | OpenAI API key |
| `CORS_ORIGINS` | No | Comma-separated origins (default: localhost variants) |

---

## Running Locally

```bash
cd backend
poetry install
cp .env.example .env  # fill in values

alembic upgrade head

uvicorn app.main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Celery worker (views flush + other background tasks)

```bash
celery -A app.celery_app:celery worker --loglevel=info
```

---

## Docker

| Service | Port | Description |
|---------|------|-------------|
| `app` | `8000` | FastAPI server |
| `celery-worker` | — | Background task worker |
| `postgres` | `5432` | PostgreSQL 16 |
| `redis` | `6379` | Redis 7 |

```bash
docker-compose up --build -d
docker-compose exec app alembic upgrade head
docker-compose logs -f app
docker-compose down          # stop (data persists)
docker-compose down -v       # stop + wipe DB volumes
```

---

## Extending the Project

### Add a new endpoint

1. Create `app/services/your_feature.py` with business logic.
2. Create `app/api/your_feature.py` with `APIRouter`.
3. Register in `app/main.py`:
   ```python
   from app.api.your_feature import router as your_router
   app.include_router(your_router, prefix="/api")
   ```

### Add a new model + migration

1. Create `app/models/your_model.py` extending `Base`.
2. Import in `app/models/__init__.py`.
3. `alembic revision --autogenerate -m "add your_model"` + `alembic upgrade head`.

### Add JWT authentication

Hashing is in place. Steps to complete:
1. `poetry add python-jose[cryptography]`
2. Create `app/services/token.py` — `create_access_token` / `decode_token`.
3. Add `POST /auth/login` returning `{ access_token, token_type }`.
4. Create `get_current_user: User = Depends(...)` FastAPI dependency.
5. Replace placeholder `get_current_user_id()` in all `api/` files.

### Add a new likeable entity

1. Add value to `LikeTargetType` in `app/models/like.py`.
2. Add model to `model_map` in `services/like.py → _validate_target`.
3. If it needs special business logic on like, add a handler in `services/like.py` and route it in `toggle_like`.
4. Migration: `op.execute("ALTER TYPE liketargettype ADD VALUE IF NOT EXISTS '...'")`.

### Switch views counter to Redis (high traffic)

1. In `services/job_post.py → track_view`: `await redis_client.incr(f"job_post:views:{id}")`
2. Add Celery beat task to bulk-flush Redis counts to Postgres every 30s.
3. Register in `celery_app.py` beat schedule.

### Add JSONB skill-based resume filtering

```python
# In services/candidate.py search_resumes:
if skill:
    stmt = stmt.where(
        Resume.skills.op("@>")(f'[{{"name": "{skill}"}}]')
    )
```

GIN index on `resumes.skills` makes this ~ms even on millions of rows.
