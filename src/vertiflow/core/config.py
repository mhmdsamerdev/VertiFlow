from __future__ import annotations
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "VertiFlow"
    DEBUG: bool = True
    
    # Priority: SUPABASE_URL > DATABASE_URL > local default
    SUPABASE_URL: Optional[str] = None
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    
    @property
    def effective_db_url(self) -> str:
        return self.SUPABASE_URL or self.DATABASE_URL

    # Supabase API Keys
    SUPABASE_URL_API: str = "http://127.0.0.1:54321" # Renamed to avoid collision with connection string
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "super-secret-jwt-token-key-for-local-dev-change-me"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


Settings.model_rebuild()
settings = Settings()
