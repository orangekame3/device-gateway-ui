from typing import List, Optional
from datetime import datetime, timedelta
import pytz
from dateutil.rrule import rrulestr
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import Schedule, ScheduleRun
from ..models import ScheduleCreate, ScheduleUpdate, RecurrencePreset, RRulePreview
from ..celery_app import celery_app
from ..tasks import execute_scheduled_task


class SchedulerService:
    
    @staticmethod
    def get_recurrence_presets() -> List[RecurrencePreset]:
        """Get predefined recurrence patterns"""
        return [
            RecurrencePreset(
                id="daily_9am",
                name="Daily at 9:00 AM",
                description="Every day at 9:00 AM",
                rrule="FREQ=DAILY"
            ),
            RecurrencePreset(
                id="weekdays_9am",
                name="Weekdays at 9:00 AM",
                description="Monday to Friday at 9:00 AM",
                rrule="FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
            ),
            RecurrencePreset(
                id="weekly_monday_9am",
                name="Weekly on Monday at 9:00 AM",
                description="Every Monday at 9:00 AM",
                rrule="FREQ=WEEKLY;BYDAY=MO"
            ),
            RecurrencePreset(
                id="monthly_first_9am",
                name="Monthly on 1st at 9:00 AM",
                description="First day of every month at 9:00 AM",
                rrule="FREQ=MONTHLY;BYMONTHDAY=1"
            )
        ]
    
    @staticmethod
    def preview_rrule(rrule: str, start_date: datetime, timezone: str = "UTC", count: int = 5) -> RRulePreview:
        """Preview the next scheduled runs for an RRULE"""
        try:
            if not rrule.strip():
                return RRulePreview(
                    next_runs=[],
                    human_readable="No recurrence",
                    is_valid=True
                )
            
            # Parse timezone
            tz = pytz.timezone(timezone)
            
            # Create a simple start time - 9 AM tomorrow in the specified timezone
            now_tz = datetime.now(tz)
            rule_start = now_tz.replace(hour=9, minute=0, second=0, microsecond=0)
            if rule_start <= now_tz:
                rule_start = rule_start + timedelta(days=1)
            
            # Create DTSTART in local time, then convert to naive for rrule
            rule_start_naive = rule_start.replace(tzinfo=None)
            
            # Build full RRULE string
            full_rrule = f"DTSTART:{rule_start_naive.strftime('%Y%m%dT%H%M%S')}\nRRULE:{rrule}"
            
            # Parse RRULE
            rule = rrulestr(full_rrule)
            
            # Get the first few occurrences
            occurrences = list(rule)[:count]
            
            # Convert to UTC for storage
            next_runs_utc = []
            for dt in occurrences:
                # Assume the datetime is in the target timezone
                dt_with_tz = tz.localize(dt)
                next_runs_utc.append(dt_with_tz.astimezone(pytz.UTC).replace(tzinfo=None))
            
            # Create human readable description
            human_readable = SchedulerService._rrule_to_human(rrule)
            
            return RRulePreview(
                next_runs=next_runs_utc,
                human_readable=human_readable,
                is_valid=True
            )
            
        except Exception as e:
            print(f"RRULE preview error: {str(e)}")
            return RRulePreview(
                next_runs=[],
                human_readable="",
                is_valid=False,
                error_message=str(e)
            )
    
    @staticmethod
    def _rrule_to_human(rrule: str) -> str:
        """Convert RRULE to human readable format"""
        # This is a simplified version - you could use a library like humanize
        # or create a more comprehensive parser
        if "FREQ=DAILY" in rrule:
            if "BYDAY=MO,TU,WE,TH,FR" in rrule:
                return "Every weekday"
            return "Every day"
        elif "FREQ=WEEKLY" in rrule:
            return "Every week"
        elif "FREQ=MONTHLY" in rrule:
            return "Every month"
        return "Custom recurrence"
    
    @staticmethod
    async def create_schedule(db: AsyncSession, schedule_data: ScheduleCreate) -> Schedule:
        """Create a new schedule"""
        # Calculate next run time if RRULE is provided
        next_run_at = None
        if schedule_data.rrule:
            try:
                # Use current time for calculation
                preview = SchedulerService.preview_rrule(
                    schedule_data.rrule, 
                    datetime.utcnow(),
                    schedule_data.timezone,
                    1
                )
                if preview.is_valid and preview.next_runs:
                    next_run_at = preview.next_runs[0]
            except Exception as e:
                print(f"Error calculating next run time: {e}")
        
        schedule = Schedule(
            **schedule_data.dict(),
            next_run_at=next_run_at
        )
        
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        
        # Schedule with Celery Beat if enabled
        if schedule.enabled and schedule.rrule:
            await SchedulerService._schedule_with_celery(schedule)
        
        return schedule
    
    @staticmethod
    async def update_schedule(db: AsyncSession, schedule_id: int, schedule_data: ScheduleUpdate) -> Optional[Schedule]:
        """Update an existing schedule"""
        stmt = select(Schedule).where(Schedule.id == schedule_id)
        result = await db.execute(stmt)
        schedule = result.scalar_one_or_none()
        
        if not schedule:
            return None
        
        # Update fields
        update_data = schedule_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(schedule, field, value)
        
        # Recalculate next run time if RRULE changed
        if 'rrule' in update_data and schedule.rrule:
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
        
        schedule.updated_at = datetime.utcnow()
        await db.commit()
        
        # Update Celery Beat schedule
        if schedule.enabled and schedule.rrule:
            await SchedulerService._schedule_with_celery(schedule)
        else:
            await SchedulerService._unschedule_from_celery(schedule_id)
        
        return schedule
    
    @staticmethod
    async def delete_schedule(db: AsyncSession, schedule_id: int) -> bool:
        """Delete a schedule"""
        # Remove from Celery Beat first
        await SchedulerService._unschedule_from_celery(schedule_id)
        
        # Delete from database
        stmt = delete(Schedule).where(Schedule.id == schedule_id)
        result = await db.execute(stmt)
        await db.commit()
        
        return result.rowcount > 0
    
    @staticmethod
    async def get_schedules(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Schedule]:
        """Get list of schedules"""
        stmt = select(Schedule).offset(skip).limit(limit).order_by(Schedule.created_at.desc())
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_schedule(db: AsyncSession, schedule_id: int) -> Optional[Schedule]:
        """Get a single schedule"""
        stmt = select(Schedule).where(Schedule.id == schedule_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_schedule_runs(db: AsyncSession, schedule_id: int, skip: int = 0, limit: int = 50) -> List[ScheduleRun]:
        """Get runs for a schedule"""
        stmt = (
            select(ScheduleRun)
            .where(ScheduleRun.schedule_id == schedule_id)
            .order_by(ScheduleRun.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def _schedule_with_celery(schedule: Schedule):
        """Add or update schedule in Celery Beat"""
        # This would integrate with Celery Beat's dynamic scheduling
        # For now, we'll use a simple approach
        pass
    
    @staticmethod
    async def _unschedule_from_celery(schedule_id: int):
        """Remove schedule from Celery Beat"""
        # This would remove from Celery Beat's dynamic scheduling
        pass