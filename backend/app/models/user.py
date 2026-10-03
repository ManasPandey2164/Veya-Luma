"""SQLAlchemy 2.0 ORM models for Veya Luma user identity and session persistence.

Supports registered users with Argon2id password hashing, active/disabled states,
authoritative persistent sessions in PostgreSQL, refresh token rotation/revocation,
and anonymous guest sessions with clean registered-user reconciliation.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """Core account record for authenticated cinema discoverers.

    Represents identity without storing demographic proxies or plaintext credentials.
    """

    __tablename__ = "app_user"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique normalized email address for authentication",
    )
    username: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        unique=True,
        index=True,
        comment="Unique public handle/curator username",
    )
    display_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Editorial display name shown on profile and curation dossiers",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Argon2id password hash",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether the account is active or disabled",
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether the account email has completed verification",
    )
    locale: Mapped[str] = mapped_column(
        String(10),
        default="en-US",
        nullable=False,
        comment="Preferred interface locale",
    )
    country_code: Mapped[str] = mapped_column(
        String(2),
        default="US",
        nullable=False,
        comment="Two-letter country code for regional catalog availability",
    )

    # Relationships
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="UserSession.user_id",
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_app_user_email"),
        UniqueConstraint("username", name="uq_app_user_username"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} username={self.username} active={self.is_active}>"


class UserSession(Base):
    """Authoritative persistent session record.

    Tracks authenticated user sessions and anonymous guest discovery sessions.
    The database session is the source of truth for session validity, expiration,
    revocation, and refresh token rotation.
    """

    __tablename__ = "user_session"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Associated user ID, or NULL for anonymous guest sessions",
    )
    session_type: Mapped[str] = mapped_column(
        String(20),
        default="authenticated",
        nullable=False,
        comment="Session classification: 'authenticated' or 'guest'",
    )
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="SHA-256 digest of active rotating refresh token",
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Client User-Agent string captured during session creation",
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="Client IP address (IPv4 or IPv6)",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Timestamp after which the session credential is no longer valid",
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="Explicit revocation timestamp (NULL if still valid)",
    )
    reconciled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when an anonymous guest session was reconciled with a registered user",
    )
    reconciled_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="Target user ID to which this guest session was reconciled",
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="sessions",
        foreign_keys=[user_id],
    )
    reconciled_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[reconciled_user_id],
    )

    __table_args__ = (
        Index("idx_user_session_user_expires", "user_id", "expires_at"),
        Index("idx_user_session_refresh_hash", "refresh_token_hash"),
    )

    @property
    def is_active(self) -> bool:
        """Determines if the session is currently active and unrevoked."""
        from datetime import timezone

        now = datetime.now(timezone.utc)
        return self.revoked_at is None and self.expires_at > now

    def __repr__(self) -> str:
        return f"<UserSession id={self.id} user_id={self.user_id} type={self.session_type} active={self.is_active}>"
