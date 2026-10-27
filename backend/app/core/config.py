from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ledger"
    app_version: str = "0.1.0"
    environment: str = "development"
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    database_url: str = "postgresql://ledger:ledger@localhost:5432/ledger"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
