import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../../shared/types';
import { authService } from '../services/authService';

interface UserPermissions {
  authenticated: boolean;
  role: string | null;
  status: string | null;
  features: string[];
  can_access_admin: boolean;
  role_display_name: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  permissions: UserPermissions | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  hasFeature: (feature: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccessAdmin: () => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    permissions: null
  });

  const fetchPermissions = async (): Promise<UserPermissions | null> => {
    try {
      const response = await authService.getPermissions();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      authService.setToken(token);
      // Verify token and get user profile
      authService.getProfile()
        .then(async response => {
          const permissions = await fetchPermissions();
          setState({
            user: response.data.data?.user || response.data.user,
            token,
            loading: false,
            permissions
          });
        })
        .catch(error => {
          console.error('Token validation failed:', error);
          localStorage.removeItem('auth_token');
          setState({
            user: null,
            token: null,
            loading: false,
            permissions: null
          });
        });
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      const responseData = response.data.data || response.data;
      const { user, token } = responseData;
      
      localStorage.setItem('auth_token', token);
      authService.setToken(token);
      
      const permissions = await fetchPermissions();
      
      setState({
        user,
        token,
        loading: false,
        permissions
      });
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authService.register({ email, password, name });
      const responseData = response.data.data || response.data;
      const { user, token } = responseData;
      
      localStorage.setItem('auth_token', token);
      authService.setToken(token);
      
      const permissions = await fetchPermissions();
      
      setState({
        user,
        token,
        loading: false,
        permissions
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    authService.setToken(null);
    setState({
      user: null,
      token: null,
      loading: false,
      permissions: null
    });
  };

  const updateUser = (user: User) => {
    setState(prev => ({ ...prev, user }));
  };

  const hasFeature = (feature: string): boolean => {
    return state.permissions?.features.includes(feature) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!state.permissions?.role) return false;
    const roleHierarchy = ['basic', 'premium', 'enterprise', 'admin'];
    const userLevel = roleHierarchy.indexOf(state.permissions.role);
    const requiredLevel = roleHierarchy.indexOf(role);
    return userLevel >= requiredLevel;
  };

  const canAccessAdmin = (): boolean => {
    return state.permissions?.can_access_admin || false;
  };

  const refreshPermissions = async (): Promise<void> => {
    const permissions = await fetchPermissions();
    setState(prev => ({ ...prev, permissions }));
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    hasFeature,
    hasRole,
    canAccessAdmin,
    refreshPermissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
