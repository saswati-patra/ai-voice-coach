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

The backend serves the built React frontend from `../frontend/dist` when the frontend has been built.

## Configuration

Copy `.env.example` to `.env` for local overrides. Do not commit `.env` or Google Cloud credential files.

Stub mode is the default:

```bash
AUTH_MODE=dev
GOOGLE_CLOUD_ENABLED=false
```

To test Gemini Live locally, authenticate with Google Cloud Application Default Credentials and set:

```bash
AUTH_MODE=dev
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_STORAGE_BUCKET=your-study-materials-bucket
FIREBASE_PROJECT_ID=your-google-cloud-project-id
GEMINI_DOCUMENT_MODEL=gemini-2.5-flash
```

Set `AUTH_MODE=firebase` to require Firebase ID tokens on user-owned API routes. REST
clients must send `Authorization: Bearer <Firebase ID token>`. The voice WebSocket uses
`/api/v1/ws/voice-session?id_token=<Firebase ID token>`.

By default, Firebase tokens must come from Google account sign-in. Keep
`FIREBASE_ALLOWED_SIGN_IN_PROVIDER=google.com` unless you intentionally add another
provider later.

## API

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/study-materials`
- `POST /api/v1/study-materials`
- `POST /api/v1/study-materials/upload`
- `POST /api/v1/study-materials/{material_id}/ingest`
- `GET /api/v1/review-items`
- `WebSocket /api/v1/ws/voice-session`

In stub mode, study materials are stored in memory for the life of the process. In Google
Cloud mode, study material metadata is persisted in Firestore under
`users/{user_id}/study_materials/{material_id}`. Uploaded study documents are stored in
Cloud Storage and referenced from the Firestore metadata. Manual ingestion sends uploaded
PDF or UTF-8 text materials to Vertex Gemini, stores the summary/concepts on the material,
and creates review items.

Upload a document with:

```bash
curl -F "title=Chapter 1" -F "file=@/path/to/chapter-1.pdf;type=application/pdf" \
  http://localhost:8000/api/v1/study-materials/upload
```

Then ingest the uploaded material:

```bash
curl -X POST http://localhost:8000/api/v1/study-materials/{material_id}/ingest
```
