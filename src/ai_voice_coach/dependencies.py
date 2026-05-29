from functools import lru_cache

from ai_voice_coach.application.ports import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.application.use_cases import (
    CreateStudyMaterial,
    GetCurrentUser,
    ListReviewItems,
    ListStudyMaterials,
    RunVoiceSession,
)
from ai_voice_coach.config import get_settings
from ai_voice_coach.infrastructure.google_cloud.adapters import (
    GeminiLiveVoiceSessionGateway,
    GoogleCloudLearningMemoryStore,
    GoogleCloudStudyMaterialStore,
)
from ai_voice_coach.infrastructure.google_cloud.clients import GoogleCloudClients
from ai_voice_coach.infrastructure.memory.adapters import (
    InMemoryLearningMemoryStore,
    InMemoryStudyMaterialStore,
    StubVoiceSessionGateway,
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
def get_voice_session_gateway() -> VoiceSessionGateway:
    settings = get_settings()
    if settings.google_cloud_enabled:
        return GeminiLiveVoiceSessionGateway(get_google_cloud_clients())
    return StubVoiceSessionGateway()


def get_current_user_id() -> str:
    return get_settings().dev_user_id


def get_get_current_user() -> GetCurrentUser:
    return GetCurrentUser(get_current_user_id())


def get_create_study_material() -> CreateStudyMaterial:
    return CreateStudyMaterial(get_study_material_store())


def get_list_study_materials() -> ListStudyMaterials:
    return ListStudyMaterials(get_study_material_store())


def get_list_review_items() -> ListReviewItems:
    return ListReviewItems(get_learning_memory_store())


def get_run_voice_session() -> RunVoiceSession:
    return RunVoiceSession(get_voice_session_gateway())
