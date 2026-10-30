import logging
from contextlib import asynccontextmanager
from decimal import Decimal
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.paypal import PayPalClient, PayPalError
logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # One shared PayPal client so the access token and connection pool are reused
    app.state.paypal = PayPalClient(settings)
    app.state.negotiator = Negotiator(
        settings.gemini_api_key.get_secret_value(), settings.gemini_model
    )
    app.state.sessions = {}  # in-memory for now; a database replaces this later
    yield
    await app.state.paypal.close() 

    #creates a paypal client when the app starts and closes the paypal client when app stops


app = FastAPI(title="dealmaker API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "OK", "env": settings.app_env}


@app.get("/health/paypal")
async def paypal_health(request: Request) -> JSONResponse:
    # Fetching an access token proves the credentials and base URL work
    if settings.app_env != "development":
        raise HTTPException(status_code=404)
    try:
        await request.app.state.paypal.get_access_token() #requests the open connection on paypal client and req for the access token
    except (PayPalError, httpx.HTTPError) as exc:
        return JSONResponse(status_code=503, content={"status": "ERROR", "detail": str(exc)})
    return JSONResponse(content={"status": "OK", "base_url": settings.paypal_base_url})

@app.exception_handler(PayPalError)
async def paypal_error_handler(request: Request, exc: PayPalError) -> JSONResponse:
    logger.error("PayPal failure: %s", exc)
    return JSONResponse(status_code=502, content={"detail": "Payment provider error"})


class DevOrderRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    description: str = Field(min_length=1, max_length=127)


@app.post("/dev/orders")
async def dev_create_order(body: DevOrderRequest, request: Request) -> dict:
    if settings.app_env != "development":
        raise HTTPException(status_code=404)
    base = str(request.base_url).rstrip("/")
    order = await request.app.state.paypal.create_order(
        amount=body.amount,
        currency="USD",
        description=body.description,
        return_url=f"{base}/dev/paypal-return",
        cancel_url=f"{base}/dev/paypal-cancel",
        request_id=str(uuid4()),
    )
    approve_url = next(link["href"] for link in order["links"] if link["rel"] == "payer-action")
    return {"order_id": order["id"], "status": order["status"], "approve_url": approve_url}


@app.get("/dev/paypal-return")
async def dev_paypal_return(token: str, request: Request) -> dict:
    # PayPal sends the order ID back as ?token=...
    capture = await request.app.state.paypal.capture_order(
        order_id=token, request_id=f"capture-{token}"
    )
    return {"order_id": capture["id"], "status": capture["status"]}


@app.get("/dev/paypal-cancel")
async def dev_paypal_cancel() -> dict:
    return {"status": "cancelled by shopper"}


from app.agent.negotiator import Negotiator

class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=500)


@app.post("/dev/negotiate")
async def dev_negotiate(body: ChatRequest, request: Request) -> dict:
    if settings.app_env != "development":
        raise HTTPException(status_code=404)
    session = request.app.state.sessions.setdefault(
        body.session_id, {"history": [], "state": {}}
    )
    reply = await request.app.state.negotiator.reply(
        session["history"], session["state"], body.message
    )
    return {"reply": reply, "current_offer": session["state"].get("current_offer")}