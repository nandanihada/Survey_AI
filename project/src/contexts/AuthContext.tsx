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
      const currentUser = await authService.getCurrentUser();
      setAuthenticated(!!currentUser);
      setUser(currentUser);
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
      await authService.logout();
      setUser(null);
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if backend call fails
      setUser(null);
      setAuthenticated(false);
      throw error;
    }
  };

  useEffect(() => {
    // Check for existing token on mount
    const initAuth = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setAuthenticated(true);
          
          // Redirect to dashboard after successful authentication
          if (window.location.pathname === '/' || window.location.pathname.includes('auth')) {
            window.location.href = '/dashboard';
          }
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setUser(null);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const isAdmin = authService.isAdmin(user);
  const hasFeature = (feature: string) => authService.hasFeature(user, feature);
  const hasPremiumAccess = authService.hasPremiumAccess(user);
  const hasEnterpriseAccess = authService.hasEnterpriseAccess(user);

  // Global refresh function for permission updates
  React.useEffect(() => {
    (window as any).refreshUserPermissions = refreshAuth;
    return () => {
      delete (window as any).refreshUserPermissions;
    };
  }, [refreshAuth]);

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
