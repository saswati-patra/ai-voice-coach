import pytest

from ai_voice_coach.application.auth import AuthTokenInvalidError, AuthTokenMissingError
from ai_voice_coach.config import Settings
from ai_voice_coach.infrastructure.auth import DevAuthVerifier, FirebaseAuthVerifier


@pytest.mark.asyncio
async def test_dev_auth_verifier_returns_local_user() -> None:
    verifier = DevAuthVerifier("dev-user")

    user = await verifier.verify_id_token(None)

    assert user.id == "dev-user"
    assert user.display_name == "Local Dev User"


@pytest.mark.asyncio
async def test_firebase_auth_verifier_returns_decoded_uid_and_display_name() -> None:
    def verify_id_token(token: str, check_revoked: bool):
        assert token == "valid-token"
        assert check_revoked is True
        return {
            "uid": "firebase-user",
            "email": "learner@example.com",
            "firebase": {"sign_in_provider": "google.com"},
        }

    verifier = FirebaseAuthVerifier(
        Settings(FIREBASE_CHECK_REVOKED=True),
        verify_id_token=verify_id_token,
    )

    user = await verifier.verify_id_token("valid-token")

    assert user.id == "firebase-user"
    assert user.display_name == "learner@example.com"


@pytest.mark.asyncio
async def test_firebase_auth_verifier_rejects_non_google_sign_in_provider() -> None:
    def verify_id_token(token: str, check_revoked: bool):
        return {
            "uid": "firebase-user",
            "email": "learner@example.com",
            "firebase": {"sign_in_provider": "password"},
        }

    verifier = FirebaseAuthVerifier(Settings(), verify_id_token=verify_id_token)

    with pytest.raises(AuthTokenInvalidError):
        await verifier.verify_id_token("password-token")


@pytest.mark.asyncio
async def test_firebase_auth_verifier_rejects_missing_token() -> None:
    verifier = FirebaseAuthVerifier(Settings(), verify_id_token=lambda token, check: {})

    with pytest.raises(AuthTokenMissingError):
        await verifier.verify_id_token(None)


@pytest.mark.asyncio
async def test_firebase_auth_verifier_rejects_invalid_token() -> None:
    def verify_id_token(token: str, check_revoked: bool):
        raise ValueError("invalid")

    verifier = FirebaseAuthVerifier(Settings(), verify_id_token=verify_id_token)

    with pytest.raises(AuthTokenInvalidError):
        await verifier.verify_id_token("invalid-token")
