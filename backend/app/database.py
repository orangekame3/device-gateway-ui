from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from typing import Optional
from .config import settings

# Database URL
DATABASE_URL = getattr(settings, 'database_url', 'postgresql+asyncpg://postgres:postgres@localhost:5432/device_gateway_ui')

# Create async engine
engine = create_async_engine(DATABASE_URL)

# Create async session
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for models
Base = declarative_base()


class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(100), nullable=False)  # 'download_qubex_config', 'generate_topology', 'change_status'
    task_params = Column(JSON, nullable=True)  # Parameters for the task
    rrule = Column(Text, nullable=True)  # iCalendar RRULE string
    timezone = Column(String(50), default='UTC')
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    last_run_status = Column(String(20), nullable=True)  # 'success', 'failure', 'pending'
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(255), nullable=True)


class ScheduleRun(Base):
    __tablename__ = "schedule_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, nullable=False, index=True)
    task_id = Column(String(255), nullable=True)  # Celery task ID
    status = Column(String(20), nullable=False)  # 'pending', 'running', 'success', 'failure'
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# Dependency to get database session
async def get_db():
    try:
        async with AsyncSessionLocal() as session:
            yield session
    except Exception as e:
        # If database is not available, raise an exception that can be handled by routes
        raise RuntimeError(f"Database connection failed: {e}")