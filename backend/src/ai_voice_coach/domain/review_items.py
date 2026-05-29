from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

ReviewStatus = Literal["needs_review", "learning", "mastered"]


class ReviewItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    concept: str
    status: ReviewStatus = "needs_review"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
