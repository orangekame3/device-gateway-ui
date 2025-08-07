'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { deviceGatewayApi, DeviceStatus } from '@/lib/api';

export default function DeviceStatusCard() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await deviceGatewayApi.getDeviceStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch device status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'inactive' | 'maintenance') => {
    setChanging(true);
    try {
      await deviceGatewayApi.changeDeviceStatus(newStatus);
      await fetchStatus();
    } catch (error) {
      console.error('Failed to change status:', error);
      alert('Failed to change device status');
    } finally {
      setChanging(false);
    }
  };

  const getStatusIcon = () => {
    switch (status?.status) {
      case 'active':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'inactive':
        return <Activity className="w-6 h-6 text-gray-500" />;
      case 'maintenance':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status?.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Device Status</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-center mb-6">
            {getStatusIcon()}
            <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {status?.status || 'Not Set'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('active')}
              disabled={changing || status?.status === 'active'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Active
            </button>
            <button
              onClick={() => handleStatusChange('inactive')}
              disabled={changing || status?.status === 'inactive'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Inactive
            </button>
            <button
              onClick={() => handleStatusChange('maintenance')}
              disabled={changing || status?.status === 'maintenance'}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Maintenance
            </button>
          </div>
        </>
      )}
    </div>
  );
}