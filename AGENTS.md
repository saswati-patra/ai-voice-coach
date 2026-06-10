# Repository Guidelines

## Project Structure & Module Organization

This repo contains a FastAPI backend and a React/Vite frontend. Backend code lives in `backend/src/ai_voice_coach`, organized by `api`, `application`, `domain`, and `infrastructure`; backend tests live in `backend/tests`. Frontend code lives in `frontend/src`, with pages in `pages`, shared components in `components`, UI primitives in `components/ui`, hooks in `hooks`, and helpers in `lib`. Screenshots are in `docs/assets`, runbooks are in `docs`, OpenTofu config is in `infra/tofu`, and helper scripts are in `scripts`.

## Build, Test, and Development Commands

Run commands from the repository root unless noted:

- `make help`: list available targets.
- `make check`: run backend lint/format checks, pytest, frontend lint/format checks, Vitest, and Vite build.
- `make format`: apply Ruff, ESLint, and Prettier fixes.
- `make test`: run backend and frontend tests.
- `make build`: build the frontend.
- `cd backend && uv sync`: install backend dependencies.
- `cd backend && uv run uvicorn ai_voice_coach.main:app --reload --app-dir src`: run the API on port 8000.
- `cd frontend && npm install && npm run dev`: install frontend dependencies and start Vite on port 5173.
- `docker compose up --build`: run the containerized app.

## Coding Style & Naming Conventions

Python targets 3.12 and uses Ruff with a 100-character line length, double quotes, space indentation, and import sorting. Keep backend modules snake_case and place business rules in `domain` or `application`. TypeScript uses ESLint, Prettier, React 19, Tailwind CSS, and local shadcn-style primitives. Use kebab-case filenames for React pages/components and PascalCase component exports.

## Testing Guidelines

Backend tests use pytest and follow `test_*.py` naming under `backend/tests`, with subdirectories matching the layer under test. Frontend tests use Vitest and follow `*.test.ts` or `*.test.tsx` near the relevant source. Prefer targeted tests for behavior changes, then run `make test`; run `make check` before a PR when practical.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, for example `Add make-based linting and formatting checks` or `Improve frontend Firebase login flow`. Keep commits focused and avoid mixing unrelated backend, frontend, and infrastructure changes. PRs should include a concise summary, test results, linked issues when applicable, and screenshots for UI changes.

## Security & Configuration Tips

Stub mode is the local default. Do not commit `.env`, Google Cloud credentials, `infra/tofu/terraform.tfvars`, or state files. Track only example config such as `backend/.env.example`, `frontend/.env.example`, and `infra/tofu/terraform.tfvars.example`.
