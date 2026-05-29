from collections.abc import AsyncIterator

from google import genai
from google.cloud import firestore, logging, storage

from ai_voice_coach.config import Settings
from ai_voice_coach.models import ReviewItem, StudyMaterial, StudyMaterialCreate, VoiceEvent
from ai_voice_coach.services.interfaces import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionService,
)


class GoogleCloudClients:
    """Central place for real Google Cloud clients once cloud mode is enabled."""

    def __init__(self, settings: Settings) -> None:
        if not settings.google_cloud_enabled:
            raise RuntimeError("Google Cloud clients are disabled in local stub mode.")

        self.genai = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
        self.firestore = firestore.AsyncClient(
            project=settings.google_cloud_project,
            database=settings.firestore_database,
        )
        self.storage = storage.Client(project=settings.google_cloud_project)
        self.logging = logging.Client(project=settings.google_cloud_project)


class GoogleCloudStudyMaterialStore(StudyMaterialStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def create(self, user_id: str, material: StudyMaterialCreate) -> StudyMaterial:
        raise NotImplementedError("Cloud Storage metadata persistence is planned for a later phase.")

    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        raise NotImplementedError("Cloud Storage metadata listing is planned for a later phase.")


class GoogleCloudLearningMemoryStore(LearningMemoryStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        raise NotImplementedError("Firestore learning memory is planned for a later phase.")


class GeminiLiveVoiceSessionService(VoiceSessionService):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        raise NotImplementedError("Gemini Live streaming is planned for the next cloud hookup phase.")
