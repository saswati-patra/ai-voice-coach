# AI Voice Coach

Google Cloud-only AI voice study coach learning project.

## Repository Layout

```text
backend/          FastAPI backend, Python package, tests, Dockerfile
frontend/         React/Vite multi-page frontend with Firebase Auth Google sign-in and voice harness
infra/tofu/       OpenTofu for Google Cloud foundation resources
.github/          GitHub Actions cloud deployment workflow
```

The app runs locally in stub mode by default. Real Google Cloud calls stay disabled until `GOOGLE_CLOUD_ENABLED=true`.

For the step-by-step cloud setup runbook, see [RUNNING.md](RUNNING.md).

## Backend

```bash
cd backend
uv sync
uv run pytest
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

Open <http://localhost:8000> for the built frontend if `frontend/dist` exists.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Run the backend on port 8000, then open <http://localhost:5173>. Vite proxies `/api` and `/health` to FastAPI.

## Docker

From the repo root:

```bash
docker compose build
docker compose up
```

Then check <http://localhost:8000/health>. If port `8000` is already in use, run with `API_PORT=8001 docker compose up` and check <http://localhost:8001/health>.

## Browser App

The React app provides Dashboard, Study, Review, Voice, and Cloud pages built with Tailwind CSS, local shadcn-style UI primitives, and Base UI tabs.

It includes Google account sign-in through Firebase Auth, study material upload/ingestion controls, review items, and the microphone voice harness.

In stub mode, the app works without Firebase config. For Firebase mode, set `VITE_AUTH_MODE=firebase`, fill `frontend/.env` with the Firebase Web App values from OpenTofu, and set backend `AUTH_MODE=firebase`.

For Gemini mode, complete the ADC setup below and set `GOOGLE_CLOUD_ENABLED=true`. The browser sends 16 kHz mono PCM16 chunks as base64 JSON and plays returned 24 kHz PCM16 audio chunks.

## Configuration

Copy `backend/.env.example` to `backend/.env` for local backend overrides. `.env` is ignored by git; only `.env.example` should be tracked. Do not commit Google Cloud credential files.

Key settings:

- `AUTH_MODE`: `dev` by default; use `firebase` to require Firebase ID tokens
- `DEV_USER_ID`: fixed local development user, default `dev-user`
- `GOOGLE_CLOUD_ENABLED`: keeps real Google Cloud calls disabled by default
- `GOOGLE_CLOUD_PROJECT`: future Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: future Vertex AI location, default `us-central1`
- `FIREBASE_PROJECT_ID`: Firebase project for token verification, defaults to `GOOGLE_CLOUD_PROJECT`
- `FIREBASE_ALLOWED_SIGN_IN_PROVIDER`: default `google.com`; rejects non-Google Firebase sign-in providers
- `GEMINI_LIVE_MODEL`: Gemini Live model name used when Google Cloud mode is enabled
- `GEMINI_RESPONSE_MODALITIES`: response modality for Gemini Live, default `audio`

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

## OpenTofu

OpenTofu lives in `infra/tofu`. Track `terraform.tfvars.example`; do not commit real `.tfvars` files or state.

Manual bootstrap before the first apply:

```bash
export PROJECT_ID="your-google-cloud-project-id"
gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud auth application-default set-quota-project "$PROJECT_ID"
gcloud services enable \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project "$PROJECT_ID"
```

Create local variables:

```bash
cp infra/tofu/terraform.tfvars.example infra/tofu/terraform.tfvars
```

Set `project_id`, `google_oauth_client_id`, and `google_oauth_client_secret` in
`infra/tofu/terraform.tfvars`, then run:

```bash
tofu -chdir=infra/tofu init
tofu -chdir=infra/tofu fmt
tofu -chdir=infra/tofu validate
tofu -chdir=infra/tofu plan
tofu -chdir=infra/tofu apply
```

OpenTofu manages the dev cloud foundation: APIs, Firebase Auth foundation, Firebase Hosting, Firestore, Cloud Storage, Artifact Registry, backend and GitHub Actions service accounts, Workload Identity Federation, and baseline IAM.

GitHub Actions deploys the app after OpenTofu provisions Workload Identity Federation and the deployer service account:

```bash
tofu -chdir=infra/tofu apply
scripts/sync-github-actions-vars.sh
gh workflow run deploy.yml
```

After apply, configure the backend and frontend with the OpenTofu outputs:

```bash
cp backend/.env.example backend/.env
```

Set:

```bash
AUTH_MODE=dev
GOOGLE_CLOUD_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_STORAGE_BUCKET=<value from tofu output study_materials_bucket_name>
FIREBASE_PROJECT_ID=<value from tofu output firebase_project_id>
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-native-audio
GEMINI_DOCUMENT_MODEL=gemini-2.5-flash
```

Use `tofu -chdir=infra/tofu output -json firebase_frontend_env` for the frontend Firebase values.

For local Vite testing with Firebase auth:

```env
VITE_AUTH_MODE=firebase
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

When `AUTH_MODE=firebase`, user-owned REST routes require `Authorization: Bearer <Firebase ID token>`. The voice WebSocket uses `/api/v1/ws/voice-session?id_token=<Firebase ID token>`.

## API

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/study-materials`
- `POST /api/v1/study-materials`
- `POST /api/v1/study-materials/upload`
- `POST /api/v1/study-materials/{material_id}/ingest`
- `GET /api/v1/review-items`
- `WebSocket /api/v1/ws/voice-session`
