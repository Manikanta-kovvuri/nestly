import apiClient from './api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'OWNER' | 'TENANT';
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  login: async (credentials: Record<string, string>): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },
  
  register: async (data: Record<string, string>): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  me: async (): Promise<AuthUser> => {
    const res = await apiClient.get<AuthUser>('/auth/me');
    return res.data;
  }
};
