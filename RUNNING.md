# Running The Cloud Setup

This runbook walks through the first Google Cloud setup for AI Voice Coach.

Use `gcloud` only for authentication and one-time project bootstrap. Use OpenTofu for managed cloud resources.

## 1. Verify Local Tools

```bash
gcloud version
tofu version
docker --version
uv --version
```

Install OpenTofu if needed:

```bash
brew install opentofu
```

## 2. Choose Project And Region

For an existing Google Cloud project:

```bash
export PROJECT_ID="your-google-cloud-project-id"
export REGION="us-central1"
```

For a new Google Cloud project:

```bash
export PROJECT_ID="ai-voice-coach-dev-saswati"
export REGION="us-central1"

gcloud projects create "$PROJECT_ID" --name="AI Voice Coach Dev Saswati"
```

If the project is new, link billing:

```bash
gcloud billing accounts list
gcloud billing projects link "$PROJECT_ID" --billing-account="YOUR_BILLING_ACCOUNT_ID"
```

## 3. Authenticate

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud auth application-default set-quota-project "$PROJECT_ID"
```

## 4. One-Time Bootstrap API

OpenTofu can manage most APIs, but Service Usage must be enabled first:

```bash
gcloud services enable serviceusage.googleapis.com --project "$PROJECT_ID"
```

## 5. Configure OpenTofu Variables

```bash
cp infra/tofu/terraform.tfvars.example infra/tofu/terraform.tfvars
```

Edit `infra/tofu/terraform.tfvars`:

```hcl
project_id  = "your-google-cloud-project-id"
region      = "us-central1"
environment = "dev"
```

Do not commit `infra/tofu/terraform.tfvars`.

## 6. Plan And Apply Cloud Foundation

```bash
tofu -chdir=infra/tofu init
tofu -chdir=infra/tofu fmt
tofu -chdir=infra/tofu validate
tofu -chdir=infra/tofu plan
tofu -chdir=infra/tofu apply
```

OpenTofu manages:

- Required Google Cloud APIs
- Firebase Auth foundation
- Firestore `(default)` database
- Study materials Cloud Storage bucket
- Artifact Registry Docker repository
- Backend service account
- Baseline IAM for Vertex AI, Firestore, Storage, Logging, and Secret Manager

If Firestore already exists in the project, import it before applying:

```bash
tofu -chdir=infra/tofu import \
  google_firestore_database.default \
  "projects/${PROJECT_ID}/databases/(default)"
```

## 7. Read OpenTofu Outputs

```bash
tofu -chdir=infra/tofu output
tofu -chdir=infra/tofu output -raw study_materials_bucket_name
tofu -chdir=infra/tofu output -raw firebase_project_id
tofu -chdir=infra/tofu output -raw backend_service_account_email
tofu -chdir=infra/tofu output -raw artifact_registry_repository_id
```

## 8. Configure Backend Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```bash
APP_ENV=local
APP_NAME=AI Voice Coach
AUTH_MODE=dev
DEV_USER_ID=dev-user
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_STORAGE_BUCKET=<value from tofu output study_materials_bucket_name>
FIREBASE_PROJECT_ID=<value from tofu output firebase_project_id>
FIREBASE_CHECK_REVOKED=false
FIRESTORE_DATABASE=(default)
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-native-audio
GEMINI_DOCUMENT_MODEL=gemini-2.5-flash
GEMINI_RESPONSE_MODALITIES=audio
GEMINI_SYSTEM_INSTRUCTION=You are an AI voice study coach. Ask concise questions, give gentle corrections, and revisit weak concepts.
```

Do not commit `backend/.env`.

## 9. Verify Backend Locally

```bash
cd backend
uv sync
uv run pytest
```

Expected:

```text
60 passed
```

Verify config:

```bash
PYTHONPATH=src uv run python - <<'PY'
from ai_voice_coach.config import get_settings

s = get_settings()
print("adapter_mode:", s.adapter_mode)
print("project:", s.google_cloud_project)
print("location:", s.google_cloud_location)
print("bucket:", s.google_cloud_storage_bucket)
print("auth mode:", s.auth_mode)
print("firebase project:", s.resolved_firebase_project_id)
print("live model:", s.gemini_live_model)
print("document model:", s.gemini_document_model)
PY
```

Expected:

```text
adapter_mode: google-cloud
location: us-central1
auth mode: dev
firebase project: your-google-cloud-project-id
live model: gemini-live-2.5-flash-native-audio
document model: gemini-2.5-flash
```

## 10. Run Backend

```bash
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

In another terminal:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"status":"ok","app_name":"AI Voice Coach","app_env":"local","adapter_mode":"google-cloud"}
```

## 11. Study Material Upload And Ingestion Smoke Test

Keep the backend running, then in another terminal:

```bash
printf "Photosynthesis notes" >/tmp/ai-voice-coach-notes.txt

UPLOAD_RESPONSE=$(curl -s \
  -F "title=Photosynthesis Notes" \
  -F "file=@/tmp/ai-voice-coach-notes.txt;type=text/plain" \
  http://localhost:8000/api/v1/study-materials/upload)

echo "$UPLOAD_RESPONSE"

MATERIAL_ID=$(python -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$UPLOAD_RESPONSE")

curl -s -X POST "http://localhost:8000/api/v1/study-materials/${MATERIAL_ID}/ingest"

curl -s http://localhost:8000/api/v1/study-materials
curl -s http://localhost:8000/api/v1/review-items
```

Expected:

- The upload response includes `storage_path`, `storage_bucket`, `original_filename`, and `size_bytes`.
- The ingest response has `ingestion_status` set to `completed`, plus `summary` and `key_concepts`.
- The list response includes the uploaded and ingested material.
- The review-items response includes concepts generated from the document.
- The Cloud Storage bucket contains the uploaded object.
- Firestore has metadata under `users/dev-user/study_materials/{material_id}`.

To test backend Firebase mode later, set `AUTH_MODE=firebase` and send
`Authorization: Bearer <Firebase ID token>` on REST requests. The voice WebSocket uses
`/api/v1/ws/voice-session?id_token=<Firebase ID token>`.

## 12. Browser Voice Check

Open:

```text
http://localhost:8000
```

Then:

- Click **Connect**
- Click **Start Mic**
- Speak a short phrase
- Watch the log and listen for a response

## 13. WebSocket Text Smoke Test

Keep the backend running, then in another terminal:

```bash
cd backend

PYTHONPATH=src uv run python - <<'PY'
import asyncio
import json
import websockets

async def main():
    async with websockets.connect("ws://localhost:8000/api/v1/ws/voice-session") as ws:
        print(await ws.recv())

        await ws.send(json.dumps({
            "type": "text.message",
            "payload": {"text": "Say hello as a friendly study coach in one short sentence."}
        }))

        for _ in range(8):
            message = await asyncio.wait_for(ws.recv(), timeout=30)
            print(message)
            if "coach.message" in message or "audio.chunk" in message:
                break

        await ws.send(json.dumps({"type": "session.stop", "payload": {}}))

asyncio.run(main())
PY
```

## 14. Docker Stub-Mode Check

Docker Compose still defaults to stub mode:

```bash
docker compose build
docker compose up -d
curl http://localhost:8000/health
docker compose down
```
