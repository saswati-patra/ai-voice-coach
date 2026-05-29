from collections.abc import AsyncIterator

from ai_voice_coach.application.ports import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import StudyMaterial, StudyMaterialDraft
from ai_voice_coach.domain.users import User
from ai_voice_coach.domain.voice_sessions import VoiceEvent


class GetCurrentUser:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id

    async def execute(self) -> User:
        return User(id=self._user_id, display_name="Local Dev User")


class CreateStudyMaterial:
    def __init__(self, store: StudyMaterialStore) -> None:
        self._store = store

    async def execute(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        return await self._store.create(user_id, material)


class ListStudyMaterials:
    def __init__(self, store: StudyMaterialStore) -> None:
        self._store = store

    async def execute(self, user_id: str) -> list[StudyMaterial]:
        return await self._store.list_for_user(user_id)


class ListReviewItems:
    def __init__(self, store: LearningMemoryStore) -> None:
        self._store = store

    async def execute(self, user_id: str) -> list[ReviewItem]:
        return await self._store.list_review_items(user_id)


class RunVoiceSession:
    def __init__(self, gateway: VoiceSessionGateway) -> None:
        self._gateway = gateway

    async def execute(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        async for event in self._gateway.handle_events(events):
            yield event
