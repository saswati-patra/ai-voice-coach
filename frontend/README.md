# AI Voice Coach Frontend

React/Vite frontend for the AI Voice Coach learning project. It includes Firebase email/password auth, study material upload/ingestion controls, review items, and the local microphone voice harness.

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

- `/`: workspace dashboard and learning loop overview
- `/login`: Firebase email/password sign-in
- `/study`: upload study documents and trigger ingestion
- `/review`: generated review item lanes
- `/voice`: microphone harness and WebSocket session log
- `/cloud`: authenticated cloud, runtime target, and deployment workflow settings

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

Keep `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` blank when running through Vite's local proxy or when the built frontend is served by FastAPI. Set them only when the frontend and backend are on different origins, such as a hosted frontend calling Cloud Run:

```env
VITE_API_BASE_URL=https://your-cloud-run-url
VITE_WS_BASE_URL=wss://your-cloud-run-url
```

Run the backend on port 8000, then run Vite:

```bash
npm run dev
```

Open <http://localhost:5173>.

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

In Firebase mode, signed-out users are redirected to `/login` before they can view Dashboard, Study, Review, Voice, or Cloud pages. Firebase also persists browser sessions, so use the Sign Out button on `/cloud` to test the signed-out state.
