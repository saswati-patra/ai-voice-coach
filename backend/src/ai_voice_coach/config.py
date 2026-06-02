from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field(default="local", validation_alias="APP_ENV")
    app_name: str = Field(default="AI Voice Coach", validation_alias="APP_NAME")
    dev_user_id: str = Field(default="dev-user", validation_alias="DEV_USER_ID")
    google_cloud_enabled: bool = Field(default=False, validation_alias="GOOGLE_CLOUD_ENABLED")
    google_cloud_project: str | None = Field(default=None, validation_alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = Field(
        default="us-central1", validation_alias="GOOGLE_CLOUD_LOCATION"
    )
    google_cloud_storage_bucket: str | None = Field(
        default=None, validation_alias="GOOGLE_CLOUD_STORAGE_BUCKET"
    )
    firestore_database: str = Field(default="(default)", validation_alias="FIRESTORE_DATABASE")
    gemini_live_model: str = Field(
        default="gemini-live-2.5-flash-native-audio",
        validation_alias="GEMINI_LIVE_MODEL",
    )
    gemini_response_modalities: str = Field(
        default="audio", validation_alias="GEMINI_RESPONSE_MODALITIES"
    )
    gemini_system_instruction: str = Field(
        default=(
            "You are an AI voice study coach. Ask concise questions, listen to the learner's "
            "answers, give gentle corrections, and revisit weak concepts using spaced repetition."
        ),
        validation_alias="GEMINI_SYSTEM_INSTRUCTION",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def adapter_mode(self) -> str:
        return "google-cloud" if self.google_cloud_enabled else "stub"

    @property
    def gemini_response_modality_list(self) -> list[str]:
        return [
            modality.strip()
            for modality in self.gemini_response_modalities.split(",")
            if modality.strip()
        ]

    @property
    def gemini_live_response_modalities(self) -> list[str]:
        requested_modalities = [modality.lower() for modality in self.gemini_response_modality_list]
        if "audio" in requested_modalities:
            return ["audio"]
        if requested_modalities:
            return [requested_modalities[0]]
        return ["audio"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
