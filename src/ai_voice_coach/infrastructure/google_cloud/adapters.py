from collections.abc import AsyncIterator

from ai_voice_coach.application.ports import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import StudyMaterial, StudyMaterialDraft
from ai_voice_coach.domain.voice_sessions import VoiceEvent
from ai_voice_coach.infrastructure.google_cloud.clients import GoogleCloudClients


class GoogleCloudStudyMaterialStore(StudyMaterialStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def create(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        raise NotImplementedError("Cloud Storage metadata persistence is planned for a later phase.")

    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        raise NotImplementedError("Cloud Storage metadata listing is planned for a later phase.")


class GoogleCloudLearningMemoryStore(LearningMemoryStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        raise NotImplementedError("Firestore learning memory is planned for a later phase.")


class GeminiLiveVoiceSessionGateway(VoiceSessionGateway):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        raise NotImplementedError("Gemini Live streaming is planned for the next cloud hookup phase.")
