from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.endpoints.health import get_health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle management."""
    setup_logging()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Veya Luma — Personalized Movie Discovery Engine Backend API",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
origins = [str(origin).rstrip("/") for origin in settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check for container liveness/readiness probes
app.add_api_route(
    "/health",
    get_health,
    methods=["GET"],
    tags=["System"],
    summary="Root Health Check",
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["System"])
async def root() -> dict[str, str]:
    """Service metadata root."""
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/health",
    }
