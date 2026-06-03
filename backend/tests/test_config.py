from ai_voice_coach.config import Settings
from ai_voice_coach.dependencies import get_voice_session_gateway
from ai_voice_coach.infrastructure.google_cloud.adapters import (
    GeminiLiveVoiceSessionGateway,
    GoogleCloudStudyMaterialDocumentStore,
    GoogleCloudStudyMaterialStore,
)
from ai_voice_coach.infrastructure.memory.adapters import StubVoiceSessionGateway


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


def test_gemini_response_modalities_are_parsed_from_env_string() -> None:
    settings = Settings(GEMINI_RESPONSE_MODALITIES="audio,text")

    assert settings.gemini_response_modality_list == ["audio", "text"]


def test_gemini_live_response_modalities_prefers_one_audio_modality() -> None:
    settings = Settings(GEMINI_RESPONSE_MODALITIES="audio,text")

    assert settings.gemini_live_response_modalities == ["audio"]


def test_gemini_live_response_modalities_uses_first_non_audio_modality() -> None:
    settings = Settings(GEMINI_RESPONSE_MODALITIES="text")

    assert settings.gemini_live_response_modalities == ["text"]
