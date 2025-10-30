/**
 * JWT Authentication context for the dashboard
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User, LoginRequest, RegisterRequest } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  hasFeature: (feature: string) => boolean;
  hasPremiumAccess: boolean;
  hasEnterpriseAccess: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshAuth = async () => {
    try {
      setLoading(true);
      // Check if user data exists in localStorage
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setAuthenticated(true);
        setUser(user);
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      setAuthenticated(true);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      setUser(null);
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if there's an error
      setUser(null);
      setAuthenticated(false);
    }
  };

  useEffect(() => {
    // Check for existing user data on mount
    refreshAuth();
  }, []);

  const isAdmin = user?.role === 'admin';
  const hasFeature = (feature: string) => {
    // Simple feature check based on role
    if (user?.role === 'admin') return true;
    if (user?.role === 'enterprise') return ['survey', 'analytics', 'postback', 'pass_fail', 'test_lab'].includes(feature);
    if (user?.role === 'premium') return ['survey', 'analytics', 'postback'].includes(feature);
    return ['survey'].includes(feature);
  };
  const hasPremiumAccess = user?.role === 'premium' || user?.role === 'enterprise' || user?.role === 'admin';
  const hasEnterpriseAccess = user?.role === 'enterprise' || user?.role === 'admin';

  const value: AuthContextType = {
    user,
    loading,
    authenticated,
    login,
    register,
    logout,
    isAdmin,
    hasFeature,
    hasPremiumAccess,
    hasEnterpriseAccess,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
