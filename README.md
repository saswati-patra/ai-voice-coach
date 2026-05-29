# AI Voice Coach

FastAPI backend for a Google Cloud-only AI voice study coach learning project.

The first milestone runs locally with stub adapters. The code is shaped around Google Cloud services, but real cloud calls stay disabled until `GOOGLE_CLOUD_ENABLED=true`.

## Local Setup

```bash
uv sync
uv run pytest
uv run uvicorn ai_voice_coach.main:app --reload
```

Open <http://localhost:8000> for the minimal voice-session test page.

## Docker

```bash
docker compose build
docker compose up
```

Then check <http://localhost:8000/health>.

## Configuration

Copy `.env.example` to `.env` for local overrides. `.env` is ignored by git; only `.env.example` should be tracked. Do not commit Google Cloud credential files.

Key settings:

- `DEV_USER_ID`: fixed local development user, default `dev-user`
- `GOOGLE_CLOUD_ENABLED`: keeps real Google Cloud calls disabled by default
- `GOOGLE_CLOUD_PROJECT`: future Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: future Vertex AI location, default `us-central1`

## Initial API

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/study-materials`
- `POST /api/v1/study-materials`
- `GET /api/v1/review-items`
- `WebSocket /api/v1/ws/voice-session`
