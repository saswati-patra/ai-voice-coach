from abc import ABC, abstractmethod

from ai_voice_coach.domain.users import User


class AuthError(Exception):
    pass


class AuthTokenMissingError(AuthError):
    pass


class AuthTokenInvalidError(AuthError):
    pass


class AuthConfigurationError(AuthError):
    pass


class AuthVerifier(ABC):
    @abstractmethod
    async def verify_id_token(self, token: str | None) -> User:
        raise NotImplementedError
