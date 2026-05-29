from google import genai
from google.cloud import firestore, logging, storage

from ai_voice_coach.config import Settings


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
