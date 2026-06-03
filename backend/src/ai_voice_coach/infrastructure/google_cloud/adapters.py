from collections.abc import AsyncIterator
import asyncio
from pathlib import PurePath
from uuid import uuid4

from ai_voice_coach.application.ports import (
    DocumentIngestionGateway,
    LearningMemoryStore,
    StudyMaterialDocumentStore,
    StudyMaterialStore,
    VoiceSessionGateway,
)
from ai_voice_coach.domain.review_items import ReviewItem
from ai_voice_coach.domain.study_materials import (
    DocumentIngestionResult,
    StoredStudyDocument,
    StudyMaterial,
    StudyMaterialDraft,
    StudyMaterialIngestionUpdate,
)
from ai_voice_coach.domain.voice_sessions import VoiceEvent
from ai_voice_coach.config import Settings
from ai_voice_coach.infrastructure.google_cloud.clients import GoogleCloudClients
from ai_voice_coach.infrastructure.google_cloud.document_ingestion import (
    build_document_ingestion_config,
    build_document_ingestion_contents,
    parse_document_ingestion_response,
)
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
        saved = StudyMaterial(user_id=user_id, **material.model_dump())
        await self._study_materials_collection(user_id).document(saved.id).set(
            saved.model_dump(mode="python")
        )
        return saved

    async def list_for_user(self, user_id: str) -> list[StudyMaterial]:
        query = self._study_materials_collection(user_id).order_by("created_at")
        materials: list[StudyMaterial] = []

        async for snapshot in query.stream():
            data = snapshot.to_dict()
            if data is None:
                continue

            data.setdefault("id", snapshot.id)
            data.setdefault("user_id", user_id)
            materials.append(StudyMaterial.model_validate(data))

        return materials

    async def get(self, user_id: str, material_id: str) -> StudyMaterial | None:
        snapshot = await self._study_materials_collection(user_id).document(material_id).get()
        if not snapshot.exists:
            return None

        data = snapshot.to_dict()
        if data is None:
            return None

        data.setdefault("id", snapshot.id)
        data.setdefault("user_id", user_id)
        return StudyMaterial.model_validate(data)

    async def update_ingestion(
        self,
        user_id: str,
        material_id: str,
        update: StudyMaterialIngestionUpdate,
    ) -> StudyMaterial:
        document = self._study_materials_collection(user_id).document(material_id)
        await document.update(update.model_dump(mode="python"))
        updated = await self.get(user_id, material_id)
        if updated is None:
            raise KeyError(f"Study material {material_id} was not found.")

        return updated

    def _study_materials_collection(self, user_id: str):
        return (
            self._clients.firestore.collection("users")
            .document(user_id)
            .collection("study_materials")
        )


class GoogleCloudStudyMaterialDocumentStore(StudyMaterialDocumentStore):
    def __init__(self, clients: GoogleCloudClients, settings: Settings) -> None:
        self._clients = clients
        self._settings = settings

    async def upload(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> StoredStudyDocument:
        bucket_name = self._settings.google_cloud_storage_bucket
        if bucket_name is None:
            raise RuntimeError("GOOGLE_CLOUD_STORAGE_BUCKET is required for document uploads.")

        safe_filename = _safe_filename(filename)
        storage_path = (
            f"users/{_safe_path_segment(user_id)}/study_materials/uploads/"
            f"{uuid4()}-{safe_filename}"
        )
        blob = self._clients.storage.bucket(bucket_name).blob(storage_path)

        await asyncio.to_thread(blob.upload_from_string, content, content_type=content_type)

        return StoredStudyDocument(
            storage_path=storage_path,
            storage_bucket=bucket_name,
            original_filename=safe_filename,
            content_type=content_type,
            size_bytes=len(content),
        )

    async def read_text(self, material: StudyMaterial) -> str:
        bucket_name = material.storage_bucket or self._settings.google_cloud_storage_bucket
        if bucket_name is None or material.storage_path is None:
            raise RuntimeError("Cloud Storage bucket and object path are required.")

        blob = self._clients.storage.bucket(bucket_name).blob(material.storage_path)
        content = await asyncio.to_thread(blob.download_as_bytes)
        return content.decode("utf-8")


class GoogleCloudLearningMemoryStore(LearningMemoryStore):
    def __init__(self, clients: GoogleCloudClients) -> None:
        self._clients = clients

    async def list_review_items(self, user_id: str) -> list[ReviewItem]:
        query = self._review_items_collection(user_id).order_by("created_at")
        items: list[ReviewItem] = []

        async for snapshot in query.stream():
            data = snapshot.to_dict()
            if data is None:
                continue

            data.setdefault("id", snapshot.id)
            data.setdefault("user_id", user_id)
            items.append(ReviewItem.model_validate(data))

        return items

    async def create_review_items(self, user_id: str, concepts: list[str]) -> list[ReviewItem]:
        items = [ReviewItem(user_id=user_id, concept=concept) for concept in concepts]
        for item in items:
            await self._review_items_collection(user_id).document(item.id).set(
                item.model_dump(mode="python")
            )

        return items

    def _review_items_collection(self, user_id: str):
        return self._clients.firestore.collection("users").document(user_id).collection(
            "review_items"
        )


class GeminiDocumentIngestionGateway(DocumentIngestionGateway):
    def __init__(self, clients: GoogleCloudClients, settings: Settings) -> None:
        self._clients = clients
        self._settings = settings

    async def ingest(
        self,
        material: StudyMaterial,
        text_content: str | None = None,
    ) -> DocumentIngestionResult:
        response = await asyncio.to_thread(
            self._clients.genai.models.generate_content,
            model=self._settings.gemini_document_model,
            contents=build_document_ingestion_contents(material, text_content),
            config=build_document_ingestion_config(),
        )
        return parse_document_ingestion_response(response)


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


def _safe_filename(filename: str) -> str:
    name = PurePath(filename).name.strip()
    return name or "study-material"


def _safe_path_segment(value: str) -> str:
    return value.replace("/", "_")
