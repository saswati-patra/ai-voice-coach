import pytest


def clear_cache(function):
    cache_clear = getattr(function, "cache_clear", None)
    if cache_clear is not None:
        cache_clear()


@pytest.fixture(autouse=True)
def isolate_settings(monkeypatch):
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("GOOGLE_CLOUD_ENABLED", "false")
    clear_cache(config.get_settings)
    clear_cache(dependencies.get_google_cloud_clients)
    clear_cache(dependencies.get_study_material_store)
    clear_cache(dependencies.get_learning_memory_store)
    clear_cache(dependencies.get_voice_session_gateway)

    yield

    clear_cache(config.get_settings)
    clear_cache(dependencies.get_google_cloud_clients)
    clear_cache(dependencies.get_study_material_store)
    clear_cache(dependencies.get_learning_memory_store)
    clear_cache(dependencies.get_voice_session_gateway)
