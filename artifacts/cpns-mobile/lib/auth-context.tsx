import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { apiGet, apiPost, User, API_URL } from './api';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiGet<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{ user: User }>('/auth/login', { email, password });
    setUser(data.user);
  };

  const loginWithGoogle = async () => {
    // Pass ?mobile=1 so the server encodes the mobile flag in OAuth state and,
    // after success, redirects to cpns-mobile://auth-success?token=<one-time-token>.
    const googleUrl = `${API_URL}/auth/google?mobile=1`;
    const result = await WebBrowser.openAuthSessionAsync(googleUrl, 'cpns-mobile://');

    // User cancelled or dismissed the browser
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Login dibatalkan');
    }

    if (result.type !== 'success') {
      throw new Error('Login Google gagal. Coba lagi.');
    }

    const url = result.url;

    // Server redirected to cpns-mobile://auth-error?reason=...
    if (url.startsWith('cpns-mobile://auth-error')) {
      const qs = url.split('?')[1] ?? '';
      const params = new URLSearchParams(qs);
      const reason = params.get('reason') ?? 'unknown';
      throw new Error(`Login Google gagal (${reason}). Coba lagi.`);
    }

    // Server redirected to cpns-mobile://auth-success?token=<uuid>
    // Extract the one-time token and exchange it for a real session.
    const qs = url.split('?')[1] ?? '';
    const params = new URLSearchParams(qs);
    const token = params.get('token');

    if (!token) {
      throw new Error('Token autentikasi tidak ditemukan. Coba lagi.');
    }

    // Exchange token for session — server creates the session, returns user
    const data = await apiPost<{ user: User }>('/auth/mobile-session', { token });
    if (!data.user) {
      throw new Error('Gagal mendapatkan data pengguna setelah login.');
    }
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // ignore
    }
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
