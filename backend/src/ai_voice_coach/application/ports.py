from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import (
    DocumentIngestionResult,
    StoredStudyDocument,
    StudyMaterial,
    StudyMaterialDraft,
    StudyMaterialIngestionUpdate,
)
from ai_voice_coach.domain.voice_sessions import VoiceEvent


class StudyMaterialStore(ABC):
    @abstractmethod
    async def create(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        raise NotImplementedError

    @abstractmethod
    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        raise NotImplementedError

    @abstractmethod
    async def get(self, user_id: str, material_id: str) -> StudyMaterial | None:
        raise NotImplementedError

    @abstractmethod
    async def update_ingestion(
        self,
        user_id: str,
        material_id: str,
        update: StudyMaterialIngestionUpdate,
    ) -> StudyMaterial:
        raise NotImplementedError


class StudyMaterialDocumentStore(ABC):
    @abstractmethod
    async def upload(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> StoredStudyDocument:
        raise NotImplementedError

    @abstractmethod
    async def read_text(self, material: StudyMaterial) -> str:
        raise NotImplementedError


class LearningMemoryStore(ABC):
    @abstractmethod
    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        raise NotImplementedError

    @abstractmethod
    async def create_review_items(self, user_id: str, concepts: list[str]) -> list[ReviewItem]:
        raise NotImplementedError


class DocumentIngestionGateway(ABC):
    @abstractmethod
    async def ingest(
        self,
        material: StudyMaterial,
        text_content: str | None = None,
    ) -> DocumentIngestionResult:
        raise NotImplementedError


class VoiceSessionGateway(ABC):
    @abstractmethod
    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        raise NotImplementedError
