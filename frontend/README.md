# AI Voice Coach Frontend

Local browser voice harness for testing the FastAPI voice-session WebSocket.

This is intentionally a framework-free static frontend for now. It lets the learning project prove microphone capture, WebSocket streaming, and returned audio playback before introducing a full frontend stack.

## Structure

```text
static/index.html  Browser mic harness and local UI
```

## Run

The frontend is served by the backend.

From the repo root:

```bash
docker compose up
```

Or from `backend/`:

```bash
uv run uvicorn ai_voice_coach.main:app --reload --app-dir src
```

Then open <http://localhost:8000>.

## Behavior

- Connects to `/api/v1/ws/voice-session`.
- Captures microphone audio using Web Audio APIs.
- Sends base64 16 kHz mono PCM16 `audio.chunk` events.
- Plays returned base64 PCM16 `audio.chunk` events.
- Works in backend stub mode for connection and logging checks.

## Future Direction

Keep this static harness until auth, uploads, study-material management, and progress views need a real app shell. At that point, replace or extend this folder with a frontend app such as Vite/React.
