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
GOOGLE_CLOUD_STORAGE_BUCKET=your-study-materials-bucket
GEMINI_DOCUMENT_MODEL=gemini-2.5-flash
```

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
