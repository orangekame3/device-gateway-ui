import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  message?: string;
}

export interface DeviceStatus {
  status?: 'active' | 'inactive' | 'maintenance';
  message?: string;
}

export interface EnvironmentInfo {
  device_id: string;
  provider_id: string;
  plugin_name: string;
  max_qubits: number;
  max_shots: number;
  environment: {
    name: string;
    type: 'simulation' | 'hardware' | 'unknown';
    description: string;
    color: string;
  };
}

export const deviceGatewayApi = {
  // Health check
  healthCheck: () => api.get('/health'),

  // Config operations
  downloadQubexConfig: () => api.post<ExecutionResult>('/config/download-qubex'),

  // Topology operations
  generateTopology: () => api.post<ExecutionResult>('/topology/generate'),
  downloadAndGenerateTopology: () => api.post<ExecutionResult>('/topology/download-and-generate'),
  getTopologyImage: () => `${API_BASE_URL}/config/topology/image`,

  // Device status operations
  getDeviceStatus: () => api.get<DeviceStatus>('/device/status'),
  changeDeviceStatus: (status: 'active' | 'inactive' | 'maintenance') =>
    api.post<ExecutionResult>('/device/status', { status }),

  // Environment information
  getEnvironmentInfo: () => api.get<EnvironmentInfo>('/config/environment'),

  // Config file operations
  getConfigYaml: () => api.get<{content: string}>('/config/yaml'),
  updateConfigYaml: (content: string) => api.post<{message: string}>('/config/yaml', { content }),
  
  // Topology request operations
  getTopologyRequest: () => api.get<{content: string}>('/config/topology-request'),
  updateTopologyRequest: (content: string) => api.post<{message: string}>('/config/topology-request', { content }),
};

export default api;