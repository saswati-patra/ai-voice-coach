from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ai_voice_coach.api.v1.router import router as api_v1_router
from ai_voice_coach.config import Settings, get_settings


class HealthResponse(BaseModel):
    status: str
    app_name: str
    app_env: str
    adapter_mode: str


def frontend_index_path() -> Path:
    dist_index = frontend_dist_dir() / "index.html"
    if dist_index.exists():
        return dist_index
    return frontend_source_dir() / "index.html"


def frontend_source_dir() -> Path:
    backend_dir = Path(__file__).resolve().parents[2]
    return backend_dir.parent / "frontend"


def frontend_dist_dir() -> Path:
    return frontend_source_dir() / "dist"


def hosted_frontend_url(settings: Settings, frontend_path: str = "") -> str | None:
    if not settings.frontend_base_url:
        return None

    base_url = settings.frontend_base_url.rstrip("/")
    normalized_path = frontend_path.strip("/")
    if not normalized_path:
        return base_url
    return f"{base_url}/{normalized_path}"


def create_app() -> FastAPI:
    app = FastAPI(title="AI Voice Coach", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    assets_dir = frontend_dist_dir() / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def index(settings: Settings = Depends(get_settings)) -> Response:
        if redirect_url := hosted_frontend_url(settings):
            return RedirectResponse(redirect_url)
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

    @app.get("/{frontend_path:path}", include_in_schema=False)
    async def frontend_route(
        frontend_path: str,
        settings: Settings = Depends(get_settings),
    ) -> Response:
        if redirect_url := hosted_frontend_url(settings, frontend_path):
            return RedirectResponse(redirect_url)
        return FileResponse(frontend_index_path())

    return app


app = create_app()
