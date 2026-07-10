import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User, setAuthToken, logoutUser, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, role: string, companyName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        const currentUser = await api.auth.getMe();
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    } catch (err) {
      console.error("Failed to authenticate user token:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      setAuthToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    role: string,
    companyName?: string
  ) => {
    setLoading(true);
    try {
      await api.auth.register({
        full_name: fullName,
        email,
        password,
        role,
        company_name: companyName,
      });
      // Automatically log in after registration
      await login(email, password);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const refreshed = await api.auth.getMe();
      setUser(refreshed);
      localStorage.setItem('user', JSON.stringify(refreshed));
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
