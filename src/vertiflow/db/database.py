from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from vertiflow.core.config import settings

db_url = settings.effective_db_url.strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Detect if we should use pooling/SSL settings
is_pooler = ":6543/" in db_url or ".pooler.supabase.com" in db_url
is_local = "localhost" in db_url or "127.0.0.1" in db_url

connect_args = {}
if is_pooler:
    # Disable prepared statements for Supabase pooler
    connect_args["prepared_statement_cache_size"] = 0

if not is_local:
    # Use 'ssl' instead of 'sslmode' for asyncpg
    connect_args["ssl"] = "require"

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args
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
