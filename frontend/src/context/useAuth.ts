import { useContext } from 'react';
import { AuthContext, defaultAuthContext, type AuthContextType } from './authTypes';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};

export type { AuthContextType };
