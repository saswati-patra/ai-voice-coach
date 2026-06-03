from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

SourceType = Literal["note", "pdf", "url", "other"]


class StudyMaterialDraft(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_type: SourceType = "note"
    storage_path: str | None = None
    storage_bucket: str | None = None
    original_filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = Field(default=None, ge=0)


class StudyMaterial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    title: str
    source_type: SourceType
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    storage_path: str | None = None
    storage_bucket: str | None = None
    original_filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = Field(default=None, ge=0)


class StoredStudyDocument(BaseModel):
    storage_path: str
    storage_bucket: str | None = None
    original_filename: str
    content_type: str
    size_bytes: int = Field(ge=0)
