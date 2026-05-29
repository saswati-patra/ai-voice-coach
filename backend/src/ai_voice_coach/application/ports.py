from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import StudyMaterial, StudyMaterialDraft
from ai_voice_coach.domain.voice_sessions import VoiceEvent


class StudyMaterialStore(ABC):
    @abstractmethod
    async def create(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        raise NotImplementedError

    @abstractmethod
    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        raise NotImplementedError


class LearningMemoryStore(ABC):
    @abstractmethod
    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        raise NotImplementedError


class VoiceSessionGateway(ABC):
    @abstractmethod
    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        raise NotImplementedError
