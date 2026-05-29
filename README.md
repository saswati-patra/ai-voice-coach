# AI Voice Coach

FastAPI backend for a Google Cloud-only AI voice study coach learning project.

The first milestone runs locally with stub adapters. The code is shaped around Google Cloud services, but real cloud calls stay disabled until `GOOGLE_CLOUD_ENABLED=true`.

## Local Setup

```bash
uv sync
uv run pytest
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
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
- `GEMINI_LIVE_MODEL`: Gemini Live model name used when Google Cloud mode is enabled
- `GEMINI_RESPONSE_MODALITIES`: comma-separated response modalities, default `audio,text`

## Gemini Live Local Setup

Stub mode is the default. To try the real Gemini Live gateway locally:

```bash
gcloud auth application-default login
cp .env.example .env
```

Set these values in `.env`:

```bash
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

Then run:

```bash
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

The voice WebSocket accepts JSON events at `/api/v1/ws/voice-session`.

Text test event:

```json
{"type":"text.message","payload":{"text":"Quiz me on photosynthesis."}}
```

Audio event:

```json
{
  "type": "audio.chunk",
  "payload": {
    "data": "base64-encoded-16khz-pcm-audio",
    "mime_type": "audio/pcm;rate=16000"
  }
}
```

## Initial API

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/study-materials`
- `POST /api/v1/study-materials`
- `GET /api/v1/review-items`
- `WebSocket /api/v1/ws/voice-session`
