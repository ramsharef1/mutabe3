'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getMe, refreshToken as refreshTokenFn } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    async function checkAuth() {
      try {
        const token = localStorage.getItem('accessToken');
        const refreshTokenStored = localStorage.getItem('refreshToken');

        if (token) {
          const userData = await getMe(token);
          if (userData) {
            setUser(userData);
          } else if (refreshTokenStored) {
            // Try to refresh token
            const result = await refreshTokenFn(refreshTokenStored);
            if (result.accessToken) {
              localStorage.setItem('accessToken', result.accessToken);
              const userData = await getMe(result.accessToken);
              if (userData) {
                setUser(userData);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
