import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from ai_voice_coach.application.auth import AuthTokenInvalidError, AuthTokenMissingError
from ai_voice_coach.domain.users import User
from ai_voice_coach.main import create_app


class FakeFirebaseAuthVerifier:
    async def verify_id_token(self, token: str | None) -> User:
        if token is None:
            raise AuthTokenMissingError("missing")
        if token != "valid-token":
            raise AuthTokenInvalidError("invalid")

        return User(id="firebase-user", display_name="Firebase User")


def use_firebase_auth(monkeypatch) -> None:
    from ai_voice_coach import config, dependencies

    monkeypatch.setenv("AUTH_MODE", "firebase")
    config.get_settings.cache_clear()
    dependencies.get_auth_verifier.cache_clear()
    monkeypatch.setattr(dependencies, "get_auth_verifier", lambda: FakeFirebaseAuthVerifier())


def auth_headers(token: str = "valid-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_firebase_mode_missing_bearer_token_returns_401(monkeypatch) -> None:
    use_firebase_auth(monkeypatch)
    client = TestClient(create_app())

    response = client.get("/api/v1/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required."


def test_firebase_mode_invalid_bearer_token_returns_401(monkeypatch) -> None:
    use_firebase_auth(monkeypatch)
    client = TestClient(create_app())

    response = client.get("/api/v1/me", headers=auth_headers("bad-token"))

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication token."


def test_firebase_mode_me_returns_authenticated_uid(monkeypatch) -> None:
    use_firebase_auth(monkeypatch)
    client = TestClient(create_app())

    response = client.get("/api/v1/me", headers=auth_headers())

    assert response.status_code == 200
    assert response.json() == {"id": "firebase-user", "display_name": "Firebase User"}


def test_firebase_mode_uses_uid_for_study_materials(monkeypatch) -> None:
    use_firebase_auth(monkeypatch)
    client = TestClient(create_app())

    created = client.post(
        "/api/v1/study-materials",
        json={"title": "Firebase Notes", "source_type": "note"},
        headers=auth_headers(),
    )
    listed = client.get("/api/v1/study-materials", headers=auth_headers())

    assert created.status_code == 200
    assert listed.status_code == 200
    assert listed.json()[0]["title"] == "Firebase Notes"
    assert listed.json()[0]["user_id"] == "firebase-user"


def test_firebase_mode_websocket_rejects_missing_query_token(monkeypatch) -> None:
    use_firebase_auth(monkeypatch)
    client = TestClient(create_app())

    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/api/v1/ws/voice-session"):
            pass

    assert exc.value.code == 1008


def test_firebase_mode_websocket_accepts_valid_query_token(monkeypatch) -> None:
    use_firebase_auth(monkeypatch)
    client = TestClient(create_app())

    with client.websocket_connect("/api/v1/ws/voice-session?id_token=valid-token") as websocket:
        started = websocket.receive_json()
        websocket.send_json({"type": "session.stop", "payload": {}})
        stopped = websocket.receive_json()

    assert started == {"type": "session.started", "payload": {"mode": "stub"}}
    assert stopped == {"type": "session.stopped", "payload": {}}
