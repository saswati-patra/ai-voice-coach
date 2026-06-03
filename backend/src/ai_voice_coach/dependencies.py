from functools import lru_cache

from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ai_voice_coach.application.auth import (
    AuthConfigurationError,
    AuthError,
    AuthTokenMissingError,
    AuthVerifier,
)
from ai_voice_coach.application.ports import (
    DocumentIngestionGateway,
    LearningMemoryStore,
    StudyMaterialDocumentStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.application.use_cases import (
    CreateStudyMaterial,
    GetCurrentUser,
    IngestStudyMaterial,
    ListReviewItems,
    ListStudyMaterials,
    RunVoiceSession,
    UploadStudyMaterialDocument,
)
from ai_voice_coach.config import get_settings
from ai_voice_coach.domain.users import User
from ai_voice_coach.infrastructure.auth import DevAuthVerifier, FirebaseAuthVerifier
from ai_voice_coach.infrastructure.google_cloud.adapters import (
    GeminiDocumentIngestionGateway,
    GeminiLiveVoiceSessionGateway,
    GoogleCloudStudyMaterialDocumentStore,
    GoogleCloudLearningMemoryStore,
    GoogleCloudStudyMaterialStore,
)
from ai_voice_coach.infrastructure.google_cloud.clients import GoogleCloudClients
from ai_voice_coach.infrastructure.memory.adapters import (
    InMemoryStudyMaterialDocumentStore,
    InMemoryLearningMemoryStore,
    InMemoryStudyMaterialStore,
    StubDocumentIngestionGateway,
    StubVoiceSessionGateway,
)

_http_bearer = HTTPBearer(auto_error=False)


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
def get_study_material_document_store() -> StudyMaterialDocumentStore:
    settings = get_settings()
    if settings.google_cloud_enabled:
        return GoogleCloudStudyMaterialDocumentStore(get_google_cloud_clients(), settings)
    return InMemoryStudyMaterialDocumentStore()


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
        return GeminiLiveVoiceSessionGateway(get_google_cloud_clients(), settings)
    return StubVoiceSessionGateway()


@lru_cache
def get_document_ingestion_gateway() -> DocumentIngestionGateway:
    settings = get_settings()
    if settings.google_cloud_enabled:
        return GeminiDocumentIngestionGateway(get_google_cloud_clients(), settings)
    return StubDocumentIngestionGateway()


@lru_cache
def get_auth_verifier() -> AuthVerifier:
    settings = get_settings()
    if settings.auth_mode == "firebase":
        return FirebaseAuthVerifier(settings)
    return DevAuthVerifier(settings.dev_user_id)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_http_bearer),
) -> User:
    token = credentials.credentials if credentials is not None else None
    try:
        return await get_auth_verifier().verify_id_token(token)
    except AuthError as exc:
        raise _auth_http_exception(exc) from exc


def get_current_user_id(user: User = Depends(get_current_user)) -> str:
    return user.id


async def get_current_websocket_user(websocket: WebSocket) -> User:
    token = websocket.query_params.get("id_token")
    return await get_auth_verifier().verify_id_token(token)


def get_get_current_user() -> GetCurrentUser:
    return GetCurrentUser(get_settings().dev_user_id)


def get_create_study_material() -> CreateStudyMaterial:
    return CreateStudyMaterial(get_study_material_store())


def get_list_study_materials() -> ListStudyMaterials:
    return ListStudyMaterials(get_study_material_store())


def get_upload_study_material_document() -> UploadStudyMaterialDocument:
    return UploadStudyMaterialDocument(
        get_study_material_document_store(),
        get_study_material_store(),
    )


def get_ingest_study_material() -> IngestStudyMaterial:
    return IngestStudyMaterial(
        get_study_material_store(),
        get_study_material_document_store(),
        get_learning_memory_store(),
        get_document_ingestion_gateway(),
    )


def get_list_review_items() -> ListReviewItems:
    return ListReviewItems(get_learning_memory_store())


def get_run_voice_session() -> RunVoiceSession:
    return RunVoiceSession(get_voice_session_gateway())


def _auth_http_exception(error: AuthError) -> HTTPException:
    if isinstance(error, AuthConfigurationError):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is not configured.",
        )

    detail = "Authentication required."
    if not isinstance(error, AuthTokenMissingError):
        detail = "Invalid authentication token."

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )
