import pytest
from typing import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Yields an HTTPX AsyncClient for FastAPI endpoint testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
