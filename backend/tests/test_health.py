import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient) -> None:
    """Verifies the root metadata endpoint."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Veya Luma"
    assert data["status"] == "operational"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_root_endpoint(async_client: AsyncClient) -> None:
    """Verifies the /health check endpoint."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "environment" in data
    assert "version" in data
    assert data["database"] in ["connected", "disconnected"]
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_v1_endpoint(async_client: AsyncClient) -> None:
    """Verifies the /api/v1/health check endpoint."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["version"] == "0.1.0"
