from collections.abc import AsyncIterator
import asyncio

from ai_voice_coach.application.ports import (
    LearningMemoryStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import StudyMaterial, StudyMaterialDraft
from ai_voice_coach.domain.voice_sessions import VoiceEvent
from ai_voice_coach.config import Settings
from ai_voice_coach.infrastructure.google_cloud.clients import GoogleCloudClients
from ai_voice_coach.infrastructure.google_cloud.live_translation import (
    GeminiAudioStreamEnd,
    GeminiClientContent,
    GeminiRealtimeAudio,
    build_live_connect_config,
    client_event_to_gemini_send,
    live_server_message_to_voice_events,
)


class GoogleCloudStudyMaterialStore(StudyMaterialStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def create(self, user_id: str, material: StudyMaterialDraft) -> StudyMaterial:
        raise NotImplementedError("Cloud Storage metadata persistence is planned for a later phase.")

    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        raise NotImplementedError("Cloud Storage metadata listing is planned for a later phase.")


class GoogleCloudLearningMemoryStore(LearningMemoryStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        raise NotImplementedError("Firestore learning memory is planned for a later phase.")


class GeminiLiveVoiceSessionGateway(VoiceSessionGateway):
    def __init__(self, clients: GoogleCloudClients, settings: Settings) -> None:
        self._clients = clients
        self._settings = settings

    async def handle_events(self, events: AsyncIterator[VoiceEvent]) -> AsyncIterator[VoiceEvent]:
        config = build_live_connect_config(self._settings)

        try:
            async with self._clients.genai.aio.live.connect(
                model=self._settings.gemini_live_model,
                config=config,
            ) as session:
                yield VoiceEvent(
                    type="session.started",
                    payload={"mode": "google-cloud", "model": self._settings.gemini_live_model},
                )

                sender = asyncio.create_task(self._send_client_events(session, events))

                try:
                    async for message in session.receive():
                        for event in live_server_message_to_voice_events(message):
                            yield event

                        if sender.done():
                            break
                finally:
                    sender.cancel()

        except Exception as exc:
            yield VoiceEvent(type="error", payload={"message": str(exc)})
        finally:
            yield VoiceEvent(type="session.stopped")

    async def _send_client_events(self, session, events: AsyncIterator[VoiceEvent]) -> None:
        async for event in events:
            send = client_event_to_gemini_send(event)
            if send is None:
                continue

            if isinstance(send, GeminiRealtimeAudio):
                await session.send_realtime_input(
                    audio={"data": send.data, "mimeType": send.mime_type}
                )
                continue

            if isinstance(send, GeminiClientContent):
                await session.send_client_content(
                    turns={"parts": [{"text": send.text}], "role": "user"},
                    turn_complete=send.turn_complete,
                )
                continue

            if isinstance(send, GeminiAudioStreamEnd):
                await session.send_realtime_input(audio_stream_end=True)
                await session.close()
                return
