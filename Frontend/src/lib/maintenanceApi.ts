import apiClient from './api';
import type { Unit } from './unitApi';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Maintenance {
  id: number;
  unitId: number;
  reportedByUserId: number;
  title: string;
  category: string | null;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceDetail extends Maintenance {
  unit: Unit & {
    property: {
      id: number;
      name: string;
      address: string;
    };
  };
  reportedBy: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateMaintenanceDto {
  title: string;
  category?: string;
  description: string;
}

export interface UpdateMaintenanceStatusDto {
  status: MaintenanceStatus;
}

export const maintenanceApi = {
  getAll: async (): Promise<MaintenanceDetail[]> => {
    const response = await apiClient.get('/maintenance');
    return response.data;
  },

  getById: async (id: number): Promise<MaintenanceDetail> => {
    const response = await apiClient.get(`/maintenance/${id}`);
    return response.data;
  },

  create: async (data: CreateMaintenanceDto): Promise<Maintenance> => {
    const response = await apiClient.post('/maintenance', data);
    return response.data;
  },

  updateStatus: async (id: number, data: UpdateMaintenanceStatusDto): Promise<Maintenance> => {
    const response = await apiClient.patch(`/maintenance/${id}/status`, data);
    return response.data;
  },
};
