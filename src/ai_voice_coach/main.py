import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ai_voice_coach.config import Settings, get_settings
from ai_voice_coach.dependencies import (
    get_current_user_id,
    get_learning_memory_store,
    get_study_material_store,
    get_voice_session_service,
)
from ai_voice_coach.models import HealthResponse, StudyMaterialCreate, UserProfile, VoiceEvent
from ai_voice_coach.services.interfaces import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionService,
)


def create_app() -> FastAPI:
    app = FastAPI(title="AI Voice Coach", version="0.1.0")
    api_v1 = APIRouter(prefix="/api/v1")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse("static/index.html")

    @app.get("/health", response_model=HealthResponse)
    async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
        return HealthResponse(
            status="ok",
            app_name=settings.app_name,
            app_env=settings.app_env,
            adapter_mode=settings.adapter_mode,
        )

    @api_v1.get("/me", response_model=UserProfile)
    async def me(settings: Settings = Depends(get_settings)) -> UserProfile:
        user_id = get_current_user_id(settings)
        return UserProfile(id=user_id, display_name="Local Dev User")

    @api_v1.post("/study-materials")
    async def create_study_material(
        material: StudyMaterialCreate,
        store: StudyMaterialStore = Depends(get_study_material_store),
        settings: Settings = Depends(get_settings),
    ):
        return await store.create(get_current_user_id(settings), material)

    @api_v1.get("/study-materials")
    async def list_study_materials(
        store: StudyMaterialStore = Depends(get_study_material_store),
        settings: Settings = Depends(get_settings),
    ):
        return await store.list_for_user(get_current_user_id(settings))

    @api_v1.get("/review-items")
    async def list_review_items(
        store: LearningMemoryStore = Depends(get_learning_memory_store),
        settings: Settings = Depends(get_settings),
    ):
        return await store.list_review_items(get_current_user_id(settings))

    @api_v1.websocket("/ws/voice-session")
    async def voice_session(
        websocket: WebSocket,
        service: VoiceSessionService = Depends(get_voice_session_service),
    ) -> None:
        await websocket.accept()
        inbound_queue: asyncio.Queue[VoiceEvent | None] = asyncio.Queue()

        async def inbound_events() -> AsyncIterator[VoiceEvent]:
            while True:
                event = await inbound_queue.get()
                if event is None:
                    return
                yield event

        async def receive_from_client() -> None:
            try:
                while True:
                    message = await websocket.receive_json()
                    await inbound_queue.put(VoiceEvent.model_validate(message))
            except WebSocketDisconnect:
                await inbound_queue.put(None)

        receiver = asyncio.create_task(receive_from_client())

        try:
            async for event in service.handle_events(inbound_events()):
                await websocket.send_json(event.model_dump(mode="json"))
        finally:
            receiver.cancel()

    app.include_router(api_v1)

    return app


app = create_app()
