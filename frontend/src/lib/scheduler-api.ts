import api from './api';

export interface Schedule {
  id: number;
  name: string;
  description?: string;
  task_type: 'download_qubex_config' | 'generate_topology' | 'change_status';
  task_params?: Record<string, any>;
  rrule?: string;
  timezone: string;
  enabled: boolean;
  next_run_at?: string;
  last_run_at?: string;
  last_run_status?: 'success' | 'failure' | 'pending';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ScheduleCreate {
  name: string;
  description?: string;
  task_type: 'download_qubex_config' | 'generate_topology' | 'change_status';
  task_params?: Record<string, any>;
  rrule?: string;
  timezone?: string;
  enabled?: boolean;
}

export interface ScheduleUpdate {
  name?: string;
  description?: string;
  task_params?: Record<string, any>;
  rrule?: string;
  timezone?: string;
  enabled?: boolean;
}

export interface ScheduleRun {
  id: number;
  schedule_id: number;
  task_id?: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  started_at?: string;
  completed_at?: string;
  result?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export interface RecurrencePreset {
  id: string;
  name: string;
  description: string;
  rrule: string;
}

export interface RRulePreview {
  next_runs: string[];
  human_readable: string;
  is_valid: boolean;
  error_message?: string;
}

export const schedulerApi = {
  // Presets
  getPresets: () => api.get<RecurrencePreset[]>('/scheduler/presets'),
  
  // RRULE validation
  previewRRule: (rrule: string, startDate: string, timezone: string = 'UTC') =>
    api.post<RRulePreview>('/scheduler/preview-rrule', {
      rrule,
      start_date: startDate,
      timezone
    }),
  
  // Schedules CRUD
  getSchedules: (skip: number = 0, limit: number = 100) =>
    api.get<Schedule[]>(`/scheduler/schedules?skip=${skip}&limit=${limit}`),
  
  getSchedule: (id: number) =>
    api.get<Schedule>(`/scheduler/schedules/${id}`),
  
  createSchedule: (schedule: ScheduleCreate) =>
    api.post<Schedule>('/scheduler/schedules', schedule),
  
  updateSchedule: (id: number, schedule: ScheduleUpdate) =>
    api.put<Schedule>(`/scheduler/schedules/${id}`, schedule),
  
  deleteSchedule: (id: number) =>
    api.delete(`/scheduler/schedules/${id}`),
  
  // Schedule operations
  runScheduleNow: (id: number) =>
    api.post(`/scheduler/schedules/${id}/run`),
  
  toggleSchedule: (id: number) =>
    api.post(`/scheduler/schedules/${id}/toggle`),
  
  // Schedule runs
  getScheduleRuns: (scheduleId: number, skip: number = 0, limit: number = 50) =>
    api.get<ScheduleRun[]>(`/scheduler/schedules/${scheduleId}/runs?skip=${skip}&limit=${limit}`)
};