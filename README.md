# AI Voice Coach

Google Cloud-only AI voice study coach learning project.

## Repository Layout

```text
backend/          FastAPI backend, Python package, tests, Dockerfile
frontend/static/  Local browser voice harness
infra/terraform/  Terraform skeleton for future Google Cloud resources
```

The app runs locally in stub mode by default. Real Google Cloud calls stay disabled until `GOOGLE_CLOUD_ENABLED=true`.

## Backend

```bash
cd backend
uv sync
uv run pytest
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

Open <http://localhost:8000> for the browser voice harness.

## Docker

From the repo root:

```bash
docker compose build
docker compose up
```

Then check <http://localhost:8000/health>.

## Browser Voice Harness

The local page at <http://localhost:8000> connects to `/api/v1/ws/voice-session`, captures microphone audio, and streams `audio.chunk` events.

In stub mode, click **Connect**, then **Start Mic**. Stub mode logs received audio chunks but does not return playable audio.

For Gemini mode, complete the ADC setup below, set `GOOGLE_CLOUD_ENABLED=true`, then use the same page. The browser sends 16 kHz mono PCM16 chunks as base64 JSON and plays returned 24 kHz PCM16 audio chunks.

## Configuration

Copy `backend/.env.example` to `backend/.env` for local backend overrides. `.env` is ignored by git; only `.env.example` should be tracked. Do not commit Google Cloud credential files.

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
cp backend/.env.example backend/.env
```

Set these values in `backend/.env`:

```bash
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

Then run:

```bash
cd backend
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

## Terraform

Terraform lives in `infra/terraform`. Track `terraform.tfvars.example`; do not commit real `.tfvars` files or state.

```bash
terraform -chdir=infra/terraform fmt
terraform -chdir=infra/terraform validate
```

Terraform is currently a skeleton only; no Google Cloud resources are provisioned yet.

## API

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/study-materials`
- `POST /api/v1/study-materials`
- `GET /api/v1/review-items`
- `WebSocket /api/v1/ws/voice-session`
