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
    assert 'id="root"' in response.text


def test_cloud_frontend_routes_redirect_to_hosted_frontend(monkeypatch) -> None:
    from ai_voice_coach import config

    monkeypatch.setenv("FRONTEND_BASE_URL", "https://ai-voice-coach-dev.web.app")
    config.get_settings.cache_clear()
    client = TestClient(create_app())

    root = client.get("/", follow_redirects=False)
    login = client.get("/login", follow_redirects=False)
    health = client.get("/health")

    assert root.status_code == 307
    assert root.headers["location"] == "https://ai-voice-coach-dev.web.app"
    assert login.status_code == 307
    assert login.headers["location"] == "https://ai-voice-coach-dev.web.app/login"
    assert health.status_code == 200

    config.get_settings.cache_clear()


def test_frontend_asset_is_served_after_build() -> None:
    client = TestClient(create_app())

    index = client.get("/")
    asset_path = index.text.split('src="', 1)[1].split('"', 1)[0]
    if not asset_path.startswith("/assets/"):
        assert asset_path == "/src/main.tsx"
        return

    response = client.get(asset_path)

    assert response.status_code == 200
    assert "AI Voice Coach" in response.text or "firebase" in response.text


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


def test_study_material_upload_round_trip() -> None:
    client = TestClient(create_app())

    uploaded = client.post(
        "/api/v1/study-materials/upload",
        data={"title": "Uploaded Chapter"},
        files={"file": ("chapter.pdf", b"pdf bytes", "application/pdf")},
    )
    listed = client.get("/api/v1/study-materials")

    assert uploaded.status_code == 200
    body = uploaded.json()
    assert body["title"] == "Uploaded Chapter"
    assert body["source_type"] == "pdf"
    assert body["storage_path"] == "memory://users/dev-user/study_materials/chapter.pdf"
    assert body["original_filename"] == "chapter.pdf"
    assert body["content_type"] == "application/pdf"
    assert body["size_bytes"] == len(b"pdf bytes")
    assert listed.json()[0]["id"] == body["id"]


def test_study_material_ingest_round_trip() -> None:
    client = TestClient(create_app())

    uploaded = client.post(
        "/api/v1/study-materials/upload",
        data={"title": "Uploaded Chapter"},
        files={"file": ("chapter.txt", b"study notes", "text/plain")},
    )
    material_id = uploaded.json()["id"]
    ingested = client.post(f"/api/v1/study-materials/{material_id}/ingest")
    listed = client.get("/api/v1/study-materials")
    review_items = client.get("/api/v1/review-items")

    assert ingested.status_code == 200
    assert ingested.json()["ingestion_status"] == "completed"
    assert ingested.json()["summary"] == "Stub summary for Uploaded Chapter."
    assert listed.json()[0]["ingestion_status"] == "completed"
    assert {item["concept"] for item in review_items.json()} >= {
        "active recall",
        "spaced repetition",
        "voice coaching",
    }


def test_study_material_ingest_returns_404_for_missing_material() -> None:
    client = TestClient(create_app())

    response = client.post("/api/v1/study-materials/missing/ingest")

    assert response.status_code == 404


def test_study_material_ingest_rejects_non_uploaded_note() -> None:
    client = TestClient(create_app())

    created = client.post(
        "/api/v1/study-materials",
        json={"title": "Loose Note", "source_type": "note"},
    )
    response = client.post(f"/api/v1/study-materials/{created.json()['id']}/ingest")

    assert response.status_code == 400


def test_study_material_upload_rejects_empty_file() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/v1/study-materials/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file is empty."


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
