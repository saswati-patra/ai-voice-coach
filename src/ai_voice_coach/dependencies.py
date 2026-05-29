from functools import lru_cache

from ai_voice_coach.adapters.google_cloud import (
    GeminiLiveVoiceSessionService,
    GoogleCloudClients,
    GoogleCloudLearningMemoryStore,
    GoogleCloudStudyMaterialStore,
)
from ai_voice_coach.adapters.stub import (
    InMemoryLearningMemoryStore,
    InMemoryStudyMaterialStore,
    StubVoiceSessionService,
)
from ai_voice_coach.config import Settings, get_settings
from ai_voice_coach.services.interfaces import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionService,
)


@lru_cache
def get_google_cloud_clients() -> GoogleCloudClients:
    return GoogleCloudClients(get_settings())


@lru_cache
def get_study_material_store() -> StudyMaterialStore:
    settings = get_settings()
    if settings.google_cloud_enabled:
        return GoogleCloudStudyMaterialStore(get_google_cloud_clients())
    return InMemoryStudyMaterialStore()


@lru_cache
def get_learning_memory_store() -> LearningMemoryStore:
    settings = get_settings()
    if settings.google_cloud_enabled:
        return GoogleCloudLearningMemoryStore(get_google_cloud_clients())
    return InMemoryLearningMemoryStore()


@lru_cache
def get_voice_session_service() -> VoiceSessionService:
    settings = get_settings()
    if settings.google_cloud_enabled:
        return GeminiLiveVoiceSessionService(get_google_cloud_clients())
    return StubVoiceSessionService()


def get_current_user_id(settings: Settings | None = None) -> str:
    active_settings = settings or get_settings()
    return active_settings.dev_user_id
