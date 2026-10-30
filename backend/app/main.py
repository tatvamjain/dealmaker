from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.services.paypal import PayPalClient, PayPalError

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # One shared PayPal client so the access token and connection pool are reused
    app.state.paypal = PayPalClient(settings)
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
