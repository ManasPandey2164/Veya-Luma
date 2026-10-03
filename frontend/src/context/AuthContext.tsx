import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PublicUser, RegisterPayload, LoginPayload } from '../services/authApi';
import {
  registerApi,
  loginApi,
  refreshApi,
  logoutApi,
  createGuestSessionApi,
  getMeApi,
} from '../services/authApi';
import { AuthContext, type AuthContextType } from './authTypes';

const GUEST_SESSION_STORAGE_KEY = 'veya_guest_session_id';
const ACCESS_TOKEN_STORAGE_KEY = 'veya_access_token_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [guestSessionId, setGuestSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const persistAccessToken = useCallback((token: string | null) => {
    setAccessToken(token);
    try {
      if (token) {
        sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable in restricted iframe or private mode
    }
  }, []);

  const persistGuestSession = useCallback((id: string | null) => {
    setGuestSessionId(id);
    try {
      if (id) {
        localStorage.setItem(GUEST_SESSION_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  /**
   * Initializes or loads an anonymous guest session if none exists.
   */
  const ensureGuestSession = useCallback(async () => {
    let existingId: string | null = null;
    try {
      existingId = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }

    if (existingId) {
      setGuestSessionId(existingId);
      return existingId;
    }

    try {
      const guestRes = await createGuestSessionApi();
      persistGuestSession(guestRes.guest_session_id);
      return guestRes.guest_session_id;
    } catch {
      // Fallback guest UUID if backend is offline
      const fallbackId = 'guest-' + Math.random().toString(36).substring(2, 12);
      persistGuestSession(fallbackId);
      return fallbackId;
    }
  }, [persistGuestSession]);

  /**
   * Attempts to refresh the authenticated session using HTTP-only cookie.
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await refreshApi();
      setUser(res.user);
      persistAccessToken(res.access_token);
      return true;
    } catch {
      persistAccessToken(null);
      setUser(null);
      return false;
    }
  }, [persistAccessToken]);

  // Initial bootstrap: restore session or initialize guest
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      setIsLoading(true);
      try {
        const storedToken = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (storedToken) {
          try {
            const me = await getMeApi(storedToken);
            if (isMounted) {
              setUser(me);
              setAccessToken(storedToken);
              setIsLoading(false);
              return;
            }
          } catch {
            // Token expired or invalid, try cookie refresh
          }
        }

        // Try silent refresh via HTTP-only cookie
        const refreshed = await refreshSession();
        if (!refreshed && isMounted) {
          await ensureGuestSession();
        }
      } catch {
        if (isMounted) {
          await ensureGuestSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [ensureGuestSession, refreshSession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const activeGuestId = guestSessionId || undefined;
        const res = await loginApi({ ...payload, guest_session_id: activeGuestId });
        setUser(res.user);
        persistAccessToken(res.access_token);
        if (res.guest_reconciled) {
          persistGuestSession(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [guestSessionId, persistAccessToken, persistGuestSession]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setIsLoading(true);
      setError(null);
      try {
        const activeGuestId = guestSessionId || undefined;
        const res = await registerApi({ ...payload, guest_session_id: activeGuestId });
        setUser(res.user);
        persistAccessToken(res.access_token);
        if (res.guest_reconciled) {
          persistGuestSession(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Registration failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [guestSessionId, persistAccessToken, persistGuestSession]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi(accessToken || undefined);
    } finally {
      setUser(null);
      persistAccessToken(null);
      // Re-initialize guest session on logout
      await ensureGuestSession();
      setIsLoading(false);
    }
  }, [accessToken, ensureGuestSession, persistAccessToken]);

  const isAuthenticated = useMemo(() => Boolean(user && accessToken), [user, accessToken]);
  const isGuest = useMemo(() => !isAuthenticated, [isAuthenticated]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      guestSessionId,
      isAuthenticated,
      isGuest,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshSession,
      clearError,
    }),
    [
      user,
      accessToken,
      guestSessionId,
      isAuthenticated,
      isGuest,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshSession,
      clearError,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
