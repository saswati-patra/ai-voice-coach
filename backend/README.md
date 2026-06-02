# AI Voice Coach Backend

FastAPI backend for the AI Voice Coach learning project. This service owns the API, WebSocket voice session, DDD/application layers, and Google Cloud integration adapters.

## Structure

```text
src/ai_voice_coach/
  api/             FastAPI HTTP and WebSocket routes
  application/     Use cases and ports
  domain/          Domain entities and value objects
  infrastructure/  Memory and Google Cloud adapters
tests/             API, application, and infrastructure tests
```

## Local Development

```bash
uv sync
uv run pytest
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

The backend serves the local voice harness from `../frontend/static/index.html`.

## Configuration

Copy `.env.example` to `.env` for local overrides. Do not commit `.env` or Google Cloud credential files.

Stub mode is the default:

```bash
GOOGLE_CLOUD_ENABLED=false
```

To test Gemini Live locally, authenticate with Google Cloud Application Default Credentials and set:

```bash
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

## API

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/study-materials`
- `POST /api/v1/study-materials`
- `GET /api/v1/review-items`
- `WebSocket /api/v1/ws/voice-session`
