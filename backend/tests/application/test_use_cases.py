from collections.abc import AsyncIterator

import pytest

from ai_voice_coach.application.use_cases import (
    CreateStudyMaterial,
    ListReviewItems,
    ListStudyMaterials,
    RunVoiceSession,
)
from ai_voice_coach.domain.study_materials import StudyMaterialDraft
from ai_voice_coach.domain.voice_sessions import VoiceEvent
from ai_voice_coach.infrastructure.memory.adapters import (
    InMemoryLearningMemoryStore,
    InMemoryStudyMaterialStore,
    StubVoiceSessionGateway,
)


@pytest.mark.asyncio
async def test_create_and_list_study_material_use_cases() -> None:
    store = InMemoryStudyMaterialStore()
    create = CreateStudyMaterial(store)
    list_materials = ListStudyMaterials(store)

    created = await create.execute("dev-user", StudyMaterialDraft(title="Chapter 1 Notes"))
    listed = await list_materials.execute("dev-user")

    assert created.title == "Chapter 1 Notes"
    assert listed == [created]


@pytest.mark.asyncio
async def test_list_review_items_use_case_returns_seeded_item() -> None:
    use_case = ListReviewItems(InMemoryLearningMemoryStore())

    items = await use_case.execute("dev-user")

    assert items[0].concept == "Explain the voice coach architecture"


@pytest.mark.asyncio
async def test_run_voice_session_use_case_streams_stub_events() -> None:
    async def events() -> AsyncIterator[VoiceEvent]:
        yield VoiceEvent(type="audio.chunk", payload={"data": "stub"})
        yield VoiceEvent(type="session.stop")

    use_case = RunVoiceSession(StubVoiceSessionGateway())

    received = [event async for event in use_case.execute(events())]

    assert received[0] == VoiceEvent(type="session.started", payload={"mode": "stub"})
    assert received[1].type == "coach.message"
    assert received[2] == VoiceEvent(type="session.stopped")
