from types import SimpleNamespace

import pytest

from ai_voice_coach.config import Settings
from ai_voice_coach.domain.study_materials import StudyMaterial
from ai_voice_coach.infrastructure.google_cloud.adapters import GeminiDocumentIngestionGateway
from ai_voice_coach.infrastructure.google_cloud.document_ingestion import (
    build_document_ingestion_config,
    build_document_ingestion_contents,
    parse_document_ingestion_response,
)


def test_document_ingestion_config_requests_json_schema() -> None:
    config = build_document_ingestion_config()

    assert config.response_mime_type == "application/json"
    assert config.response_schema["required"] == ["summary", "key_concepts", "review_items"]


def test_document_ingestion_contents_use_gcs_uri_for_pdf() -> None:
    material = StudyMaterial(
        id="material-1",
        user_id="dev-user",
        title="Chapter 1",
        source_type="pdf",
        storage_path="users/dev-user/study_materials/uploads/chapter.pdf",
        storage_bucket="study-materials",
        content_type="application/pdf",
    )

    contents = build_document_ingestion_contents(material)

    assert contents[0].file_data.file_uri == (
        "gs://study-materials/users/dev-user/study_materials/uploads/chapter.pdf"
    )
    assert contents[0].file_data.mime_type == "application/pdf"


def test_document_ingestion_contents_include_decoded_text_for_text_files() -> None:
    material = StudyMaterial(
        id="material-1",
        user_id="dev-user",
        title="Chapter 1",
        source_type="other",
        storage_path="memory://users/dev-user/study_materials/chapter.txt",
        content_type="text/plain",
    )

    contents = build_document_ingestion_contents(material, text_content="chapter notes")

    assert contents[1].text == "Document text:\nchapter notes"


def test_parse_document_ingestion_response_dedupes_lists() -> None:
    response = SimpleNamespace(
        text=(
            '{"summary":"A summary","key_concepts":["Photosynthesis","photosynthesis"],'
            '"review_items":["Chlorophyll"]}'
        )
    )

    result = parse_document_ingestion_response(response)

    assert result.summary == "A summary"
    assert result.key_concepts == ["Photosynthesis"]
    assert result.review_items == ["Chlorophyll"]


class FakeModels:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            text=(
                '{"summary":"Generated summary","key_concepts":["Concept A"],'
                '"review_items":["Concept A"]}'
            )
        )


class FakeGenai:
    def __init__(self) -> None:
        self.models = FakeModels()


class FakeClients:
    def __init__(self) -> None:
        self.genai = FakeGenai()


@pytest.mark.asyncio
async def test_gemini_document_ingestion_gateway_calls_generate_content() -> None:
    clients = FakeClients()
    gateway = GeminiDocumentIngestionGateway(
        clients,
        Settings(GEMINI_DOCUMENT_MODEL="gemini-2.5-flash"),
    )
    material = StudyMaterial(
        id="material-1",
        user_id="dev-user",
        title="Chapter 1",
        source_type="other",
        storage_path="memory://users/dev-user/study_materials/chapter.txt",
        content_type="text/plain",
    )

    result = await gateway.ingest(material, text_content="chapter notes")

    assert clients.genai.models.calls[0]["model"] == "gemini-2.5-flash"
    assert result.summary == "Generated summary"
    assert result.key_concepts == ["Concept A"]
    assert result.review_items == ["Concept A"]
