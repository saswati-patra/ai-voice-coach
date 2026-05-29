from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from ai_voice_coach.models import ReviewItem, StudyMaterial, StudyMaterialCreate, VoiceEvent


class StudyMaterialStore(ABC):
    @abstractmethod
    async def create(self, user_id: str, material: StudyMaterialCreate) -> StudyMaterial:
        raise NotImplementedError

    @abstractmethod
    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        raise NotImplementedError


class LearningMemoryStore(ABC):
    @abstractmethod
    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        raise NotImplementedError


class VoiceSessionService(ABC):
    @abstractmethod
    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        raise NotImplementedError
