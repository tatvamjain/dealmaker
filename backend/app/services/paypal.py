import logging
import time

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


class PayPalError(Exception):
    """Raised when PayPal returns an error we can't recover from."""


class PayPalClient:
    def __init__(self, settings: Settings) -> None:
        self._client_id = settings.paypal_client_id
        self._client_secret = settings.paypal_client_secret.get_secret_value()
        self._token: str | None = None
        self._token_expires_at: float = 0.0
        self._http = httpx.AsyncClient(base_url=settings.paypal_base_url, timeout=10.0)

    async def get_access_token(self) -> str:
        # Reuse the cached token if it has more than 60 seconds left
        if self._token and time.time() < self._token_expires_at - 60:
            return self._token

        response = await self._http.post(
            "/v1/oauth2/token",
            auth=(self._client_id, self._client_secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json"},
        )
        if response.status_code != 200:
            raise PayPalError(f"Token request failed with status {response.status_code}")

        payload = response.json()
        self._token = payload["access_token"]
        self._token_expires_at = time.time() + payload["expires_in"]
        return self._token

    async def close(self) -> None:
        await self._http.aclose()