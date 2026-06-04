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

For dev-auth backend mode, Firebase values can stay blank. For Firebase auth mode, populate the `VITE_FIREBASE_*` values from OpenTofu outputs after apply.

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

The frontend sends `Authorization: Bearer <Firebase ID token>` to REST endpoints when a user is signed in. The voice WebSocket sends the same token as:

```text
/api/v1/ws/voice-session?id_token=<Firebase ID token>
```
