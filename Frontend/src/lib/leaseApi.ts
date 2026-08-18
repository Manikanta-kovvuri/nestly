import apiClient from './api';
import type { Tenant } from './tenantApi';
import type { Unit } from './unitApi';

export type LeaseStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface Lease {
  id: number;
  tenantId: number;
  unitId: number;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: LeaseStatus;
  createdAt: string;
  updatedAt: string;
  unit?: Unit;
  tenant?: Tenant;
}

export const leaseApi = {
  getAll: async (): Promise<Lease[]> => {
    const response = await apiClient.get<Lease[]>('/leases');
    return response.data;
  },

  getById: async (id: number): Promise<Lease> => {
    const response = await apiClient.get<Lease>(`/leases/${id}`);
    return response.data;
  },

  create: async (data: { tenantId: number; unitId: number; startDate: string; endDate: string; rentAmount: number }): Promise<Lease> => {
    const response = await apiClient.post<Lease>('/leases', data);
    return response.data;
  },

  update: async (id: number, data: Partial<{ startDate: string; endDate: string; rentAmount: number }>): Promise<Lease> => {
    const response = await apiClient.patch<Lease>(`/leases/${id}`, data);
    return response.data;
  },

  activate: async (id: number): Promise<Lease> => {
    const response = await apiClient.post<Lease>(`/leases/${id}/activate`);
    return response.data;
  },

  terminate: async (id: number): Promise<Lease> => {
    const response = await apiClient.post<Lease>(`/leases/${id}/terminate`);
    return response.data;
  },
};
