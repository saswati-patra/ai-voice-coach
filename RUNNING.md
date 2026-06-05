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

The OpenTofu Google providers use the same project for `billing_project` and
`user_project_override`, so Application Default Credentials must have the quota
project set to `PROJECT_ID`.

Before applying Firebase resources for the first time, open the
[Firebase console](https://console.firebase.google.com/) while signed in with
the same Google account and accept the Firebase Terms of Service. If the console
requires creating a temporary Firebase project to accept the terms, create one
and delete it afterward. Do not manually add Firebase to this project unless you
intend to import that resource into OpenTofu state.

## 4. One-Time Bootstrap API

OpenTofu can manage most APIs, but Service Usage and Cloud Resource Manager
must be enabled first:

```bash
gcloud services enable \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project "$PROJECT_ID"
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
- Firebase Web App config
- Firebase Hosting site
- Firestore `(default)` database
- Study materials Cloud Storage bucket
- Artifact Registry Docker repository
- Backend service account
- GitHub Actions Workload Identity Federation and deployer service account
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
tofu -chdir=infra/tofu output -json firebase_frontend_env
tofu -chdir=infra/tofu output -raw backend_service_account_email
tofu -chdir=infra/tofu output -raw artifact_registry_repository_id
tofu -chdir=infra/tofu output -json github_actions_variables
```

## 8. Configure GitHub Actions Deployment

The repository deploys through GitHub Actions using Google Cloud Workload
Identity Federation. No service account JSON key is needed.

After `tofu apply`, sync OpenTofu outputs into GitHub repository variables:

```bash
scripts/sync-github-actions-vars.sh
```

You can inspect the synced variables with:

```bash
gh variable list
```

The deployment workflow is `.github/workflows/deploy.yml`. It runs on pushes to
`main` and can also be started manually:

```bash
gh workflow run deploy.yml
gh run watch
```

The workflow:

- Runs backend tests and a frontend build check.
- Builds and pushes the backend image to Artifact Registry.
- Deploys the backend to Cloud Run with Firebase auth and Google Cloud mode on.
- Uses the Cloud Run URL to build the hosted React frontend.
- Deploys `frontend/dist` to Firebase Hosting.

## 9. Configure Backend Environment

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

## 10. Configure Frontend Environment

```bash
cd frontend
cp .env.example .env
```

For `AUTH_MODE=dev`, Firebase values can stay blank. For `AUTH_MODE=firebase`, copy
the values from:

```bash
tofu -chdir=../infra/tofu output -json firebase_frontend_env
```

Use this local frontend shape when the backend is running on port 8000 and Vite
is proxying `/api` and `/health`:

```env
VITE_AUTH_MODE=firebase
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

Use Cloud Run URLs only after the backend is deployed on a different origin:

```env
VITE_AUTH_MODE=firebase
VITE_API_BASE_URL=https://your-cloud-run-url
VITE_WS_BASE_URL=wss://your-cloud-run-url
```

Install and build:

```bash
npm install
npm run build
```

## 11. Verify Backend Locally

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

## 12. Run Backend

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

## 13. Run React Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Vite proxies `/api` and `/health` to the backend on port 8000.

The frontend shows the active auth mode, API target, WebSocket target, and
Firebase config status. In Firebase mode, upload, ingest, refresh, and voice
session actions are disabled until a Firebase user is signed in.

## 14. Study Material Upload And Ingestion Smoke Test

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

## 15. Browser Voice Check

Open:

```text
http://localhost:5173
```

Then:

- Click **Connect**
- Click **Start Mic**
- Speak a short phrase
- Watch the log and listen for a response

## 16. WebSocket Text Smoke Test

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

## 17. Docker Stub-Mode Check

Docker Compose still defaults to stub mode:

```bash
docker compose build
docker compose up -d
curl http://localhost:8000/health
docker compose down
```

If port `8000` is already in use locally, publish the container on another host port:

```bash
API_PORT=8001 docker compose up -d
curl http://localhost:8001/health
docker compose down
```

## 18. End-Of-Day Shutdown

Use these steps when you are done learning for the day.

### Stop Local Servers

If you started FastAPI or Vite in terminal windows, press `Ctrl+C` in each
terminal:

- FastAPI backend: `uv run uvicorn ...`
- React frontend: `npm run dev`

If you lost the terminal window, find the local listeners and stop the matching
process IDs:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
kill <PID>
```

### Stop Docker Compose

From the repo root:

```bash
docker compose down
```

If you used an alternate port, the same command still stops the stack:

```bash
API_PORT=8001 docker compose down
```

### Leave Cloud In Low-Cost Mode

Cloud Run has no always-on server when minimum instances is `0`; it scales down
when idle. Keep it capped for learning:

```bash
export PROJECT_ID="ai-voice-coach-dev-saswati"
export REGION="us-central1"
export CLOUD_RUN_SERVICE="$(tofu -chdir=infra/tofu output -raw cloud_run_service_name)"

gcloud run services update "$CLOUD_RUN_SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --min-instances=0 \
  --max-instances=1
```

Firebase Hosting is static hosting, so there is no running server to stop.
Firestore and Cloud Storage are data services; do not delete them for a normal
end-of-day shutdown.

### Optional: Take The Cloud Backend Offline

Only do this if you want the hosted API unavailable until the next deploy. The
next GitHub Actions deployment recreates the Cloud Run service.

```bash
gcloud run services delete "$CLOUD_RUN_SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION"
```

### Optional: Cancel A Running Deployment

If a GitHub Actions deployment is still running:

```bash
gh run list --workflow deploy.yml --limit 5
gh run cancel <run-id>
```
