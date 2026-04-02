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
  confirmEmail: (token: string) => Promise<void>;
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

      const userData = localStorage.getItem('user_data');
      const token = localStorage.getItem('auth_token');

      if (userData && token) {
        try {
          const response = await fetch(
            `${window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:5000'
              : 'https://api.pepperwahl.com'}/api/auth/check`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (response.ok) {
            const authData = await response.json();

            if (authData.authenticated && authData.user) {
              setAuthenticated(true);
              setUser(authData.user);
              localStorage.setItem('user_data', JSON.stringify(authData.user));
            } else {
              localStorage.removeItem('user_data');
              localStorage.removeItem('auth_token');
              setAuthenticated(false);
              setUser(null);
            }
          } else {
            localStorage.removeItem('user_data');
            localStorage.removeItem('auth_token');
            setAuthenticated(false);
            setUser(null);
          }
        } catch (err) {
          console.error('Token verification failed:', err);
          localStorage.removeItem('user_data');
          localStorage.removeItem('auth_token');
          setAuthenticated(false);
          setUser(null);
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setAuthenticated(false);
      setUser(null);
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGIN (unchanged)
  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);

      setUser(response.user);
      setAuthenticated(true);

      localStorage.setItem('user_data', JSON.stringify(response.user));
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }

    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      setAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  // 🚨 FIXED REGISTER (NO AUTO LOGIN)
  const register = async (userData: RegisterRequest) => {
    try {
      await authService.register(userData);

      // ❌ DO NOT LOGIN USER
      setUser(null);
      setAuthenticated(false);

      // Ensure nothing stored
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');

    } catch (error) {
      console.error('Registration failed:', error);

      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      setAuthenticated(false);
      setUser(null);

      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      setUser(null);
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const confirmEmail = async (token: string) => {
    try {
      const response = await authService.confirmEmail(token);
      
      // User should now login manually
      setUser(null);
      setAuthenticated(false);
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      
      console.log('✅ Email confirmed successfully');
    } catch (error) {
      console.error('Email confirmation failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const isAdmin = user?.role === 'admin';

  const hasFeature = (feature: string) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'enterprise') return ['survey', 'analytics', 'postback', 'email', 'pass_fail', 'test_lab'].includes(feature);
    if (user?.role === 'premium') return ['survey', 'analytics', 'postback', 'email'].includes(feature);
    return ['survey', 'email'].includes(feature);
  };

  const hasPremiumAccess =
    user?.role === 'premium' ||
    user?.role === 'enterprise' ||
    user?.role === 'admin';

  const hasEnterpriseAccess =
    user?.role === 'enterprise' ||
    user?.role === 'admin';

  const value: AuthContextType = {
    user,
    loading,
    authenticated,
    login,
    register,
    confirmEmail,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};