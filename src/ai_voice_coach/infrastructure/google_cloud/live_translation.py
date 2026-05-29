from base64 import b64decode, b64encode
from dataclasses import dataclass
from typing import Any

from google.genai import types

from ai_voice_coach.config import Settings
from ai_voice_coach.domain.voice_sessions import VoiceEvent

DEFAULT_INPUT_AUDIO_MIME_TYPE = "audio/pcm;rate=16000"
DEFAULT_OUTPUT_AUDIO_MIME_TYPE = "audio/pcm;rate=24000"


@dataclass(frozen=True)
class GeminiRealtimeAudio:
    data: bytes
    mime_type: str = DEFAULT_INPUT_AUDIO_MIME_TYPE


@dataclass(frozen=True)
class GeminiClientContent:
    text: str
    turn_complete: bool = True


@dataclass(frozen=True)
class GeminiAudioStreamEnd:
    pass


GeminiClientSend = GeminiRealtimeAudio | GeminiClientContent | GeminiAudioStreamEnd


def build_live_connect_config(settings: Settings) -> types.LiveConnectConfig:
    return types.LiveConnectConfig(
        response_modalities=settings.gemini_response_modality_list,
        system_instruction=settings.gemini_system_instruction,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )


def client_event_to_gemini_send(event: VoiceEvent) -> GeminiClientSend | None:
    if event.type == "session.start":
        text = event.payload.get("text")
        if isinstance(text, str) and text.strip():
            return GeminiClientContent(text=text)
        return None

    if event.type in {"text.message", "coach.prompt"}:
        text = event.payload.get("text")
        if isinstance(text, str) and text.strip():
            return GeminiClientContent(text=text)
        return None

    if event.type == "audio.chunk":
        raw_data = event.payload.get("data")
        if not isinstance(raw_data, str) or not raw_data:
            return None
        return GeminiRealtimeAudio(
            data=b64decode(raw_data),
            mime_type=event.payload.get("mime_type", DEFAULT_INPUT_AUDIO_MIME_TYPE),
        )

    if event.type == "session.stop":
        return GeminiAudioStreamEnd()

    return None


def live_server_message_to_voice_events(message: Any) -> list[VoiceEvent]:
    events: list[VoiceEvent] = []

    if getattr(message, "setup_complete", None):
        events.append(VoiceEvent(type="session.ready"))

    server_content = getattr(message, "server_content", None)
    if server_content is None:
        return events

    events.extend(_transcription_events(server_content))

    model_turn = getattr(server_content, "model_turn", None)
    for part in getattr(model_turn, "parts", None) or []:
        text = getattr(part, "text", None)
        if text:
            events.append(VoiceEvent(type="coach.message", payload={"text": text}))

        inline_data = getattr(part, "inline_data", None)
        data = getattr(inline_data, "data", None)
        if data:
            mime_type = getattr(inline_data, "mime_type", None) or DEFAULT_OUTPUT_AUDIO_MIME_TYPE
            encoded_data = b64encode(data).decode("ascii") if isinstance(data, bytes) else data
            events.append(
                VoiceEvent(
                    type="audio.chunk",
                    payload={"data": encoded_data, "mime_type": mime_type},
                )
            )

    if getattr(server_content, "turn_complete", False):
        events.append(VoiceEvent(type="turn.complete"))

    if getattr(server_content, "interrupted", False):
        events.append(VoiceEvent(type="turn.interrupted"))

    return events


def _transcription_events(server_content: Any) -> list[VoiceEvent]:
    events: list[VoiceEvent] = []

    input_transcription = getattr(server_content, "input_transcription", None)
    input_text = getattr(input_transcription, "text", None)
    if input_text:
        events.append(VoiceEvent(type="transcript.partial", payload={"text": input_text}))

    output_transcription = getattr(server_content, "output_transcription", None)
    output_text = getattr(output_transcription, "text", None)
    if output_text:
        events.append(VoiceEvent(type="coach.message", payload={"text": output_text}))

    return events
