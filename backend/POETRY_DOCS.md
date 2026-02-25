# Poetry — Dependency Management

## Что такое Poetry

Poetry — менеджер зависимостей и упаковщик для Python.
Он заменяет `pip + virtualenv + setup.py` одним инструментом.

В этом проекте используется режим `package-mode = false` — библиотека не публикуется, просто управление зависимостями.

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `pyproject.toml` | Декларация зависимостей и метаданных проекта |
| `poetry.lock` | Зафиксированные точные версии всех пакетов (включая транзитивные) |

> **Правило:** `pyproject.toml` редактируется руками или через `poetry add`.
> `poetry.lock` — **никогда не редактируется руками**, только `poetry lock` / `poetry update`.

---

## Структура `pyproject.toml`

```toml
[tool.poetry]
name = "backend"
version = "0.1.0"
description = "..."
package-mode = false          # не пакет-библиотека, просто проект

[tool.poetry.dependencies]    # runtime-зависимости
python = "^3.11"
...

[tool.poetry.group.dev.dependencies]  # только для разработки
pytest = "^8.0.0"
...
```

---

## Зависимости — полный разбор

### Runtime (`[tool.poetry.dependencies]`)

#### Web & ASGI

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `fastapi` | 0.115.14 | Async web framework. Маршруты, валидация, OpenAPI-документация автоматически |
| `uvicorn[standard]` | 0.34.3 | ASGI-сервер. `[standard]` добавляет `watchfiles` (hot-reload), `websockets` |
| `starlette` | 0.46.2 | Транзитивная зависимость FastAPI — HTTP primitives, middleware |

#### База данных

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `sqlalchemy[asyncio]` | 2.0.46 | ORM + query builder. `[asyncio]` добавляет async-движок. Версия 2.x обязательна — синтаксис моделей (`Mapped`, `mapped_column`) отличается от 1.x |
| `asyncpg` | 0.30.0 | Async PostgreSQL driver. Самый быстрый Python-драйвер для PG. SQLAlchemy использует его под капотом |
| `alembic` | 1.18.4 | Миграции БД. Читает модели SQLAlchemy и генерирует SQL DDL |
| `greenlet` | 3.3.2 | Транзитивная зависимость SQLAlchemy asyncio |

#### Redis & Celery

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `redis[hiredis]` | 5.3.1 | Async Redis-клиент. `[hiredis]` — C-парсер протокола, в ~10x быстрее pure Python |
| `hiredis` | 3.3.0 | C-extension для парсинга Redis RESP protocol |
| `celery[redis]` | 5.6.2 | Очередь фоновых задач. `[redis]` — backend + broker через Redis |
| `kombu` | 5.6.2 | Транзитивная — абстракция очередей для Celery |
| `billiard` | 4.2.4 | Транзитивная — форк `multiprocessing` для Celery workers |

#### Конфигурация & Валидация

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `pydantic-settings` | 2.13.1 | Загружает `.env` в типизированные Pydantic-классы. Используется в `app/config.py` |
| `pydantic` | 2.12.5 | Транзитивная — валидация данных, основа FastAPI-схем |
| `pydantic-core` | 2.41.5 | Транзитивная — Rust-ядро Pydantic v2 |
| `python-dotenv` | 1.2.1 | Транзитивная — загрузка `.env` файлов |

#### Аутентификация

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `passlib[bcrypt]` | 1.7.4 | Хэширование паролей. `[bcrypt]` — алгоритм bcrypt. Используется в `services/auth.py` |
| `bcrypt` | 4.3.0 | C-реализация bcrypt. passlib использует её для хэширования |

#### Валидация данных

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `email-validator` | 2.3.0 | Проверка формата email для Pydantic `EmailStr` |
| `dnspython` | 2.8.0 | Транзитивная — DNS lookup для email-validator |

#### AI / External APIs

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `openai` | 2.23.0 | Клиент OpenAI API. Используется в `api/chat.py` для GPT-4o streaming |
| `httpx` | 0.28.1 | Транзитивная для OpenAI SDK — async HTTP-клиент |
| `anyio` | 4.12.1 | Транзитивная — async primitives |

---

### Dev (`[tool.poetry.group.dev.dependencies]`)

| Пакет | Версия (lock) | Зачем |
|-------|--------------|-------|
| `pytest` | 8.4.2 | Test framework |
| `pytest-asyncio` | 0.24.0 | Поддержка `async def test_*` функций в pytest |
| `httpx` | 0.28.1 | HTTP-клиент для тестирования FastAPI через `TestClient` / `AsyncClient` |

---

## Основные команды

### Установка

```bash
# Установить все зависимости (runtime + dev)
poetry install

# Только runtime, без dev (для Docker production)
poetry install --only main
```

### Добавление зависимостей

```bash
# Runtime-зависимость
poetry add fastapi

# С extras
poetry add "uvicorn[standard]"

# Конкретная версия
poetry add "sqlalchemy>=2.0,<3.0"

# Dev-зависимость
poetry add --group dev pytest-asyncio

# Установить уже добавленную зависимость
poetry install
```

### Удаление

```bash
poetry remove package-name
poetry remove --group dev package-name
```

### Обновление

```bash
# Обновить всё (в рамках ограничений из pyproject.toml)
poetry update

# Обновить конкретный пакет
poetry update sqlalchemy

# Только обновить lock-файл без установки
poetry lock
```

### Просмотр

```bash
# Все установленные пакеты
poetry show

# Дерево зависимостей
poetry show --tree

# Только top-level (без транзитивных)
poetry show --top-level

# Проверить устаревшие
poetry show --outdated
```

### Запуск команд в virtualenv

