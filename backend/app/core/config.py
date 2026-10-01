from typing import List, Union

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment validation."""

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "Veya Luma"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev_secret_key_change_in_production_min_32_characters_long_12345"

    # CORS
    CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.startswith("["):
                return [i.strip() for i in v.split(",") if i.strip()]
            import json
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        elif isinstance(v, list):
            return [str(item) for item in v]
        raise ValueError(f"Invalid CORS_ORIGINS format: {v}")

    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "root"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "veya_luma"
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:root@localhost:5432/veya_luma"
    )
    SYNC_DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:root@localhost:5432/veya_luma"
    )

    # Redis (Phase 0 infrastructure configuration)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
