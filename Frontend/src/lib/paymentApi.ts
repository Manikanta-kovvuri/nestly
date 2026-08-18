import apiClient from './api';
import type { Lease } from './leaseApi';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Payment {
  id: number;
  leaseId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDetail extends Payment {
  lease: Lease;
}

export interface CreatePaymentDto {
  leaseId: number;
  amount: number;
  method: PaymentMethod;
}

export interface UpdatePaymentDto {
  amount?: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
}

export const paymentApi = {
  getAll: async (): Promise<Payment[]> => {
    const response = await apiClient.get('/payments');
    return response.data;
  },

  getById: async (id: number): Promise<PaymentDetail> => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  create: async (data: CreatePaymentDto): Promise<Payment> => {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePaymentDto): Promise<Payment> => {
    const response = await apiClient.patch(`/payments/${id}`, data);
    return response.data;
  },
};
