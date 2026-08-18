import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'OWNER' | 'TENANT';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

/**
 * Zustand auth store with persistence.
 *
 * Uses the 'persist' middleware to keep auth state in localStorage across
 * page refreshes. The token is stored both in localStorage (for the Axios
 * interceptor) and in the store for convenience.
 *
 * Token key: 'nestly_token' — must match what api.ts reads from localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem('nestly_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('nestly_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'nestly_auth',
      // Only persist user and token — isAuthenticated is derived on rehydration
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
