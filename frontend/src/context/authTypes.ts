import { createContext } from 'react';
import type { PublicUser, RegisterPayload, LoginPayload } from '../services/authApi';

export interface AuthContextType {
  user: PublicUser | null;
  accessToken: string | null;
  guestSessionId: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

export const defaultAuthContext: AuthContextType = {
  user: null,
  accessToken: null,
  guestSessionId: 'guest-preview-session',
  isAuthenticated: false,
  isGuest: true,
  isLoading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshSession: async () => false,
  clearError: () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);
