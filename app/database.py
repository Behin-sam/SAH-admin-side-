"""Async SQLAlchemy engine and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings

# SQLite doesn't support pool_size or connect_args the same way
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=10)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base — imported by all models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a DB session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
