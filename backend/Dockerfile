FROM node:22-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app/backend

COPY --from=ghcr.io/astral-sh/uv:0.5.31 /uv /uvx /bin/
COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
COPY backend/src ./src
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "ai_voice_coach.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/backend/src"]
