import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from .database import Base, DATABASE_URL


async def create_tables():
    """Create database tables"""
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())