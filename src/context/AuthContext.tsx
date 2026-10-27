import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LanguageCode } from '../types/index.ts';
import { useLanguage } from './LanguageContext.tsx';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserLanguage: (lang: LanguageCode) => Promise<void>;
  refreshUser: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isConstructor: boolean;
  isWorker: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('constructflow_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const { setLanguage } = useLanguage();

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  };

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.languagePreference) {
          setLanguage(data.user.languagePreference);
        }
      } else {
        // Token invalid
        localStorage.removeItem('constructflow_token');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to fetch auth me:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      localStorage.setItem('constructflow_token', data.token);
      setToken(data.token);
      setUser(data.user);

      if (data.user.languagePreference) {
        setLanguage(data.user.languagePreference);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred' };
    }
  };

  const logout = () => {
    localStorage.removeItem('constructflow_token');
    setToken(null);
    setUser(null);
  };

  const updateUserLanguage = async (lang: LanguageCode) => {
    setLanguage(lang);
    if (!user) return;
    setUser(prev => (prev ? { ...prev, languagePreference: lang } : null));
    try {
      await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ languagePreference: lang })
      });
    } catch (e) {
      console.error('Failed to update language on backend:', e);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin' && user?.email.toLowerCase() === 'manasadevi4077@gmail.com';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isConstructor = user?.role === 'constructor';
  const isWorker = user?.role === 'worker';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUserLanguage,
        refreshUser,
        isSuperAdmin,
        isAdmin,
        isConstructor,
        isWorker,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
