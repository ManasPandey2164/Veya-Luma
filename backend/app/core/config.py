from typing import List, Literal, Union

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment validation."""

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "Veya Luma"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev_secret_key_change_in_production_min_32_characters_long_12345"
    JWT_SECRET_KEY: Union[str, None] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GUEST_SESSION_EXPIRE_DAYS: int = 30

    # Cookie & Session Security
    AUTH_COOKIE_NAME: str = "veya_refresh_token"
    AUTH_COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    AUTH_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    AUTH_COOKIE_DOMAIN: Union[str, None] = None
    AUTH_COOKIE_PATH: str = "/api/v1/auth"

    @property
    def effective_jwt_secret(self) -> str:
        """Returns dedicated JWT secret if provided, falling back to SECRET_KEY."""
        return self.JWT_SECRET_KEY or self.SECRET_KEY

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
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/veya_luma"
    SYNC_DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:root@localhost:5432/veya_luma"
    )

    # Redis (Phase 0 infrastructure configuration)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    # TMDB Provider Configuration (Primary movie metadata source)
    TMDB_API_KEY: Union[str, None] = None
    TMDB_READ_ACCESS_TOKEN: Union[str, None] = None
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_IMAGE_BASE_URL: str = "https://image.tmdb.org/t/p"
    TMDB_REQUEST_TIMEOUT_SECONDS: float = 15.0
    TMDB_MAX_REQUESTS_PER_SECOND: float = 20.0
    TMDB_MAX_RETRIES: int = 3
    TMDB_BACKOFF_FACTOR: float = 1.5
    TMDB_DEFAULT_PAGE_LIMIT: int = 2
    TMDB_DEFAULT_RECORD_LIMIT: int = 40

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
