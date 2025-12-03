import { create } from 'zustand';
import { apiClient } from '@/services/api';

interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
  environment: string;
  isDocker: boolean;
}

interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion?: string;
  message?: string;
}

interface SystemState {
  systemInfo: SystemInfo | null;
  updateInfo: UpdateInfo | null;
  isCheckingUpdate: boolean;
  isUpdating: false;
  
  // Actions
  loadSystemInfo: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  systemInfo: null,
  updateInfo: null,
  isCheckingUpdate: false,
  isUpdating: false,

  loadSystemInfo: async () => {
    try {
      const response: any = await apiClient.get('/system/info');
      const data = response.data || response;
      set({ systemInfo: data });
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  },

  checkForUpdates: async () => {
    set({ isCheckingUpdate: true });
    try {
      const response: any = await apiClient.get('/system/updates/check');
      const data = response.data || response;
      set({ updateInfo: data });
      return data;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw error;
    } finally {
      set({ isCheckingUpdate: false });
    }
  },

  installUpdate: async () => {
    set({ isUpdating: true });
    try {
      const response: any = await apiClient.post('/system/updates/install');
      const data = response.data || response;
      return data;
    } catch (error) {
      console.error('Failed to install update:', error);
      set({ isUpdating: false });
      throw error;
    }
  },
}));
