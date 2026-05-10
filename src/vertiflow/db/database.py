from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from vertiflow.core.config import settings

db_url = settings.effective_db_url.strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Disable prepared statements if using Supabase pooling (Transaction Mode on port 6543)
if ":6543/" in db_url:
    if "?" in db_url:
        if "prepared_statement_cache_size" not in db_url:
            db_url += "&prepared_statement_cache_size=0"
    else:
        db_url += "?prepared_statement_cache_size=0"

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
