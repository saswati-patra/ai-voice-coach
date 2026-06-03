from collections.abc import AsyncIterator

import pytest

from ai_voice_coach.domain.study_materials import StudyMaterialDraft, StudyMaterialIngestionUpdate
from ai_voice_coach.infrastructure.google_cloud.adapters import (
    GoogleCloudLearningMemoryStore,
    GoogleCloudStudyMaterialStore,
)


class FakeDocumentSnapshot:
    def __init__(self, document_id: str, data: dict | None) -> None:
        self.id = document_id
        self._data = data
        self.exists = data is not None

    def to_dict(self) -> dict | None:
        if self._data is None:
            return None
        return dict(self._data)


class FakeDocumentReference:
    def __init__(self, firestore, path: tuple[str, ...]) -> None:
        self._firestore = firestore
        self._path = path

    def collection(self, collection_name: str):
        return FakeCollectionReference(self._firestore, (*self._path, collection_name))

    async def set(self, data: dict) -> None:
        self._firestore.documents[self._path] = dict(data)

    async def get(self) -> FakeDocumentSnapshot:
        return FakeDocumentSnapshot(self._path[-1], self._firestore.documents.get(self._path))

    async def update(self, data: dict) -> None:
        self._firestore.documents[self._path].update(data)


class FakeCollectionReference:
    def __init__(self, firestore, path: tuple[str, ...]) -> None:
        self._firestore = firestore
        self._path = path
        self.ordered_by: str | None = None

    def document(self, document_id: str):
        return FakeDocumentReference(self._firestore, (*self._path, document_id))

    def order_by(self, field_name: str):
        query = FakeCollectionReference(self._firestore, self._path)
        query.ordered_by = field_name
        return query

    async def stream(self) -> AsyncIterator[FakeDocumentSnapshot]:
        documents = [
            (path[-1], data)
            for path, data in self._firestore.documents.items()
            if path[:-1] == self._path
        ]

        if self.ordered_by is not None:
            documents.sort(key=lambda item: item[1][self.ordered_by])

        for document_id, data in documents:
            yield FakeDocumentSnapshot(document_id, data)


class FakeFirestore:
    def __init__(self) -> None:
        self.documents: dict[tuple[str, ...], dict] = {}

    def collection(self, collection_name: str):
        return FakeCollectionReference(self, (collection_name,))


class FakeClients:
    def __init__(self) -> None:
        self.firestore = FakeFirestore()


@pytest.mark.asyncio
async def test_google_cloud_study_material_store_creates_firestore_document() -> None:
    clients = FakeClients()
    store = GoogleCloudStudyMaterialStore(clients)

    material = await store.create("dev-user", StudyMaterialDraft(title="Chapter 1 Notes"))

    document_path = ("users", "dev-user", "study_materials", material.id)
    saved = clients.firestore.documents[document_path]

    assert saved["id"] == material.id
    assert saved["user_id"] == "dev-user"
    assert saved["title"] == "Chapter 1 Notes"
    assert saved["source_type"] == "note"
    assert saved["created_at"] == material.created_at


@pytest.mark.asyncio
async def test_google_cloud_study_material_store_lists_user_materials() -> None:
    clients = FakeClients()
    store = GoogleCloudStudyMaterialStore(clients)

    first = await store.create("dev-user", StudyMaterialDraft(title="Chapter 1 Notes"))
    second = await store.create("dev-user", StudyMaterialDraft(title="Chapter 2 Notes"))
    await store.create("other-user", StudyMaterialDraft(title="Other Notes"))

    materials = await store.list_for_user("dev-user")

    assert materials == [first, second]


@pytest.mark.asyncio
async def test_google_cloud_study_material_store_gets_and_updates_ingestion_fields() -> None:
    clients = FakeClients()
    store = GoogleCloudStudyMaterialStore(clients)
    material = await store.create("dev-user", StudyMaterialDraft(title="Chapter 1 Notes"))

    loaded = await store.get("dev-user", material.id)
    updated = await store.update_ingestion(
        "dev-user",
        material.id,
        StudyMaterialIngestionUpdate(
            ingestion_status="completed",
            summary="Chapter summary",
            key_concepts=["photosynthesis"],
        ),
    )

    assert loaded == material
    assert updated.ingestion_status == "completed"
    assert updated.summary == "Chapter summary"
    assert updated.key_concepts == ["photosynthesis"]


@pytest.mark.asyncio
async def test_google_cloud_learning_memory_store_creates_and_lists_review_items() -> None:
    clients = FakeClients()
    store = GoogleCloudLearningMemoryStore(clients)

    created = await store.create_review_items("dev-user", ["photosynthesis", "cellular respiration"])
    listed = await store.list_review_items("dev-user")

    assert listed == created
