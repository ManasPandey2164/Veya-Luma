import pytest

from app.db.session import check_db_connection


@pytest.mark.asyncio
async def test_database_connection() -> None:
    """Verifies that the database check function executes and connects to PostgreSQL."""
    is_connected = await check_db_connection()
    # In Phase 0 with local PostgreSQL running and password configured, connection should succeed
    assert is_connected is True
