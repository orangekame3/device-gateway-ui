from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any, List
from datetime import datetime


class TaskResponse(BaseModel):
    task_id: str
    status: Literal["pending", "running", "completed", "failed"]
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ExecutionResult(BaseModel):
    success: bool
    stdout: str
    stderr: str
    message: Optional[str] = None


class DeviceStatus(BaseModel):
    status: Optional[Literal["active", "inactive", "maintenance"]]
    message: Optional[str] = None


class ChangeStatusRequest(BaseModel):
    status: Literal["active", "inactive", "maintenance"]


# Schedule Models
class ScheduleBase(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: Literal["download_qubex_config", "generate_topology", "change_status"]
    task_params: Optional[Dict[str, Any]] = None
    rrule: Optional[str] = None
    timezone: str = "UTC"
    enabled: bool = True


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    task_params: Optional[Dict[str, Any]] = None
    rrule: Optional[str] = None
    timezone: Optional[str] = None
    enabled: Optional[bool] = None


class ScheduleResponse(ScheduleBase):
    id: int
    next_run_at: Optional[datetime]
    last_run_at: Optional[datetime]
    last_run_status: Optional[Literal["success", "failure", "pending"]]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    model_config = {"from_attributes": True}


# Schedule Run Models
class ScheduleRunResponse(BaseModel):
    id: int
    schedule_id: int
    task_id: Optional[str]
    status: Literal["pending", "running", "success", "failure"]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# RRULE Helper Models
class RecurrencePreset(BaseModel):
    id: str
    name: str
    description: str
    rrule: str


class RRuleValidation(BaseModel):
    rrule: str
    start_date: datetime
    timezone: str = "UTC"


class RRulePreview(BaseModel):
    next_runs: List[datetime]
    human_readable: str
    is_valid: bool
    error_message: Optional[str] = None