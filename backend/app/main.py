from fastapi import FastAPI
from app.config import get_settings
settings = get_settings()

app = FastAPI(title="dealmaker API", version="0.1.0")

@app.get("/health")
def health()->dict:
    return {"status":"OK", "env" : settings.app_env}

