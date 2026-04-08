import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<string>;
  verifySignup: (email: string, code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<string>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Use a short timeout for the refresh call to ensure the app loads quickly
      const response = await api.get<{ user: User }>('/api/auth/me', { timeout: 2000 });
      setUser(response.data.user);
    } catch (err) {
      console.error('Auth refresh failed (expected if not logged in):', err);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ user: User }>('/api/auth/login', { email, password });
    setUser(response.data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await api.post<{ message: string }>('/api/auth/signup', { name, email, password });
    return response.data.message;
  };

  const verifySignup = async (email: string, code: string) => {
    const response = await api.post<{ user: User }>('/api/auth/verify-signup', { email, code });
    setUser(response.data.user);
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await api.post<{ user: User }>('/api/auth/google', { credential });
    setUser(response.data.user);
  };

  const requestPasswordReset = async (email: string) => {
    const response = await api.post<{ message: string }>('/api/auth/forgot-password', { email });
    return response.data.message;
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    const response = await api.post<{ message: string }>('/api/auth/reset-password', {
      email,
      code,
      newPassword
    });
    return response.data.message;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      verifySignup,
      requestPasswordReset,
      resetPassword,
      loginWithGoogle,
      logout,
      refresh
    }),
    [loading, refresh, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
