import asyncio
from collections.abc import Callable, Mapping
from typing import Any

import firebase_admin
from firebase_admin import auth

from ai_voice_coach.application.auth import (
    AuthConfigurationError,
    AuthTokenInvalidError,
    AuthTokenMissingError,
    AuthVerifier,
)
from ai_voice_coach.config import Settings
from ai_voice_coach.domain.users import User

VerifyIdToken = Callable[[str, bool], Mapping[str, Any]]

_FIREBASE_APP_NAME = "ai-voice-coach"


class DevAuthVerifier(AuthVerifier):
    def __init__(self, dev_user_id: str) -> None:
        self._dev_user_id = dev_user_id

    async def verify_id_token(self, token: str | None) -> User:
        return User(id=self._dev_user_id, display_name="Local Dev User")


class FirebaseAuthVerifier(AuthVerifier):
    def __init__(
        self,
        settings: Settings,
        verify_id_token: VerifyIdToken | None = None,
    ) -> None:
        self._settings = settings
        self._verify_id_token = verify_id_token

    async def verify_id_token(self, token: str | None) -> User:
        if not token:
            raise AuthTokenMissingError("Firebase ID token is required.")

        try:
            decoded_token = await asyncio.to_thread(self._verify_token, token)
        except AuthConfigurationError:
            raise
        except Exception as exc:
            raise AuthTokenInvalidError("Firebase ID token is invalid.") from exc

        uid = decoded_token.get("uid")
        if not uid:
            raise AuthTokenInvalidError("Firebase ID token is missing a uid.")

        self._validate_sign_in_provider(decoded_token)

        display_name = decoded_token.get("name") or decoded_token.get("email") or uid
        return User(id=str(uid), display_name=str(display_name))

    def _validate_sign_in_provider(self, decoded_token: Mapping[str, Any]) -> None:
        allowed_provider = self._settings.firebase_allowed_sign_in_provider
        if not allowed_provider:
            return

        firebase_claims = decoded_token.get("firebase")
        sign_in_provider = (
            firebase_claims.get("sign_in_provider")
            if isinstance(firebase_claims, Mapping)
            else None
        )

        if sign_in_provider != allowed_provider:
            raise AuthTokenInvalidError("Firebase ID token uses an unsupported sign-in provider.")

    def _verify_token(self, token: str) -> Mapping[str, Any]:
        if self._verify_id_token is not None:
            return self._verify_id_token(token, self._settings.firebase_check_revoked)

        return auth.verify_id_token(
            token,
            app=self._firebase_app(),
            check_revoked=self._settings.firebase_check_revoked,
        )

    def _firebase_app(self):
        project_id = self._settings.resolved_firebase_project_id
        if not project_id:
            raise AuthConfigurationError(
                "FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT is required in Firebase auth mode."
            )

        try:
            return firebase_admin.get_app(_FIREBASE_APP_NAME)
        except ValueError:
            return firebase_admin.initialize_app(
                options={"projectId": project_id},
                name=_FIREBASE_APP_NAME,
            )
