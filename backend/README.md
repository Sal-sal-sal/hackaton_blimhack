# Backend Template

FastAPI + SQLAlchemy + Alembic + PostgreSQL + Redis + Celery

## Stack

- **FastAPI** — async web framework
- **SQLAlchemy 2.0** — async ORM (asyncpg driver)
- **Alembic** — database migrations
- **PostgreSQL** — primary database
- **Redis** — caching & Celery broker
- **Celery** — background task queue
- **Pydantic Settings** — configuration management
- **Docker Compose** — container orchestration

## Quick Start

```bash
# Copy env file
cp .env.example .env

# Start all services
docker-compose up --build

# Run migrations (in another terminal)
docker-compose exec app alembic upgrade head

# Test registration
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'
```

## Development

```bash
# Install dependencies
poetry install

# Run locally (requires running Postgres & Redis)
uvicorn app.main:app --reload

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
