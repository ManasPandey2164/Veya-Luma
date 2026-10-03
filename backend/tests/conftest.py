from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_engine, async_session_factory
from app.main import app


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Yields an HTTPX AsyncClient for FastAPI endpoint testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yields an active AsyncSession connected to PostgreSQL for integration testing."""
    async with async_session_factory() as session:
        yield session


@pytest_asyncio.fixture(autouse=True)
async def cleanup_db_engine() -> AsyncGenerator[None, None]:
    """Ensures async database connection pool is cleanly disposed after each test."""
    yield
    await async_engine.dispose()
