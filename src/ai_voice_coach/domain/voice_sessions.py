from pydantic import BaseModel, Field


class VoiceEvent(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)
