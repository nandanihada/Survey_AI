import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ 
  feature, 
  children, 
  fallback = null 
}) => {
  const { permissions } = useAuth();
  
  // If no permissions loaded yet, don't show anything
  if (!permissions) {
    return null;
  }
  
  // Check if user has the required feature
  const hasFeature = permissions.features.includes(feature);
  
  if (hasFeature) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

interface RoleGuardProps {
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  role, 
  children, 
  fallback = null 
}) => {
  const { permissions } = useAuth();
  
  // If no permissions loaded yet, don't show anything
  if (!permissions) {
    return null;
  }
  
  // Check role hierarchy
  const roleHierarchy = ['basic', 'premium', 'enterprise', 'admin'];
  const userLevel = roleHierarchy.indexOf(permissions.role || 'basic');
  const requiredLevel = roleHierarchy.indexOf(role);
  
  const hasRole = userLevel >= requiredLevel;
  
  if (hasRole) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  fallback = null 
}) => {
  const { permissions } = useAuth();
  
  // If no permissions loaded yet, don't show anything
  if (!permissions) {
    return null;
  }
  
  if (permissions.can_access_admin) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Feature access hook
export const useFeatureAccess = () => {
  const { permissions } = useAuth();
  
  return {
    hasFeature: (feature: string) => permissions?.features.includes(feature) || false,
    hasRole: (role: string) => {
      if (!permissions?.role) return false;
      const roleHierarchy = ['basic', 'premium', 'enterprise', 'admin'];
      const userLevel = roleHierarchy.indexOf(permissions.role);
      const requiredLevel = roleHierarchy.indexOf(role);
      return userLevel >= requiredLevel;
    },
    canAccessAdmin: () => permissions?.can_access_admin || false,
    userRole: permissions?.role || 'basic',
    userStatus: permissions?.status || 'approved',
    features: permissions?.features || []
  };
};
