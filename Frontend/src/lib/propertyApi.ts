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
};
