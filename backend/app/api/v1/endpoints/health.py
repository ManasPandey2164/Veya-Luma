from datetime import datetime, timezone

from fastapi import APIRouter, status

from app.core.config import settings
from app.db.session import check_db_connection
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns the operational health of the application and its database connection.",
)
async def get_health() -> HealthResponse:
    db_ok = await check_db_connection()
    overall_status = "healthy" if db_ok else "degraded"
    db_status = "connected" if db_ok else "disconnected"

    return HealthResponse(
        status=overall_status,
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        database=db_status,
        timestamp=datetime.now(timezone.utc),
    )
