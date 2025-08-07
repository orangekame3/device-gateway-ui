'use client';

import { useState, useEffect } from 'react';
import { X, Save, Settings, Trash2 } from 'lucide-react';
import { Schedule, ScheduleCreate, ScheduleUpdate, schedulerApi } from '@/lib/scheduler-api';
import SimpleRecurrenceSelector from './SimpleRecurrenceSelector';

interface ScheduleFormProps {
  schedule?: Schedule;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const TASK_TYPES = [
  { value: 'download_qubex_config', label: 'Download QUBEx Config', description: 'Download configuration from QDash API' },
  { value: 'generate_topology', label: 'Generate Device Topology', description: 'Generate device topology from configuration' },
  { value: 'change_status', label: 'Change Device Status', description: 'Change device status (requires status parameter)' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' }
];

export default function ScheduleForm({ schedule, isOpen, onClose, onSave }: ScheduleFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    task_type: 'download_qubex_config' as const,
    status: 'active', // For change_status task
    rrule: '',
    timezone: 'Asia/Tokyo',
    enabled: true
  });
  const [saving, setSaving] = useState(false);
  const [startDate] = useState(new Date());

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        description: schedule.description || '',
        task_type: schedule.task_type,
        status: schedule.task_params?.status || 'active',
        rrule: schedule.rrule || '',
        timezone: schedule.timezone,
        enabled: schedule.enabled
      });
    } else {
      setFormData({
        name: '',
        description: '',
        task_type: 'download_qubex_config',
        status: 'active',
        rrule: '',
        timezone: 'Asia/Tokyo',
        enabled: true
      });
    }
  }, [schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const scheduleData = {
        name: formData.name,
        description: formData.description,
        task_type: formData.task_type,
        task_params: formData.task_type === 'change_status' ? { status: formData.status } : undefined,
        rrule: formData.rrule || undefined,
        timezone: formData.timezone,
        enabled: formData.enabled
      };

      if (schedule) {
        await schedulerApi.updateSchedule(schedule.id, scheduleData as ScheduleUpdate);
      } else {
        await schedulerApi.createSchedule(scheduleData as ScheduleCreate);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the schedule "${schedule.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      await schedulerApi.deleteSchedule(schedule.id);
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold flex items-center text-gray-900">
            <Settings className="w-5 h-5 mr-2 text-gray-700" />
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 border-gray-200">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter schedule name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Task Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 border-gray-200">Task Configuration</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Task Type *
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-1">
                {TASK_TYPES.find(t => t.value === formData.task_type)?.description}
              </p>
            </div>

            {formData.task_type === 'change_status' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 border-gray-200">Schedule Configuration</h3>
            
            <SimpleRecurrenceSelector
              value={formData.rrule}
              onChange={(rrule) => setFormData(prev => ({ ...prev, rrule }))}
              startDate={startDate}
              timezone={formData.timezone}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Asia/Tokyo">Japan Time (JST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London Time</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm font-medium text-gray-800">
                Enable this schedule
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              {schedule && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.name}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {schedule ? 'Update' : 'Create'} Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}