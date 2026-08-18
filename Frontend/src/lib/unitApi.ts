import apiClient from './api';
import type { Property } from './propertyApi';

export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';

export interface Unit {
  id: number;
  propertyId: number;
  unitNo: number;
  floor: string;
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
  property?: Property;
}

export const unitApi = {
  getAllByProperty: async (propertyId: number): Promise<Unit[]> => {
    const response = await apiClient.get<Unit[]>(`/properties/${propertyId}/units`);
    return response.data;
  },

  getOne: async (id: number): Promise<Unit> => {
    const response = await apiClient.get<Unit>(`/units/${id}`);
    return response.data;
  },

  create: async (
    propertyId: number,
    data: { unitNo: number; floor: string; status: UnitStatus }
  ): Promise<Unit> => {
    const response = await apiClient.post<Unit>(`/properties/${propertyId}/units`, data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<{ unitNo: number; floor: string; status: UnitStatus }>
  ): Promise<Unit> => {
    const response = await apiClient.patch<Unit>(`/units/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/units/${id}`);
  },
};
