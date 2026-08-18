import axios from 'axios';

/**
 * Centralized Axios instance for all API communication.
 *
 * Base URL:
 *   - In development: Vite proxy forwards /api → http://localhost:3000/api
 *   - In production: set VITE_API_BASE_URL env var to the deployed backend URL
 *
 * Authentication:
 *   The request interceptor reads the JWT token from the Zustand auth store
 *   (via localStorage) and attaches it as a Bearer token on every request.
 *
 * Error handling:
 *   The response interceptor handles 401 responses by clearing the auth state
 *   and redirecting to /login.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nestly_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale token and redirect to login
      localStorage.removeItem('nestly_token');
      // Avoid circular import — use window.location directly
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
