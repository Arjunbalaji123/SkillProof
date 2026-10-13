import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'DEVELOPER' | 'RECRUITER';
  companyName?: string;
  jobTitle?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDeveloper: boolean;
  isRecruiter: boolean;
  isAdmin: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await api.get('/auth/session');
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const res = await api.post('/auth/login', credentials);
    const loggedInUser = res.data?.data?.user;
    if (!loggedInUser) {
      throw new Error(res.data?.message || 'Login failed');
    }
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (data: RegisterData): Promise<User> => {
    const res = await api.post('/auth/register', data);
    const registeredUser = res.data?.data?.user;
    if (!registeredUser) {
      throw new Error(res.data?.message || 'Registration failed');
    }
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await fetchSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        isDeveloper: user?.role === 'DEVELOPER',
        isRecruiter: user?.role === 'RECRUITER',
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
