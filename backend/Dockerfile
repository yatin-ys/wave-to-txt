FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN mkdir backend

RUN uv venv

ENV PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock* ./

RUN uv sync --frozen --no-cache

COPY . ./backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]