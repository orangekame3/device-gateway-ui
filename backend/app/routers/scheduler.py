from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse, 
    ScheduleRunResponse, RecurrencePreset, RRulePreview, RRuleValidation
)
from ..services.scheduler import SchedulerService

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


@router.get("/presets", response_model=List[RecurrencePreset])
async def get_recurrence_presets():
    """Get predefined recurrence patterns"""
    return SchedulerService.get_recurrence_presets()


@router.post("/preview-rrule", response_model=RRulePreview)
async def preview_rrule(validation: RRuleValidation):
    """Preview the next scheduled runs for an RRULE"""
    return SchedulerService.preview_rrule(
        validation.rrule,
        validation.start_date,
        validation.timezone
    )


@router.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(
    schedule_data: ScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new schedule"""
    try:
        schedule = await SchedulerService.create_schedule(db, schedule_data)
        return ScheduleResponse.model_validate(schedule)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of schedules"""
    try:
        schedules = await SchedulerService.get_schedules(db, skip, limit)
        return [ScheduleResponse.model_validate(schedule) for schedule in schedules]
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a single schedule"""
    try:
        schedule = await SchedulerService.get_schedule(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return ScheduleResponse.model_validate(schedule)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing schedule"""
    try:
        schedule = await SchedulerService.update_schedule(db, schedule_id, schedule_data)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return ScheduleResponse.model_validate(schedule)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a schedule"""
    try:
        success = await SchedulerService.delete_schedule(db, schedule_id)
        if not success:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return {"message": "Schedule deleted successfully"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedules/{schedule_id}/runs", response_model=List[ScheduleRunResponse])
async def get_schedule_runs(
    schedule_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get runs for a schedule"""
    try:
        # First check if schedule exists
        schedule = await SchedulerService.get_schedule(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        runs = await SchedulerService.get_schedule_runs(db, schedule_id, skip, limit)
        return [ScheduleRunResponse.model_validate(run) for run in runs]
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedules/{schedule_id}/run")
async def run_schedule_now(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger a schedule to run now"""
    try:
        schedule = await SchedulerService.get_schedule(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Import here to avoid circular imports
        from ..tasks import execute_scheduled_task
        
        # Schedule immediate execution
        task = execute_scheduled_task.delay(
            schedule_id=schedule.id,
            task_type=schedule.task_type,
            task_params=schedule.task_params
        )
        
        return {
            "message": "Schedule triggered successfully",
            "task_id": task.id
        }
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        # If Celery is not available, run synchronously
        if "broker" in str(e).lower() or "redis" in str(e).lower():
            raise HTTPException(
                status_code=503, 
                detail="Task queue service unavailable. Use Docker Compose for full functionality."
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedules/{schedule_id}/toggle")
async def toggle_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Enable/disable a schedule"""
    try:
        schedule = await SchedulerService.get_schedule(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Toggle enabled state
        schedule_data = ScheduleUpdate(enabled=not schedule.enabled)
        updated_schedule = await SchedulerService.update_schedule(db, schedule_id, schedule_data)
        
        return {
            "message": f"Schedule {'enabled' if updated_schedule.enabled else 'disabled'}",
            "enabled": updated_schedule.enabled
        }
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedules/{schedule_id}/recalculate")
async def recalculate_next_run(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Recalculate next run time for a schedule"""
    try:
        schedule = await SchedulerService.get_schedule(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.rrule:
            from ..services.scheduler import SchedulerService
            from datetime import datetime
            
            preview = SchedulerService.preview_rrule(
                schedule.rrule, 
                datetime.utcnow(),
                schedule.timezone,
                1
            )
            if preview.is_valid and preview.next_runs:
                schedule.next_run_at = preview.next_runs[0]
            else:
                schedule.next_run_at = None
                
            await db.commit()
            await db.refresh(schedule)
            
            return {
                "message": "Next run time recalculated",
                "next_run_at": schedule.next_run_at
            }
        else:
            return {"message": "No RRULE to recalculate"}
            
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recalculate-all")
async def recalculate_all_schedules(
    db: AsyncSession = Depends(get_db)
):
    """Recalculate next run times for all schedules"""
    try:
        schedules = await SchedulerService.get_schedules(db)
        updated_count = 0
        
        for schedule in schedules:
            if schedule.rrule:
                from ..services.scheduler import SchedulerService
                from datetime import datetime
                
                preview = SchedulerService.preview_rrule(
                    schedule.rrule, 
                    datetime.utcnow(),
                    schedule.timezone,
                    1
                )
                if preview.is_valid and preview.next_runs:
                    schedule.next_run_at = preview.next_runs[0]
                    updated_count += 1
                else:
                    schedule.next_run_at = None
        
        await db.commit()
        
        return {
            "message": f"Recalculated next run times for {updated_count} schedules"
        }
            
    except SQLAlchemyError as e:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))