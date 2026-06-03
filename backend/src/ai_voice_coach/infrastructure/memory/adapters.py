from collections.abc import AsyncIterator

from ai_voice_coach.application.ports import (
    DocumentIngestionGateway,
    LearningMemoryStore,
    StudyMaterialDocumentStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import (
    DocumentIngestionResult,
    StoredStudyDocument,
    StudyMaterial,
    StudyMaterialDraft,
    StudyMaterialIngestionUpdate,
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

    async def get(self, user_id: str, material_id: str) -> StudyMaterial | None:
        for material in self._materials:
            if material.user_id == user_id and material.id == material_id:
                return material
        return None

    async def update_ingestion(
        self,
        user_id: str,
        material_id: str,
        update: StudyMaterialIngestionUpdate,
    ) -> StudyMaterial:
        for index, material in enumerate(self._materials):
            if material.user_id == user_id and material.id == material_id:
                updated = material.model_copy(update=update.model_dump())
                self._materials[index] = updated
                return updated

        raise KeyError(f"Study material {material_id} was not found.")


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

    async def read_text(self, material: StudyMaterial) -> str:
        if material.storage_path is None:
            raise ValueError("Study material has no stored document.")

        content = self._documents[material.storage_path]
        return content.decode("utf-8")


class InMemoryLearningMemoryStore(LearningMemoryStore):
    def __init__(self) -> None:
        self._review_items: list[ReviewItem] = [
            ReviewItem(user_id="dev-user", concept="Explain the voice coach architecture")
        ]

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        return [item for item in self._review_items if item.user_id == user_id]

    async def create_review_items(self, user_id: str, concepts: list[str]) -> list[ReviewItem]:
        items = [ReviewItem(user_id=user_id, concept=concept) for concept in concepts]
        self._review_items.extend(items)
        return items


class StubDocumentIngestionGateway(DocumentIngestionGateway):
    async def ingest(
        self,
        material: StudyMaterial,
        text_content: str | None = None,
    ) -> DocumentIngestionResult:
        return DocumentIngestionResult(
            summary=f"Stub summary for {material.title}.",
            key_concepts=["active recall", "spaced repetition", "voice coaching"],
            review_items=["active recall", "spaced repetition", "voice coaching"],
        )


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