```bash
# Запустить команду через Poetry (использует его venv)
poetry run python app/main.py
poetry run uvicorn app.main:app --reload
poetry run alembic upgrade head
poetry run pytest

# Войти в shell с активированным venv
poetry shell
```

### Экспорт в requirements.txt (для CI/CD или Docker без Poetry)

```bash
# Только runtime
poetry export -f requirements.txt --output requirements.txt --without-hashes

# С dev
poetry export -f requirements.txt --output requirements-dev.txt --with dev
```

---

## Как работает virtualenv в Poetry

Poetry создаёт venv автоматически при `poetry install`.

```bash
# Где находится venv
poetry env info

# Список virtualenvs для проекта
poetry env list

# Удалить venv (пересоздать с нуля)
poetry env remove python
poetry install
```

По умолчанию venv создаётся в:
- Windows: `C:\Users\<user>\AppData\Local\pypoetry\Cache\virtualenvs\`
- Linux/Mac: `~/.cache/pypoetry/virtualenvs/`

---

## Docker и Poetry

В `Dockerfile` Poetry используется без venv (зависимости ставятся глобально):

```dockerfile
RUN pip install poetry
RUN poetry config virtualenvs.create false  # не создавать venv в Docker
COPY pyproject.toml poetry.lock ./
RUN poetry install --only main              # только runtime, без dev
```

Это стандартная практика для контейнеров — venv внутри Docker избыточен.

---

## Добавить зависимость — пошагово

**Пример: добавить JWT (`python-jose`)**

```bash
# 1. Добавить
poetry add "python-jose[cryptography]"

# 2. Убедиться что появилось в pyproject.toml
grep jose pyproject.toml

# 3. Проверить установку
poetry run python -c "import jose; print(jose.__version__)"

# 4. Если в Docker — пересобрать
docker-compose up --build
```

---

## Управление версиями Python

```bash
# Посмотреть текущий Python
poetry run python --version

# Указать Python для проекта (если несколько установлено)
poetry env use python3.11

# Проверить совместимость с pyproject.toml
poetry check
```

---

## Полный список установленных пакетов (актуально на 2026-02)

```
alembic          1.18.4   Миграции БД
amqp             5.3.1    AMQP protocol (Celery dep)
annotated-types  0.7.0    Pydantic dep
anyio            4.12.1   Async primitives
asyncpg          0.30.0   PostgreSQL async driver
bcrypt           4.3.0    Password hashing
billiard         4.2.4    Celery multiprocessing
celery           5.6.2    Background task queue
certifi          2026.1.4 SSL certs
click            8.3.1    CLI framework (Celery/Uvicorn dep)
colorama         0.4.6    Terminal colors (Windows)
distro           1.9.0    OS detection (OpenAI dep)
dnspython        2.8.0    DNS (email-validator dep)
email-validator  2.3.0    Pydantic EmailStr validation
fastapi          0.115.14 Web framework
greenlet         3.3.2    SQLAlchemy asyncio dep
h11              0.16.0   HTTP/1.1 parser (uvicorn dep)
hiredis          3.3.0    Redis C parser
httpcore         1.0.9    HTTP primitives (httpx dep)
httptools        0.7.1    Fast HTTP parser (uvicorn dep)
httpx            0.28.1   Async HTTP client (tests + openai)
idna             3.11     IDN encoding
iniconfig        2.3.0    pytest dep
jiter            0.13.0   Fast JSON (pydantic dep)
kombu            5.6.2    Message queue abstraction (celery dep)
mako             1.3.10   Template engine (alembic dep)
markupsafe       3.0.3    HTML escaping (mako dep)
openai           2.23.0   OpenAI API client
packaging        26.0     Version parsing
passlib          1.7.4    Password hashing abstraction
pluggy           1.6.0    pytest dep
prompt-toolkit   3.0.52   CLI REPL (celery dep)
pydantic         2.12.5   Data validation
pydantic-core    2.41.5   Pydantic Rust core
pydantic-settings 2.13.1  .env → typed settings
pygments         2.19.2   Syntax highlighting
pyjwt            2.11.0   JWT (redis dep)
pytest           8.4.2    Test framework [dev]
pytest-asyncio   0.24.0   Async test support [dev]
python-dateutil  2.9.0    Date parsing (celery dep)
python-dotenv    1.2.1    .env loading
pyyaml           6.0.3    YAML parsing (celery dep)
redis            5.3.1    Redis client
six              1.17.0   Compat lib (dateutil dep)
sniffio          1.3.1    Async lib detection
sqlalchemy       2.0.46   ORM
starlette        0.46.2   ASGI framework (fastapi dep)
tqdm             4.67.3   Progress bars (openai dep)
typing-extensions 4.15.0  Type hints backport
typing-inspection 0.4.2   Pydantic dep
tzdata           2025.3   Timezone data
tzlocal          5.3.1    Local timezone (celery dep)
uvicorn          0.34.3   ASGI server
vine             5.1.0    Promise library (celery dep)
watchfiles       1.1.1    File watching (uvicorn hot-reload)
wcwidth          0.6.0    Terminal width (prompt-toolkit dep)
websockets       16.0     WebSockets (uvicorn dep)
```

---

## Troubleshooting

### `poetry install` не находит Python 3.11

```bash
# Указать путь явно
poetry env use /usr/bin/python3.11
poetry install
```

### Конфликт версий при `poetry add`

```bash
# Посмотреть почему пакет заблокирован
poetry show --tree package-name

# Попробовать обновить всё вместе
poetry update
```

### `ModuleNotFoundError` при запуске

```bash
# Вы запускаете python напрямую, не через Poetry venv
# Правильно:
poetry run python ...
# или войдите в shell:
poetry shell
python ...
```

### Пересоздать lock-файл

```bash
rm poetry.lock
poetry lock
poetry install
```
