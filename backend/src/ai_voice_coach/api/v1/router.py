import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, status
from fastapi import WebSocketDisconnect

from ai_voice_coach.api.v1.schemas import StudyMaterialCreateRequest, UserProfileResponse
from ai_voice_coach.application.auth import AuthError
from ai_voice_coach.application.use_cases import (
    CreateStudyMaterial,
    IngestStudyMaterial,
    ListReviewItems,
    ListStudyMaterials,
    RunVoiceSession,
    StudyMaterialIngestionNotSupportedError,
    StudyMaterialNotFoundError,
    UploadStudyMaterialDocument,
)
from ai_voice_coach.dependencies import (
    get_create_study_material,
    get_current_user,
    get_current_user_id,
    get_current_websocket_user,
    get_ingest_study_material,
    get_list_review_items,
    get_list_study_materials,
    get_run_voice_session,
    get_upload_study_material_document,
)
from ai_voice_coach.domain.study_materials import StudyMaterialDraft
from ai_voice_coach.domain.users import User
from ai_voice_coach.domain.voice_sessions import VoiceEvent

router = APIRouter(prefix="/api/v1")


@router.get("/me", response_model=UserProfileResponse)
async def me(user: User = Depends(get_current_user)) -> UserProfileResponse:
    return UserProfileResponse(id=user.id, display_name=user.display_name)


@router.post("/study-materials")
async def create_study_material(
    material: StudyMaterialCreateRequest,
    use_case: CreateStudyMaterial = Depends(get_create_study_material),
    user_id: str = Depends(get_current_user_id),
):
    draft = StudyMaterialDraft(**material.model_dump())
    return await use_case.execute(user_id, draft)


@router.get("/study-materials")
async def list_study_materials(
    use_case: ListStudyMaterials = Depends(get_list_study_materials),
    user_id: str = Depends(get_current_user_id),
):
    return await use_case.execute(user_id)


@router.post("/study-materials/upload")
async def upload_study_material_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    use_case: UploadStudyMaterialDocument = Depends(get_upload_study_material_document),
    user_id: str = Depends(get_current_user_id),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return await use_case.execute(
        user_id=user_id,
        filename=file.filename or "study-material",
        content_type=file.content_type or "application/octet-stream",
        content=content,
        title=title,
    )


@router.post("/study-materials/{material_id}/ingest")
async def ingest_study_material(
    material_id: str,
    use_case: IngestStudyMaterial = Depends(get_ingest_study_material),
    user_id: str = Depends(get_current_user_id),
):
    try:
        return await use_case.execute(user_id, material_id)
    except StudyMaterialNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except StudyMaterialIngestionNotSupportedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/review-items")
async def list_review_items(
    use_case: ListReviewItems = Depends(get_list_review_items),
    user_id: str = Depends(get_current_user_id),
):
    return await use_case.execute(user_id)


@router.websocket("/ws/voice-session")
async def voice_session(
    websocket: WebSocket,
    use_case: RunVoiceSession = Depends(get_run_voice_session),
) -> None:
    try:
        await get_current_websocket_user(websocket)
    except AuthError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

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
        async for event in use_case.execute(inbound_events()):
            await websocket.send_json(event.model_dump(mode="json"))
    finally:
        receiver.cancel()
