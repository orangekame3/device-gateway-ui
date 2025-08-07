'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Calendar, ChevronRight, AlertCircle, Loader, Play, Pause } from 'lucide-react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { schedulerApi, Schedule } from '@/lib/scheduler-api';
import { format } from 'date-fns';

export default function UpcomingSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingSchedules();
  }, []);

  const fetchUpcomingSchedules = async () => {
    try {
      setLoading(true);
      const response = await schedulerApi.getSchedules();
      
      // Filter enabled schedules and sort by next_run_at
      const upcomingSchedules = response.data
        .filter(schedule => schedule.enabled && schedule.next_run_at)
        .sort((a, b) => {
          if (!a.next_run_at) return 1;
          if (!b.next_run_at) return -1;
          return new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime();
        })
        .slice(0, 5); // Show only next 5 schedules
      
      setSchedules(upcomingSchedules);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setError('Failed to load upcoming schedules');
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeLabel = (taskType: string): string => {
    const labels = {
      download_qubex_config: 'Download Config',
      generate_topology: 'Generate Topology',
      change_status: 'Change Status'
    };
    return labels[taskType as keyof typeof labels] || taskType;
  };

  const getTaskTypeColor = (taskType: string): string => {
    const colors = {
      download_qubex_config: 'text-blue-600 bg-blue-50',
      generate_topology: 'text-green-600 bg-green-50',
      change_status: 'text-red-600 bg-red-50'
    };
    return colors[taskType as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const formatNextRun = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return 'Overdue';
    } else if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `in ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hours`;
    } else if (diffDays < 7) {
      return `in ${diffDays} days`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const handleRunNow = async (schedule: Schedule) => {
    try {
      await schedulerApi.runScheduleNow(schedule.id);
      // Show success feedback (you could use a toast library here)
      alert(`Schedule "${schedule.name}" triggered successfully!`);
    } catch (error) {
      console.error('Failed to run schedule:', error);
      alert('Failed to trigger schedule');
    }
  };

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Upcoming Schedules</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader className="w-5 h-5 animate-spin text-gray-500 mr-2" />
            <span className="text-gray-600">Loading schedules...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Upcoming Schedules</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-red-600 py-4">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Upcoming Schedules</h2>
          </div>
          <Link href="/scheduler">
            <Button variant="ghost" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Manage All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 text-sm mt-1">Next automated operations</p>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="mb-2">No upcoming schedules</p>
            <Link href="/scheduler">
              <Button variant="outline" size="sm">
                Create Schedule
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${getTaskTypeColor(schedule.task_type)}`}>
                    {getTaskTypeLabel(schedule.task_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{schedule.name}</h3>
                    {schedule.description && (
                      <p className="text-sm text-gray-600 truncate">{schedule.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.next_run_at ? formatNextRun(schedule.next_run_at) : 'No schedule'}
                    </div>
                    {schedule.next_run_at && (
                      <div className="text-xs text-gray-500">
                        {format(new Date(schedule.next_run_at), 'MMM d, HH:mm')}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleRunNow(schedule)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Run now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {schedules.length >= 5 && (
              <div className="pt-2 border-t border-gray-200">
                <Link href="/scheduler">
                  <Button variant="ghost" size="sm" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    View All Schedules
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}