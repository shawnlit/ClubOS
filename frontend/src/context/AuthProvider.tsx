import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';
import { signIn } from '../services/cognito';
import { apiFetch, setUnauthorizedHandler } from '../services/api';
import { clearSession, loadSession, saveSession } from '../services/session';
import { isAdmin as hasAdminRole } from '../lib/roles';
import type { Me } from '../types';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(() => loadSession() !== null);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    let cancelled = false;
    apiFetch<Me>('/me', { token: session.idToken })
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await signIn(email, password);
    saveSession(session);
    try {
      const me = await apiFetch<Me>('/me', { token: session.idToken });
      setUser(me);
      return me;
    } catch (error) {
      clearSession();
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: hasAdminRole(user), loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}