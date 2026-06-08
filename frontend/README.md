# AI Voice Coach Frontend

React/Vite frontend for the AI Voice Coach learning project. It includes a public portfolio/SaaS landing page, Google account sign-in through Firebase Auth, study material upload/ingestion controls, review items, and the local microphone voice harness.

The UI is organized as a small multi-page React app with Tailwind CSS v4, local shadcn-style primitives, and Base UI tabs for the cloud/auth workflow.

## Structure

```text
src/
  api.ts                 Backend API client with Firebase bearer tokens
  audio.ts               PCM audio helpers for the voice harness
  firebase.ts            Firebase Web SDK setup
  main.tsx               React entrypoint
  App.tsx                Router and shared workspace state
  hooks/                 App state and voice-session orchestration
  pages/                 Dashboard, Study, Review, Voice, and Cloud pages
  components/            App shell plus shadcn-style UI primitives
  styles.css             Tailwind v4 theme tokens and global styles
```

## Pages

- `/`: public portfolio/SaaS landing page
- `/login`: Google account sign-in
- `/app`: workspace dashboard and learning loop overview
- `/app/study`: upload study documents and trigger ingestion
- `/app/review`: generated review item lanes
- `/app/voice`: microphone harness and WebSocket session log
- `/app/cloud`: authenticated cloud, runtime target, and deployment workflow settings

## UI Stack

- Tailwind CSS v4 through the Vite plugin
- Local shadcn-style components in `src/components/ui`
- Base UI tabs via `@base-ui/react`
- Lucide icons for tool and navigation buttons

## Local Development

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

For dev-auth backend mode, keep:

```env
VITE_AUTH_MODE=dev
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

Firebase values can stay blank in dev mode. For Firebase auth mode, use:

```env
VITE_AUTH_MODE=firebase
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

Then populate the `VITE_FIREBASE_*` values from OpenTofu outputs after apply:

```bash
tofu -chdir=../infra/tofu output -json firebase_frontend_env
```

Keep `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` blank when running through Vite's local proxy or when the built frontend is served by FastAPI. Set them for the Firebase Hosting build so the hosted frontend calls Cloud Run:

```env
VITE_API_BASE_URL=https://your-cloud-run-url
VITE_WS_BASE_URL=wss://your-cloud-run-url
```

Run the backend on port 8000, then run Vite:

```bash
npm run dev
```

Open <http://localhost:5173>.

## Quality Checks

From the repo root:

```bash
make frontend-check
make frontend-format
```

`make frontend-check` runs ESLint, Prettier checks, Vitest, and the production
build. `make frontend-format` applies ESLint fixes and Prettier formatting.

## Production Build

```bash
npm run build
```

The backend serves `frontend/dist` when present. Docker builds the React app automatically before packaging the FastAPI runtime image.

## Firebase Auth

When `VITE_AUTH_MODE=firebase`, the frontend requires a signed-in Firebase user before study material, review item, or voice session actions are enabled. It sends `Authorization: Bearer <Firebase ID token>` to REST endpoints and sends the same token to the voice WebSocket as:

```text
/api/v1/ws/voice-session?id_token=<Firebase ID token>
```

In Firebase mode, signed-out users can view `/` and are redirected to `/login` before they can view `/app/*` workspace pages. The login page only exposes Google account sign-in; the backend also rejects non-Google Firebase sign-in providers. Firebase persists browser sessions, so use the Sign Out button on `/app/cloud` to test the signed-out state.
