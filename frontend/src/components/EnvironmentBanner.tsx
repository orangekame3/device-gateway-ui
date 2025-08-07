'use client';

import { Cpu, Server, Zap, AlertCircle, Loader } from 'lucide-react';
import Card, { CardContent } from '@/components/ui/Card';
import { useEnvironmentInfo } from '@/hooks/useEnvironmentInfo';

export default function EnvironmentBanner() {
  const { environmentInfo, loading, error } = useEnvironmentInfo();

  if (loading) {
    return (
      <Card variant="elevated" className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-center">
            <Loader className="w-5 h-5 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Loading environment info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !environmentInfo) {
    return (
      <Card variant="elevated" className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error || 'Environment information not available'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
          text: 'text-blue-100',
          icon: 'text-blue-200'
        };
      case 'green':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-green-600',
          text: 'text-green-100',
          icon: 'text-green-200'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
          text: 'text-gray-100',
          icon: 'text-gray-200'
        };
    }
  };

  const colorClasses = getColorClasses(environmentInfo.environment.color);

  return (
    <Card variant="elevated" className="mb-6 overflow-hidden">
      <div className={`${colorClasses.bg} text-white`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-2 rounded-lg">
                {environmentInfo.environment.type === 'hardware' ? (
                  <Cpu className={`w-6 h-6 ${colorClasses.icon}`} />
                ) : environmentInfo.environment.type === 'simulation' ? (
                  <Server className={`w-6 h-6 ${colorClasses.icon}`} />
                ) : (
                  <AlertCircle className={`w-6 h-6 ${colorClasses.icon}`} />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {environmentInfo.environment.name}
                </h2>
                <p className={`text-sm ${colorClasses.text}`}>
                  {environmentInfo.environment.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-medium">Device ID</div>
                <div className={`${colorClasses.text} font-mono`}>
                  {environmentInfo.device_id}
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium">Provider</div>
                <div className={`${colorClasses.text}`}>
                  {environmentInfo.provider_id}
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium">Max Qubits</div>
                <div className={`${colorClasses.text}`}>
                  {environmentInfo.max_qubits}
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium">Max Shots</div>
                <div className={`${colorClasses.text}`}>
                  {environmentInfo.max_shots.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}