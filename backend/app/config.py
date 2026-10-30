from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    paypal_client_id: str
    paypal_client_secret: SecretStr
    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    gemini_api_key: SecretStr
    gemini_model:str

@lru_cache
def get_settings() -> Settings:
    return Settings()
