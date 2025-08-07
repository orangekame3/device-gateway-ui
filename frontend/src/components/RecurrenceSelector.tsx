'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { RecurrencePreset, RRulePreview, schedulerApi } from '@/lib/scheduler-api';
import { format } from 'date-fns';

interface RecurrenceSelectorProps {
  value?: string;
  onChange: (rrule: string) => void;
  startDate: Date;
  timezone?: string;
}

export default function RecurrenceSelector({ 
  value, 
  onChange, 
  startDate, 
  timezone = 'UTC' 
}: RecurrenceSelectorProps) {
  const [presets, setPresets] = useState<RecurrencePreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customRRule, setCustomRRule] = useState<string>('');
  const [preview, setPreview] = useState<RRulePreview | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPresets();
  }, []);

  useEffect(() => {
    if (value) {
      // Check if the value matches any preset
      const matchingPreset = presets.find(p => p.rrule === value);
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.id);
        setIsCustom(false);
      } else {
        setCustomRRule(value);
        setIsCustom(true);
      }
      previewRRule(value);
    }
  }, [value, presets]);

  const fetchPresets = async () => {
    setLoading(true);
    try {
      const response = await schedulerApi.getPresets();
      setPresets(response.data);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const previewRRule = async (rrule: string) => {
    if (!rrule.trim()) {
      setPreview(null);
      return;
    }

    try {
      const response = await schedulerApi.previewRRule(
        rrule,
        startDate.toISOString(),
        timezone
      );
      setPreview(response.data);
    } catch (error) {
      console.error('Failed to preview RRULE:', error);
      setPreview({
        next_runs: [],
        human_readable: '',
        is_valid: false,
        error_message: 'Failed to validate recurrence rule'
      });
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    setIsCustom(false);
    
    if (presetId === 'custom') {
      setIsCustom(true);
      return;
    }
    
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      onChange(preset.rrule);
    }
  };

  const handleCustomRRuleChange = (rrule: string) => {
    setCustomRRule(rrule);
    onChange(rrule);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recurrence Pattern
        </label>
        <div className="relative">
          <select
            value={isCustom ? 'custom' : selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">Select a pattern...</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
            <option value="custom">Custom...</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        
        {selectedPreset && !isCustom && (
          <p className="text-sm text-gray-600 mt-1">
            {presets.find(p => p.id === selectedPreset)?.description}
          </p>
        )}
      </div>

      {isCustom && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom RRULE
          </label>
          <textarea
            value={customRRule}
            onChange={(e) => handleCustomRRuleChange(e.target.value)}
            placeholder="Enter RRULE (e.g., DTSTART:20240101T090000Z&#10;RRULE:FREQ=DAILY)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter an iCalendar RRULE string. Include DTSTART for proper scheduling.
          </p>
        </div>
      )}

      {preview && (
        <div className={`p-4 rounded-md ${preview.is_valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center mb-2">
            <Clock className={`w-4 h-4 mr-2 ${preview.is_valid ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-sm font-medium ${preview.is_valid ? 'text-green-800' : 'text-red-800'}`}>
              {preview.is_valid ? 'Schedule Preview' : 'Invalid Rule'}
            </span>
          </div>
          
          {preview.is_valid ? (
            <>
              {preview.human_readable && (
                <p className="text-sm text-green-700 mb-2">{preview.human_readable}</p>
              )}
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">Next 5 runs:</p>
                <ul className="text-sm text-green-700 space-y-1">
                  {preview.next_runs.map((date, index) => (
                    <li key={index}>• {formatDate(date)}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-700">
              {preview.error_message || 'Invalid recurrence rule'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}