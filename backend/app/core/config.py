from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "VertiFlow"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://vertiflow:vertiflow@localhost:5432/vertiflow"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
