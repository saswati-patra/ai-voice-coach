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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def adapter_mode(self) -> str:
        return "google-cloud" if self.google_cloud_enabled else "stub"


@lru_cache
def get_settings() -> Settings:
    return Settings()
