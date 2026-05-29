from collections.abc import AsyncIterator

from ai_voice_coach.models import ReviewItem, StudyMaterial, StudyMaterialCreate, VoiceEvent
from ai_voice_coach.services.interfaces import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionService,
)


class InMemoryStudyMaterialStore(StudyMaterialStore):
    def __init__(self) -> None:
        self._materials: list[StudyMaterial] = []

    async def create(self, user_id: str, material: StudyMaterialCreate) -> StudyMaterial:
        saved = StudyMaterial(user_id=user_id, **material.model_dump())
        self._materials.append(saved)
        return saved

    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        return [material for material in self._materials if material.user_id == user_id]


class InMemoryLearningMemoryStore(LearningMemoryStore):
    def __init__(self) -> None:
        self._review_items: list[ReviewItem] = [
            ReviewItem(user_id="dev-user", concept="Explain the voice coach architecture")
        ]

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        return [item for item in self._review_items if item.user_id == user_id]


class StubVoiceSessionService(VoiceSessionService):
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
