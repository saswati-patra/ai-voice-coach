from collections.abc import AsyncIterator

from ai_voice_coach.application.ports import (
    LearningMemoryStore,
    StudyMaterialDocumentStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import SourceType, StudyMaterial, StudyMaterialDraft
from ai_voice_coach.domain.users import User
from ai_voice_coach.domain.voice_sessions import VoiceEvent


class GetCurrentUser:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id

    async def execute(self) -> User:
        return User(id=self._user_id, display_name="Local Dev User")


class CreateStudyMaterial:
    def __init__(self, store: StudyMaterialStore) -> None:
        self._store = store

    async def execute(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        return await self._store.create(user_id, material)


class ListStudyMaterials:
    def __init__(self, store: StudyMaterialStore) -> None:
        self._store = store

    async def execute(self, user_id: str) -> list[StudyMaterial]:
        return await self._store.list_for_user(user_id)


class UploadStudyMaterialDocument:
    def __init__(
        self,
        document_store: StudyMaterialDocumentStore,
        material_store: StudyMaterialStore,
    ) -> None:
        self._document_store = document_store
        self._material_store = material_store

    async def execute(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
        title: str | None = None,
    ) -> StudyMaterial:
        document = await self._document_store.upload(
            user_id=user_id,
            filename=filename,
            content_type=content_type,
            content=content,
        )
        draft = StudyMaterialDraft(
            title=title or document.original_filename,
            source_type=_source_type_for_document(document.content_type, document.original_filename),
            storage_path=document.storage_path,
            storage_bucket=document.storage_bucket,
            original_filename=document.original_filename,
            content_type=document.content_type,
            size_bytes=document.size_bytes,
        )
        return await self._material_store.create(user_id, draft)


class ListReviewItems:
    def __init__(self, store: LearningMemoryStore) -> None:
        self._store = store

    async def execute(self, user_id: str) -> list[ReviewItem]:
        return await self._store.list_review_items(user_id)


class RunVoiceSession:
    def __init__(self, gateway: VoiceSessionGateway) -> None:
        self._gateway = gateway

    async def execute(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        async for event in self._gateway.handle_events(events):
            yield event


def _source_type_for_document(content_type: str, filename: str) -> SourceType:
    if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
        return "pdf"
    return "other"
