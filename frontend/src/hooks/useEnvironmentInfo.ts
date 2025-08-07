import { useState, useEffect, useCallback } from 'react';
import { deviceGatewayApi, EnvironmentInfo } from '@/lib/api';

export function useEnvironmentInfo() {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironmentInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await deviceGatewayApi.getEnvironmentInfo();
      setEnvironmentInfo(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch environment info:', err);
      setError('Failed to load environment information');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEnvironmentInfo = useCallback(() => {
    fetchEnvironmentInfo();
  }, [fetchEnvironmentInfo]);

  useEffect(() => {
    fetchEnvironmentInfo();
    
    // Poll for environment info every 30 seconds
    const interval = setInterval(fetchEnvironmentInfo, 30000);
    
    // Refresh when window becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchEnvironmentInfo();
      }
    };
    
    const handleFocus = () => {
      fetchEnvironmentInfo();
    };
    
    // Listen for config updates
    const handleConfigUpdate = () => {
      fetchEnvironmentInfo();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('configUpdated', handleConfigUpdate);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('configUpdated', handleConfigUpdate);
    };
  }, [fetchEnvironmentInfo]);

  return {
    environmentInfo,
    loading,
    error,
    refreshEnvironmentInfo
  };
}