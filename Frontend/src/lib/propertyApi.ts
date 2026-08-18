import apiClient from './api';

export interface Property {
  id: number;
  name: string;
  address: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export const propertyApi = {
  getAll: async (): Promise<Property[]> => {
    const response = await apiClient.get<Property[]>('/properties');
    return response.data;
  },
  
  getOne: async (id: number): Promise<Property> => {
    const response = await apiClient.get<Property>(`/properties/${id}`);
    return response.data;
  },

  create: async (data: { name: string; address: string }): Promise<Property> => {
    const response = await apiClient.post<Property>('/properties', data);
    return response.data;
  },

  update: async (id: number, data: Partial<{ name: string; address: string }>): Promise<Property> => {
    const response = await apiClient.patch<Property>(`/properties/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/properties/${id}`);
  },
};
