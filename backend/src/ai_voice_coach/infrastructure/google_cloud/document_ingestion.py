import json
from typing import Any

from google.genai import types

from ai_voice_coach.domain.study_materials import DocumentIngestionResult, StudyMaterial

DOCUMENT_INGESTION_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "key_concepts": {"type": "ARRAY", "items": {"type": "STRING"}},
        "review_items": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": ["summary", "key_concepts", "review_items"],
}


DOCUMENT_INGESTION_PROMPT = """
You are helping build an AI study coach.
Analyze the study material and return JSON that matches the provided schema:
- summary: a concise learner-friendly summary
- key_concepts: important concepts, terms, or skills in the material
- review_items: short concepts the learner should practice with spaced repetition
Keep items specific and useful for a voice coaching session.
"""


def build_document_ingestion_config() -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=DOCUMENT_INGESTION_RESPONSE_SCHEMA,
        temperature=0.2,
    )


def build_document_ingestion_contents(
    material: StudyMaterial,
    text_content: str | None = None,
) -> list[types.Part | str]:
    if material.content_type == "application/pdf":
        return [
            types.Part.from_uri(file_uri=_material_gs_uri(material), mime_type="application/pdf"),
            DOCUMENT_INGESTION_PROMPT,
        ]

    if text_content is None:
        raise ValueError("Text study materials require decoded text content.")

    return [
        types.Part.from_text(text=DOCUMENT_INGESTION_PROMPT),
        types.Part.from_text(text=f"Document text:\n{text_content}"),
    ]


def parse_document_ingestion_response(response: Any) -> DocumentIngestionResult:
    raw_text = getattr(response, "text", "")
    data = json.loads(raw_text)

    return DocumentIngestionResult(
        summary=str(data["summary"]).strip(),
        key_concepts=_string_list(data.get("key_concepts", [])),
        review_items=_string_list(data.get("review_items", [])),
    )


def _material_gs_uri(material: StudyMaterial) -> str:
    if not material.storage_bucket or not material.storage_path:
        raise ValueError("PDF ingestion requires a Cloud Storage bucket and object path.")

    return f"gs://{material.storage_bucket}/{material.storage_path}"


def _string_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []

    deduped: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value).strip()
        key = text.lower()
        if text and key not in seen:
            deduped.append(text)
            seen.add(key)

    return deduped
