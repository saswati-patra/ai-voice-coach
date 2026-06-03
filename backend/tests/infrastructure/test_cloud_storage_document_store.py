import pytest

from ai_voice_coach.config import Settings
from ai_voice_coach.infrastructure.google_cloud.adapters import GoogleCloudStudyMaterialDocumentStore


class FakeBlob:
    def __init__(self) -> None:
        self.uploaded_content: bytes | None = None
        self.content_type: str | None = None

    def upload_from_string(self, content: bytes, content_type: str) -> None:
        self.uploaded_content = content
        self.content_type = content_type


class FakeBucket:
    def __init__(self) -> None:
        self.blobs: dict[str, FakeBlob] = {}

    def blob(self, storage_path: str) -> FakeBlob:
        blob = FakeBlob()
        self.blobs[storage_path] = blob
        return blob


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
