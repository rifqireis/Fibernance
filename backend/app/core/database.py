"""Database configuration and session management."""

import logging
import os
from typing import AsyncGenerator

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

logger = logging.getLogger(__name__)

# Database URL - Using SQLite with async support
database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./fibernance.db")

# Create async engine with SQLite
engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

# Session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Extend this registry whenever an existing table receives a new additive column.
# New tables remain covered by SQLModel.metadata.create_all().
STARTUP_ADDITIVE_COLUMN_PATCHES: dict[str, dict[str, str]] = {
    "accounts": {
        "deficit_diamond": (
            "ALTER TABLE accounts "
            "ADD COLUMN deficit_diamond INTEGER NOT NULL DEFAULT 0"
        ),
    },
}


def _ensure_additive_columns(sync_conn) -> None:
    """Apply registered additive column patches for existing tables."""

    inspector = inspect(sync_conn)
    table_names = set(inspector.get_table_names())

    for table_name, column_patches in STARTUP_ADDITIVE_COLUMN_PATCHES.items():
        if table_name not in table_names:
            continue

        existing_columns = {
            column["name"] for column in inspector.get_columns(table_name)
        }

        for column_name, alter_sql in column_patches.items():
            if column_name in existing_columns:
                continue

            logger.warning(
                "Applying startup schema patch for %s.%s",
                table_name,
                column_name,
            )
            sync_conn.execute(text(alter_sql))
            logger.info(
                "Startup schema patch applied for %s.%s",
                table_name,
                column_name,
            )


def _run_startup_schema_sync(sync_conn) -> None:
    """Apply lightweight additive schema sync for existing SQLite databases."""

    _ensure_additive_columns(sync_conn)


async def init_db() -> None:
    """Initialize database tables and apply additive startup schema patches."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.run_sync(_run_startup_schema_sync)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session for dependency injection."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connection."""
    await engine.dispose()
