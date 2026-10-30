import logging
import time
from decimal import Decimal
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

    async def _headers(self, request_id: str | None = None) -> dict[str, str]:
        token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if request_id:
            headers["PayPal-Request-Id"] = request_id
        return headers

    @staticmethod
    def _parse(response: httpx.Response) -> dict:
        if response.status_code in (200, 201):
            return response.json()
        try:
            debug_id = response.json().get("debug_id", "unknown")
        except ValueError:
            debug_id = "unknown"
        raise PayPalError(f"PayPal error {response.status_code} (debug_id={debug_id})")

    async def create_order(
        self,
        *,
        amount: Decimal,
        currency: str,
        description: str,
        return_url: str,
        cancel_url: str,
        request_id: str,
    ) -> dict:
        body = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "description": description,
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                }
            ],
            "payment_source": {
                "paypal": {
                    "experience_context": {
                        "return_url": return_url,
                        "cancel_url": cancel_url,
                        "user_action": "PAY_NOW",
                    }
                }
            },
        }
        response = await self._http.post(
            "/v2/checkout/orders", json=body, headers=await self._headers(request_id)
        )
        return self._parse(response)

    async def capture_order(self, *, order_id: str, request_id: str) -> dict:
        response = await self._http.post(
            f"/v2/checkout/orders/{order_id}/capture",
            headers=await self._headers(request_id),
        )
        return self._parse(response)