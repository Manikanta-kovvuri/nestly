import apiClient from './api';

export interface TenantUser {
  id: number;
  name: string;
  email: string;
}

export interface Tenant {
  id: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user: TenantUser;
}

export const tenantApi = {
  getAll: async (): Promise<Tenant[]> => {
    const response = await apiClient.get<Tenant[]>('/tenants');
    return response.data;
  },

  getById: async (id: number): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>(`/tenants/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Tenant> => {
    const response = await apiClient.post<Tenant>('/tenants', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${id}`, data);
    return response.data;
  },
};
