'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Calendar, Clock, Zap } from 'lucide-react';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import ScheduleForm from '@/components/ScheduleForm';
import Button from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import { Schedule } from '@/lib/scheduler-api';

export default function SchedulerPage() {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0); // For forcing calendar refresh

  const handleScheduleSelect = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedSchedule(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedSchedule(null);
  };

  const handleFormSave = () => {
    // Force calendar refresh by updating key
    setCalendarKey(prev => prev + 1);
  };

  return (
    <>
      <style jsx global>{`
        .fc-event {
          margin: 2px !important;
          border-radius: 6px !important;
          overflow: hidden !important;
        }
        .fc-event-main {
          color: white !important;
          padding: 0 !important;
        }
        .fc-daygrid-event {
          margin-top: 2px !important;
          margin-bottom: 2px !important;
          min-height: 60px !important;
        }
        .fc-event-title {
          color: white !important;
          font-weight: 600 !important;
          padding: 0 !important;
        }
        .fc-event-time {
          display: none !important;
        }
        .fc-daygrid-event-harness {
          margin-top: 2px !important;
          margin-bottom: 2px !important;
        }
        .fc-event-main-frame {
          padding: 0 !important;
        }
      `}</style>
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>

          {/* Hero Header */}
          <Card variant="elevated" className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="bg-white/20 p-3 rounded-full inline-flex mb-4">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h1 className="text-4xl font-bold mb-3">Schedule Manager</h1>
                  <p className="text-purple-100 text-lg max-w-2xl mx-auto mb-6">
                    Create and manage automated schedules for your device operations with precision and reliability
                  </p>
                  <div className="flex items-center justify-center space-x-6">
                    <div className="flex items-center text-purple-100">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">Automated Execution</span>
                    </div>
                    <div className="flex items-center text-purple-100">
                      <Zap className="w-4 h-4 mr-2" />
                      <span className="text-sm">Real-time Monitoring</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <ScheduleCalendar
            key={calendarKey}
            onScheduleSelect={handleScheduleSelect}
            onCreateClick={handleCreateClick}
          />

          <ScheduleForm
            schedule={selectedSchedule || undefined}
            isOpen={isFormOpen}
            onClose={handleFormClose}
            onSave={handleFormSave}
          />
        </div>
      </main>
    </>
  );
}