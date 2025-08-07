'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

interface RecurrenceConfig {
  type: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: number; // 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number; // 1-31
}

interface SimpleRecurrenceSelectorProps {
  value?: string;
  onChange: (rrule: string) => void;
  startDate: Date;
  timezone?: string;
}

export default function SimpleRecurrenceSelector({ 
  value, 
  onChange, 
  startDate, 
  timezone = 'Asia/Tokyo' 
}: SimpleRecurrenceSelectorProps) {
  const [config, setConfig] = useState<RecurrenceConfig>({
    type: 'none',
    time: '09:00'
  });

  const [preview, setPreview] = useState<string[]>([]);

  useEffect(() => {
    generateRRule();
  }, [config]);

  const generateRRule = () => {
    if (config.type === 'none') {
      onChange('');
      setPreview([]);
      return;
    }

    const [hours, minutes] = config.time.split(':').map(Number);
    
    let rrule = '';
    let previewDates: string[] = [];
    
    switch (config.type) {
      case 'daily':
        rrule = 'FREQ=DAILY';
        previewDates = generatePreviewDates('daily', hours, minutes);
        break;
      case 'weekdays':
        rrule = 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR';
        previewDates = generatePreviewDates('weekdays', hours, minutes);
        break;
      case 'weekly':
        const dayOfWeek = config.dayOfWeek ?? startDate.getDay();
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        rrule = `FREQ=WEEKLY;BYDAY=${dayNames[dayOfWeek]}`;
        previewDates = generatePreviewDates('weekly', hours, minutes, dayOfWeek);
        break;
      case 'monthly':
        const dayOfMonth = config.dayOfMonth ?? startDate.getDate();
        rrule = `FREQ=MONTHLY;BYMONTHDAY=${dayOfMonth}`;
        previewDates = generatePreviewDates('monthly', hours, minutes, undefined, dayOfMonth);
        break;
    }
    
    onChange(rrule);
    setPreview(previewDates);
  };

  const generatePreviewDates = (
    type: string, 
    hours: number, 
    minutes: number, 
    dayOfWeek?: number, 
    dayOfMonth?: number
  ): string[] => {
    const dates: string[] = [];
    const now = new Date();
    
    for (let i = 0; i < 5; i++) {
      let nextDate = new Date(now);
      nextDate.setHours(hours, minutes, 0, 0);
      
      switch (type) {
        case 'daily':
          nextDate.setDate(now.getDate() + i + (nextDate <= now ? 1 : 0));
          break;
        case 'weekdays':
          let daysAdded = 0;
          let currentDate = new Date(now);
          if (nextDate <= now) currentDate.setDate(currentDate.getDate() + 1);
          
          while (daysAdded <= i) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
              if (daysAdded === i) {
                nextDate = new Date(currentDate);
                nextDate.setHours(hours, minutes, 0, 0);
                break;
              }
              daysAdded++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
          break;
        case 'weekly':
          const targetDay = dayOfWeek ?? 1;
          let daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
          if (daysUntilTarget === 0 && nextDate <= now) daysUntilTarget = 7;
          nextDate.setDate(now.getDate() + daysUntilTarget + (i * 7));
          break;
        case 'monthly':
          const targetDayOfMonth = dayOfMonth ?? 1;
          nextDate.setMonth(now.getMonth() + i);
          nextDate.setDate(targetDayOfMonth);
          if (nextDate <= now && i === 0) {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
          break;
      }
      
      dates.push(nextDate.toLocaleString());
    }
    
    return dates;
  };

  const handleTypeChange = (type: RecurrenceConfig['type']) => {
    setConfig(prev => ({ 
      ...prev, 
      type,
      dayOfWeek: type === 'weekly' ? startDate.getDay() : undefined,
      dayOfMonth: type === 'monthly' ? startDate.getDate() : undefined
    }));
  };

  const handleTimeChange = (time: string) => {
    setConfig(prev => ({ ...prev, time }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Repeat
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'none', label: 'No repeat' },
            { key: 'daily', label: 'Daily' },
            { key: 'weekdays', label: 'Weekdays' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' }
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTypeChange(key as RecurrenceConfig['type'])}
              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                config.type === key
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {config.type !== 'none' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={config.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {config.type === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of week
                </label>
                <select
                  value={config.dayOfWeek ?? 1}
                  onChange={(e) => setConfig(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
            )}

            {config.type === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of month
                </label>
                <select
                  value={config.dayOfMonth ?? 1}
                  onChange={(e) => setConfig(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {preview.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Next 5 runs:
                </span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                {preview.map((date, index) => (
                  <li key={index}>• {date}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}