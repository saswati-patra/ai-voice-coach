from collections.abc import AsyncIterator

from ai_voice_coach.application.ports import (
    LearningMemoryStore,
    StudyMaterialDocumentStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import (
    StoredStudyDocument,
    StudyMaterial,
    StudyMaterialDraft,
)
from ai_voice_coach.domain.voice_sessions import VoiceEvent


class InMemoryStudyMaterialStore(StudyMaterialStore):
    def __init__(self) -> None:
        self._materials: list[StudyMaterial] = []

    async def create(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        saved = StudyMaterial(user_id=user_id, **material.model_dump())
        self._materials.append(saved)
        return saved

    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        return [material for material in self._materials if material.user_id == user_id]


class InMemoryStudyMaterialDocumentStore(StudyMaterialDocumentStore):
    def __init__(self) -> None:
        self._documents: dict[str, bytes] = {}

    async def upload(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> StoredStudyDocument:
        storage_path = f"memory://users/{user_id}/study_materials/{filename}"
        self._documents[storage_path] = content
        return StoredStudyDocument(
            storage_path=storage_path,
            original_filename=filename,
            content_type=content_type,
            size_bytes=len(content),
        )


class InMemoryLearningMemoryStore(LearningMemoryStore):
    def __init__(self) -> None:
        self._review_items: list[ReviewItem] = [
            ReviewItem(user_id="dev-user", concept="Explain the voice coach architecture")
        ]

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        return [item for item in self._review_items if item.user_id == user_id]


class StubVoiceSessionGateway(VoiceSessionGateway):
    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        yield VoiceEvent(type="session.started", payload={"mode": "stub"})

        async for event in events:
            if event.type == "session.stop":
                yield VoiceEvent(type="session.stopped")
                return

            if event.type == "audio.chunk":
                yield VoiceEvent(
                    type="coach.message",
                    payload={"text": "Stub coach received an audio chunk."},
                )
                continue

            yield VoiceEvent(type="coach.message", payload={"text": f"Stub handled {event.type}."})
