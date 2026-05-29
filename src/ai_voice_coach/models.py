from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    app_name: str
    app_env: str
    adapter_mode: str


class UserProfile(BaseModel):
    id: str
    display_name: str


class StudyMaterialCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_type: Literal["note", "pdf", "url", "other"] = "note"


class StudyMaterial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    title: str
    source_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ReviewItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    concept: str
    status: Literal["needs_review", "learning", "mastered"] = "needs_review"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class VoiceEvent(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)
