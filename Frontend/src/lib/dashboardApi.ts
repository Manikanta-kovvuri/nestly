import apiClient from './api';

export interface OwnerDashboardData {
  properties: { total: number };
  units: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
  };
  occupancyRate: number;
  tenants: { total: number };
  leases: {
    active: number;
    pending: number;
    expired: number;
    terminated: number;
  };
  payments: {
    totalCollected: number;
    thisMonth: number;
  };
  maintenance: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
}

export const dashboardApi = {
  getOwnerDashboard: async (): Promise<OwnerDashboardData> => {
    const response = await apiClient.get<OwnerDashboardData>('/dashboard/owner');
    return response.data;
  },
};
