from ai_voice_coach.config import Settings
from ai_voice_coach.dependencies import get_voice_session_gateway
from ai_voice_coach.infrastructure.auth import DevAuthVerifier, FirebaseAuthVerifier
from ai_voice_coach.infrastructure.google_cloud.adapters import (
    GeminiDocumentIngestionGateway,
    GeminiLiveVoiceSessionGateway,
    GoogleCloudStudyMaterialDocumentStore,
    GoogleCloudStudyMaterialStore,
)
from ai_voice_coach.infrastructure.memory.adapters import (
    StubDocumentIngestionGateway,
    StubVoiceSessionGateway,
)


class FakeClients:
    genai = object()
    firestore = object()
    storage = object()


def test_stub_mode_selects_stub_voice_gateway() -> None:
    get_voice_session_gateway.cache_clear()

    gateway = get_voice_session_gateway()

    assert isinstance(gateway, StubVoiceSessionGateway)


def test_cloud_mode_selects_gemini_live_gateway(monkeypatch) -> None:
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("GOOGLE_CLOUD_ENABLED", "true")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
    config.get_settings.cache_clear()
    dependencies.get_voice_session_gateway.cache_clear()
    monkeypatch.setattr(dependencies, "get_google_cloud_clients", lambda: FakeClients())

    gateway = dependencies.get_voice_session_gateway()

    assert isinstance(gateway, GeminiLiveVoiceSessionGateway)

    config.get_settings.cache_clear()
    dependencies.get_voice_session_gateway.cache_clear()


def test_cloud_mode_selects_firestore_study_material_store(monkeypatch) -> None:
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("GOOGLE_CLOUD_ENABLED", "true")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
    config.get_settings.cache_clear()
    dependencies.get_study_material_store.cache_clear()
    monkeypatch.setattr(dependencies, "get_google_cloud_clients", lambda: FakeClients())

    store = dependencies.get_study_material_store()

    assert isinstance(store, GoogleCloudStudyMaterialStore)

    config.get_settings.cache_clear()
    dependencies.get_study_material_store.cache_clear()


def test_cloud_mode_selects_cloud_storage_document_store(monkeypatch) -> None:
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("GOOGLE_CLOUD_ENABLED", "true")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
    monkeypatch.setenv("GOOGLE_CLOUD_STORAGE_BUCKET", "study-materials-bucket")
    config.get_settings.cache_clear()
    dependencies.get_study_material_document_store.cache_clear()
    monkeypatch.setattr(dependencies, "get_google_cloud_clients", lambda: FakeClients())

    store = dependencies.get_study_material_document_store()

    assert isinstance(store, GoogleCloudStudyMaterialDocumentStore)

    config.get_settings.cache_clear()
    dependencies.get_study_material_document_store.cache_clear()


def test_stub_mode_selects_stub_document_ingestion_gateway() -> None:
    from ai_voice_coach import dependencies

    dependencies.get_document_ingestion_gateway.cache_clear()

    gateway = dependencies.get_document_ingestion_gateway()

    assert isinstance(gateway, StubDocumentIngestionGateway)

    dependencies.get_document_ingestion_gateway.cache_clear()


def test_cloud_mode_selects_gemini_document_ingestion_gateway(monkeypatch) -> None:
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("GOOGLE_CLOUD_ENABLED", "true")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
    config.get_settings.cache_clear()
    dependencies.get_document_ingestion_gateway.cache_clear()
    monkeypatch.setattr(dependencies, "get_google_cloud_clients", lambda: FakeClients())

    gateway = dependencies.get_document_ingestion_gateway()

    assert isinstance(gateway, GeminiDocumentIngestionGateway)

    config.get_settings.cache_clear()
    dependencies.get_document_ingestion_gateway.cache_clear()


def test_dev_auth_mode_selects_dev_auth_verifier() -> None:
    from ai_voice_coach import dependencies

    dependencies.get_auth_verifier.cache_clear()

    verifier = dependencies.get_auth_verifier()

    assert isinstance(verifier, DevAuthVerifier)

    dependencies.get_auth_verifier.cache_clear()


def test_firebase_auth_mode_selects_firebase_auth_verifier(monkeypatch) -> None:
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("AUTH_MODE", "firebase")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
    config.get_settings.cache_clear()
    dependencies.get_auth_verifier.cache_clear()

    verifier = dependencies.get_auth_verifier()

    assert isinstance(verifier, FirebaseAuthVerifier)

    config.get_settings.cache_clear()
    dependencies.get_auth_verifier.cache_clear()


def test_auth_mode_defaults_to_dev() -> None:
    settings = Settings()

    assert settings.auth_mode == "dev"


def test_firebase_project_id_falls_back_to_google_cloud_project() -> None:
    settings = Settings(GOOGLE_CLOUD_PROJECT="test-project", FIREBASE_PROJECT_ID=None)

    assert settings.resolved_firebase_project_id == "test-project"


def test_firebase_allowed_sign_in_provider_defaults_to_google() -> None:
    settings = Settings()

    assert settings.firebase_allowed_sign_in_provider == "google.com"


def test_gemini_document_model_defaults_to_flash() -> None:
    settings = Settings()

    assert settings.gemini_document_model == "gemini-2.5-flash"


def test_gemini_response_modalities_are_parsed_from_env_string() -> None:
    settings = Settings(GEMINI_RESPONSE_MODALITIES="audio,text")

    assert settings.gemini_response_modality_list == ["audio", "text"]


def test_gemini_live_response_modalities_prefers_one_audio_modality() -> None:
    settings = Settings(GEMINI_RESPONSE_MODALITIES="audio,text")

    assert settings.gemini_live_response_modalities == ["audio"]


def test_gemini_live_response_modalities_uses_first_non_audio_modality() -> None:
    settings = Settings(GEMINI_RESPONSE_MODALITIES="text")

    assert settings.gemini_live_response_modalities == ["text"]
