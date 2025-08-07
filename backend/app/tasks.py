from celery import current_app as celery_app
from typing import Dict, Any
import asyncio
from datetime import datetime

from .services.shell_executor import ShellExecutor
from .database import AsyncSessionLocal, ScheduleRun
from sqlalchemy import select, update


@celery_app.task(bind=True)
def execute_scheduled_task(self, schedule_id: int, task_type: str, task_params: Dict[str, Any] = None):
    """Execute a scheduled task"""
    task_id = self.request.id
    
    # Create run record
    asyncio.run(create_run_record(schedule_id, task_id, "running"))
    
    try:
        shell_executor = ShellExecutor()
        
        if task_type == "download_qubex_config":
            success, stdout, stderr = asyncio.run(shell_executor.download_qubex_config())
        elif task_type == "generate_topology":
            success, stdout, stderr = asyncio.run(shell_executor.generate_device_topology())
        elif task_type == "change_status":
            status = task_params.get("status", "active") if task_params else "active"
            success, stdout, stderr = asyncio.run(shell_executor.change_device_status(status))
        else:
            raise ValueError(f"Unknown task type: {task_type}")
        
        result = {
            "success": success,
            "stdout": stdout,
            "stderr": stderr,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        # Update run record
        final_status = "success" if success else "failure"
        asyncio.run(update_run_record(schedule_id, task_id, final_status, result, stderr if not success else None))
        
        return result
        
    except Exception as exc:
        error_message = str(exc)
        result = {
            "success": False,
            "error": error_message,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        # Update run record with error
        asyncio.run(update_run_record(schedule_id, task_id, "failure", result, error_message))
        
        raise self.retry(exc=exc, countdown=60, max_retries=3)


async def create_run_record(schedule_id: int, task_id: str, status: str):
    """Create a new schedule run record"""
    async with AsyncSessionLocal() as session:
        run = ScheduleRun(
            schedule_id=schedule_id,
            task_id=task_id,
            status=status,
            started_at=datetime.utcnow()
        )
        session.add(run)
        await session.commit()


async def update_run_record(schedule_id: int, task_id: str, status: str, result: Dict[str, Any] = None, error_message: str = None):
    """Update schedule run record with completion details"""
    async with AsyncSessionLocal() as session:
        stmt = (
            update(ScheduleRun)
            .where(ScheduleRun.schedule_id == schedule_id, ScheduleRun.task_id == task_id)
            .values(
                status=status,
                completed_at=datetime.utcnow(),
                result=result,
                error_message=error_message
            )
        )
        await session.execute(stmt)
        await session.commit()