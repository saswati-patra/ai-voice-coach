import pytest

from ai_voice_coach.config import Settings
from ai_voice_coach.domain.study_materials import StudyMaterial
from ai_voice_coach.infrastructure.google_cloud.adapters import GoogleCloudStudyMaterialDocumentStore


class FakeBlob:
    def __init__(self) -> None:
        self.uploaded_content: bytes | None = None
        self.content_type: str | None = None

    def upload_from_string(self, content: bytes, content_type: str) -> None:
        self.uploaded_content = content
        self.content_type = content_type

    def download_as_bytes(self) -> bytes:
        if self.uploaded_content is None:
            raise FileNotFoundError
        return self.uploaded_content


class FakeBucket:
    def __init__(self) -> None:
        self.blobs: dict[str, FakeBlob] = {}

    def blob(self, storage_path: str) -> FakeBlob:
        return self.blobs.setdefault(storage_path, FakeBlob())


class FakeStorage:
    def __init__(self) -> None:
        self.buckets: dict[str, FakeBucket] = {}

    def bucket(self, bucket_name: str) -> FakeBucket:
        bucket = self.buckets.setdefault(bucket_name, FakeBucket())
        return bucket


class FakeClients:
    def __init__(self) -> None:
        self.storage = FakeStorage()


@pytest.mark.asyncio
async def test_google_cloud_document_store_uploads_to_cloud_storage_bucket() -> None:
    clients = FakeClients()
    settings = Settings(GOOGLE_CLOUD_STORAGE_BUCKET="study-materials-bucket")
    store = GoogleCloudStudyMaterialDocumentStore(clients, settings)

    document = await store.upload(
        user_id="dev/user",
        filename="../chapter-1.pdf",
        content_type="application/pdf",
        content=b"pdf bytes",
    )

    bucket = clients.storage.buckets["study-materials-bucket"]
    blob = bucket.blobs[document.storage_path]

    assert document.storage_bucket == "study-materials-bucket"
    assert document.storage_path.startswith("users/dev_user/study_materials/uploads/")
    assert document.storage_path.endswith("-chapter-1.pdf")
    assert document.original_filename == "chapter-1.pdf"
    assert document.content_type == "application/pdf"
    assert document.size_bytes == len(b"pdf bytes")
    assert blob.uploaded_content == b"pdf bytes"
    assert blob.content_type == "application/pdf"


@pytest.mark.asyncio
async def test_google_cloud_document_store_requires_bucket_setting() -> None:
    store = GoogleCloudStudyMaterialDocumentStore(
        FakeClients(),
        Settings(GOOGLE_CLOUD_STORAGE_BUCKET=None),
    )

    with pytest.raises(RuntimeError, match="GOOGLE_CLOUD_STORAGE_BUCKET"):
        await store.upload(
            user_id="dev-user",
            filename="chapter-1.pdf",
            content_type="application/pdf",
            content=b"pdf bytes",
        )


@pytest.mark.asyncio
async def test_google_cloud_document_store_reads_text_from_cloud_storage() -> None:
    clients = FakeClients()
    settings = Settings(GOOGLE_CLOUD_STORAGE_BUCKET="study-materials-bucket")
    store = GoogleCloudStudyMaterialDocumentStore(clients, settings)
    document = await store.upload(
        user_id="dev-user",
        filename="notes.txt",
        content_type="text/plain",
        content=b"hello notes",
    )

    text = await store.read_text(
        StudyMaterial(
            id="material-1",
            user_id="dev-user",
            title="Notes",
            source_type="other",
            storage_path=document.storage_path,
            storage_bucket=document.storage_bucket,
            original_filename=document.original_filename,
            content_type=document.content_type,
            size_bytes=document.size_bytes,
        )
    )

    assert text == "hello notes"
