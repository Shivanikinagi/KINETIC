from __future__ import annotations

import os
from functools import lru_cache
from typing import AsyncIterator, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine


@lru_cache(maxsize=1)
def get_database_url() -> str:
    """Return the configured database URL.

    Expected format (docker-compose default):
    postgresql+asyncpg://kinetic:kinetic@postgres:5432/kinetic
    """

    return os.getenv("DATABASE_URL", "").strip()


@lru_cache(maxsize=1)
def get_engine() -> Optional[AsyncEngine]:
    url = get_database_url()
    if not url:
        return None

    # pool_pre_ping avoids stale connections after DB restarts
    return create_async_engine(url, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_sessionmaker() -> Optional[async_sessionmaker[AsyncSession]]:
    engine = get_engine()
    if engine is None:
        return None
    return async_sessionmaker(engine, expire_on_commit=False)


async def db_ping() -> bool:
    engine = get_engine()
    if engine is None:
        return False

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency for an AsyncSession.

    Note: this is scaffold-only for Phase 0. Existing endpoints still use SQLite.
    """

    sessionmaker = get_sessionmaker()
    if sessionmaker is None:
        raise RuntimeError("DATABASE_URL is not configured")

    async with sessionmaker() as session:
        yield session
