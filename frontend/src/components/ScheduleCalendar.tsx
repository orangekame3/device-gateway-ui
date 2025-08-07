'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';
import rrulePlugin from '@fullcalendar/rrule';
import { Schedule, schedulerApi } from '@/lib/scheduler-api';
import { Calendar, Play, Pause, Settings, Plus, Trash2 } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    schedule: Schedule;
  };
}

interface ScheduleCalendarProps {
  onScheduleSelect?: (schedule: Schedule) => void;
  onCreateClick?: () => void;
}

export default function ScheduleCalendar({ onScheduleSelect, onCreateClick }: ScheduleCalendarProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await schedulerApi.getSchedules();
      console.log('Fetched schedules:', response.data);
      setSchedules(response.data);
      
      // Convert schedules to calendar events with RRULE support
      const calendarEvents = response.data
        .map(schedule => {
          const backgroundColor = schedule.enabled ? getTaskColor(schedule.task_type) : '#9ca3af';
          const borderColor = schedule.enabled ? getTaskColor(schedule.task_type, true) : '#6b7280';
          
          // Base event configuration
          const baseEvent = {
            id: schedule.id.toString(),
            title: schedule.name,
            backgroundColor,
            borderColor,
            textColor: 'white',
            extendedProps: {
              schedule
            }
          };
          
          // If schedule has RRULE, create recurring event
          if (schedule.rrule && schedule.enabled) {
            // Use next_run_at as start time, or default to 9 AM today
            const startTime = schedule.next_run_at ? 
              new Date(schedule.next_run_at) : 
              new Date(new Date().setHours(9, 0, 0, 0));
            
            return {
              ...baseEvent,
              rrule: {
                freq: getRRuleFreq(schedule.rrule),
                dtstart: startTime.toISOString(),
                ...getRRuleOptions(schedule.rrule)
              }
            };
          } else {
            // Single event
            const displayDate = schedule.next_run_at || new Date(Date.now() + 60 * 60 * 1000).toISOString();
            return {
              ...baseEvent,
              start: displayDate,
              title: `${schedule.name} ${schedule.next_run_at ? '' : '(No Schedule)'}`
            };
          }
        });
      
      console.log('Calendar events:', calendarEvents);
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRRuleFreq = (rrule: string): string => {
    if (rrule.includes('FREQ=DAILY')) return 'daily';
    if (rrule.includes('FREQ=WEEKLY')) return 'weekly';
    if (rrule.includes('FREQ=MONTHLY')) return 'monthly';
    return 'daily'; // fallback
  };

  const getRRuleOptions = (rrule: string): any => {
    const options: any = {};
    
    if (rrule.includes('BYDAY=')) {
      const byDay = rrule.match(/BYDAY=([^;]+)/);
      if (byDay) {
        const days = byDay[1].split(',');
        const dayNumbers = days.map(day => {
          const dayMap: { [key: string]: number } = {
            'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
          };
          return dayMap[day] ?? 1;
        });
        options.byweekday = dayNumbers;
      }
    }
    
    if (rrule.includes('BYMONTHDAY=')) {
      const byMonthDay = rrule.match(/BYMONTHDAY=(\d+)/);
      if (byMonthDay) {
        options.bymonthday = [parseInt(byMonthDay[1])];
      }
    }
    
    return options;
  };

  const getTaskColor = (taskType: string, border: boolean = false): string => {
    const colors = {
      download_qubex_config: border ? '#1d4ed8' : '#3b82f6',
      generate_topology: border ? '#047857' : '#059669', 
      change_status: border ? '#b91c1c' : '#dc2626'
    };
    return colors[taskType as keyof typeof colors] || (border ? '#4b5563' : '#6b7280');
  };

  const getTaskTypeLabel = (taskType: string): string => {
    const labels = {
      download_qubex_config: 'Download Config',
      generate_topology: 'Generate Topology',
      change_status: 'Change Status'
    };
    return labels[taskType as keyof typeof labels] || taskType;
  };

  const handleEventClick = (clickInfo: any) => {
    const schedule = clickInfo.event.extendedProps.schedule;
    if (onScheduleSelect) {
      onScheduleSelect(schedule);
    }
  };

  const handleToggleSchedule = async (schedule: Schedule, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await schedulerApi.toggleSchedule(schedule.id);
      await fetchSchedules(); // Refresh the calendar
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const handleRunNow = async (schedule: Schedule, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await schedulerApi.runScheduleNow(schedule.id);
      alert('Schedule triggered successfully');
    } catch (error) {
      console.error('Failed to run schedule:', error);
      alert('Failed to trigger schedule');
    }
  };

  const handleDeleteSchedule = async (schedule: Schedule, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the schedule "${schedule.name}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await schedulerApi.deleteSchedule(schedule.id);
      await fetchSchedules(); // Refresh the calendar
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Schedule Calendar
          </h2>
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
            <span>Download Config</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
            <span>Generate Topology</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
            <span>Change Status</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
            <span>Disabled</span>
          </div>
        </div>
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          eventMaxStack={2}
          eventMinHeight={60}
          eventContent={(eventInfo) => {
            const schedule = eventInfo.event.extendedProps.schedule;
            const bgColor = eventInfo.event.backgroundColor;
            return (
              <div 
                className="w-full p-2 rounded min-h-[50px] flex flex-col justify-between border"
                style={{
                  backgroundColor: bgColor,
                  borderColor: eventInfo.event.borderColor,
                  color: 'white',
                  borderWidth: '1px'
                }}
              >
                <div className="flex-1">
                  <div 
                    className="text-sm font-semibold mb-1 truncate"
                    style={{ color: 'white' }}
                  >
                    {eventInfo.event.title}
                  </div>
                  <div 
                    className="text-xs opacity-90 truncate"
                    style={{ color: 'white' }}
                  >
                    {getTaskTypeLabel(schedule.task_type)}
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-1 mt-2">
                  <button
                    onClick={(e) => handleRunNow(schedule, e)}
                    className="p-1 hover:bg-black hover:bg-opacity-30 rounded transition-colors"
                    title="Run now"
                  >
                    <Play className="w-3 h-3" style={{ color: 'white' }} />
                  </button>
                  <button
                    onClick={(e) => handleToggleSchedule(schedule, e)}
                    className="p-1 hover:bg-black hover:bg-opacity-30 rounded transition-colors"
                    title={schedule.enabled ? 'Disable' : 'Enable'}
                  >
                    {schedule.enabled ? (
                      <Pause className="w-3 h-3" style={{ color: 'white' }} />
                    ) : (
                      <Play className="w-3 h-3" style={{ color: 'white' }} />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDeleteSchedule(schedule, e)}
                    className="p-1 hover:bg-red-500 hover:bg-opacity-50 rounded transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-3 h-3" style={{ color: 'white' }} />
                  </button>
                </div>
              </div>
            );
          }}
        />
      </div>
      
      {schedules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No schedules created yet</p>
          <p className="text-sm mt-1">Click "New Schedule" to get started</p>
        </div>
      )}
    </div>
  );
}
