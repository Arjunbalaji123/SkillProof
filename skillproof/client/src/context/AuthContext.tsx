import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { proctorCamera } from '../services/proctorCamera';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isDeveloper: boolean;
  isRecruiter: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('skillproof_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      // First try /auth/session using httpOnly cookie or stored token
      const res = await api.get('/auth/session');
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch {
      localStorage.removeItem('skillproof_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.post('/auth/login', { email: normalizedEmail, password });
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data.data;
      if (newToken) {
        localStorage.setItem('skillproof_token', newToken);
        setToken(newToken);
      }
      setUser(userData);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string = 'DEVELOPER',
    username?: string
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.post('/auth/register', { name: name.trim(), email: normalizedEmail, password, role, username });
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data.data;
      if (newToken) {
        localStorage.setItem('skillproof_token', newToken);
        setToken(newToken);
      }
      setUser(userData);
    }
  };

  const logout = async () => {
    proctorCamera.stopCamera();
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // ignore
    } finally {
      localStorage.removeItem('skillproof_token');
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const isAuthenticated = Boolean(user);
  const isDeveloper = user?.role === 'DEVELOPER';
  const isRecruiter = user?.role === 'RECRUITER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        loading: isLoading,
        login,
        register,
        logout,
        refreshUser,
        isDeveloper,
        isRecruiter,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
