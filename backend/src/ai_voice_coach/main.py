from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ai_voice_coach.api.v1.router import router as api_v1_router
from ai_voice_coach.config import Settings, get_settings
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    app_env: str
    adapter_mode: str


def frontend_index_path() -> Path:
    return frontend_static_dir() / "index.html"


def frontend_static_dir() -> Path:
    backend_dir = Path(__file__).resolve().parents[2]
    return backend_dir.parent / "frontend" / "static"


def create_app() -> FastAPI:
    app = FastAPI(title="AI Voice Coach", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount("/static", StaticFiles(directory=frontend_static_dir()), name="static")

    @app.get("/", include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse(frontend_index_path())

    @app.get("/health", response_model=HealthResponse)
    async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
        return HealthResponse(
            status="ok",
            app_name=settings.app_name,
            app_env=settings.app_env,
            adapter_mode=settings.adapter_mode,
        )

    app.include_router(api_v1_router)

    return app


app = create_app()
