"""SQLAlchemy repository for User persistence operations."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Repository managing User records in PostgreSQL."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Loads a User by internal synthetic UUID."""
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Loads a User by normalized email address (case-insensitive)."""
        normalized_email = email.strip().lower()
        stmt = select(User).where(User.email.ilike(normalized_email))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_username(self, username: str) -> Optional[User]:
        """Loads a User by unique handle/username (case-insensitive)."""
        stmt = select(User).where(User.username.ilike(username.strip()))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(
        self,
        email: str,
        hashed_password: str,
        username: Optional[str] = None,
        display_name: Optional[str] = None,
        is_active: bool = True,
        is_verified: bool = False,
    ) -> User:
        """Persists a new User record."""
        user = User(
            email=email.strip().lower(),
            hashed_password=hashed_password,
            username=username.strip() if username else None,
            display_name=display_name.strip() if display_name else None,
            is_active=is_active,
            is_verified=is_verified,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
