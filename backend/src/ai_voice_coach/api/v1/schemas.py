from typing import Literal

from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    id: str
    display_name: str


class StudyMaterialCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_type: Literal["note", "pdf", "url", "other"] = "note"
