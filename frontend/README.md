# AI Voice Coach Frontend

React/Vite frontend for the AI Voice Coach learning project. It includes Firebase email/password auth, study material upload/ingestion controls, review items, and the local microphone voice harness.

## Structure

```text
src/
  api.ts        Backend API client with Firebase bearer tokens
  audio.ts      PCM audio helpers for the voice harness
  firebase.ts   Firebase Web SDK setup
  main.tsx      React app
  styles.css    App styles
```

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
