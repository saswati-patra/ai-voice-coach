from fastapi.testclient import TestClient

from ai_voice_coach.main import create_app


def test_health_uses_stub_mode() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["adapter_mode"] == "stub"


def test_index_serves_voice_harness() -> None:
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert "AI Voice Coach" in response.text
    assert "/api/v1/ws/voice-session" in response.text


def test_me_returns_local_dev_user() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    assert response.json() == {"id": "dev-user", "display_name": "Local Dev User"}


def test_study_materials_round_trip() -> None:
    client = TestClient(create_app())

    created = client.post(
        "/api/v1/study-materials",
        json={"title": "Chapter 1 Notes", "source_type": "note"},
    )
    listed = client.get("/api/v1/study-materials")

    assert created.status_code == 200
    assert listed.status_code == 200
    assert listed.json()[0]["title"] == "Chapter 1 Notes"


def test_review_items_have_learning_seed() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/review-items")

    assert response.status_code == 200
    assert response.json()[0]["concept"] == "Explain the voice coach architecture"


def test_voice_session_websocket_stub_flow() -> None:
    client = TestClient(create_app())

    with client.websocket_connect("/api/v1/ws/voice-session") as websocket:
        started = websocket.receive_json()
        websocket.send_json({"type": "audio.chunk", "payload": {"data": "stub"}})
        message = websocket.receive_json()
        websocket.send_json({"type": "session.stop", "payload": {}})
        stopped = websocket.receive_json()

    assert started == {"type": "session.started", "payload": {"mode": "stub"}}
    assert message["type"] == "coach.message"
    assert stopped == {"type": "session.stopped", "payload": {}}
