from base64 import b64encode
from types import SimpleNamespace

from google.genai import types

from ai_voice_coach.config import Settings
from ai_voice_coach.domain.voice_sessions import VoiceEvent
from ai_voice_coach.infrastructure.google_cloud.live_translation import (
    GeminiAudioStreamEnd,
    GeminiClientContent,
    GeminiRealtimeAudio,
    build_live_connect_config,
    client_event_to_gemini_send,
    live_server_message_to_voice_events,
)


def test_build_live_connect_config_includes_modalities_and_transcription() -> None:
    config = build_live_connect_config(Settings())

    assert [modality.value for modality in config.response_modalities] == ["AUDIO"]
    assert config.input_audio_transcription is not None
    assert config.output_audio_transcription is not None
    assert "study coach" in config.system_instruction


def test_text_client_event_translates_to_client_content() -> None:
    send = client_event_to_gemini_send(
        VoiceEvent(type="text.message", payload={"text": "Quiz me on chapter one."})
    )

    assert send == GeminiClientContent(text="Quiz me on chapter one.")


def test_audio_client_event_translates_from_base64() -> None:
    send = client_event_to_gemini_send(
        VoiceEvent(
            type="audio.chunk",
            payload={
                "data": b64encode(b"audio-bytes").decode("ascii"),
                "mime_type": "audio/pcm;rate=16000",
            },
        )
    )

    assert send == GeminiRealtimeAudio(data=b"audio-bytes", mime_type="audio/pcm;rate=16000")


def test_session_stop_translates_to_audio_stream_end() -> None:
    send = client_event_to_gemini_send(VoiceEvent(type="session.stop"))

    assert send == GeminiAudioStreamEnd()


def test_live_server_message_translates_text_audio_and_transcript() -> None:
    message = types.LiveServerMessage(
        setup_complete=types.LiveServerSetupComplete(),
        server_content=types.LiveServerContent(
            input_transcription=SimpleNamespace(text="learner answer"),
            model_turn=types.Content(
                parts=[
                    types.Part(text="Good start."),
                    types.Part(
                        inline_data=types.Blob(
                            data=b"audio-response",
                            mime_type="audio/pcm;rate=24000",
                        )
                    ),
                ]
            ),
            turn_complete=True,
        ),
    )

    events = live_server_message_to_voice_events(message)

    assert events[0].type == "session.ready"
    assert VoiceEvent(type="transcript.partial", payload={"text": "learner answer"}) in events
    assert VoiceEvent(type="coach.message", payload={"text": "Good start."}) in events
    assert (
        VoiceEvent(
            type="audio.chunk",
            payload={
                "data": b64encode(b"audio-response").decode("ascii"),
                "mime_type": "audio/pcm;rate=24000",
            },
        )
        in events
    )
    assert events[-1].type == "turn.complete"
