FROM python:3.12-slim-bookworm

# Create a non-root user and group
RUN groupadd --gid 1001 appuser && useradd --uid 1001 --gid 1001 -ms /bin/bash appuser

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN mkdir backend

RUN chown -R appuser:appuser /app

USER appuser

RUN uv venv

ENV PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock* ./

RUN uv sync --frozen --no-cache

COPY . ./backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]