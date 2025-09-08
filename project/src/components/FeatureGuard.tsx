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
  const { hasFeature } = useAuth();
  
  if (hasFeature(feature)) {
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
  const { user } = useAuth();
  
  // Check if user has the required role or higher
  const roleHierarchy = ['basic', 'premium', 'enterprise', 'admin'];
  const userRoleIndex = user ? roleHierarchy.indexOf(user.role) : -1;
  const requiredRoleIndex = roleHierarchy.indexOf(role);
  
  if (userRoleIndex >= requiredRoleIndex && userRoleIndex !== -1) {
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
  fallback = <div className="text-red-600">Admin access required</div> 
}) => {
  const { isAdmin } = useAuth();
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Hook for checking feature access in components
export const useFeatureAccess = () => {
  const { hasFeature, user, isAdmin, hasPremiumAccess, hasEnterpriseAccess } = useAuth();
  
  return {
    hasFeature,
    user,
    isAdmin,
    hasPremiumAccess,
    hasEnterpriseAccess,
    // Helper functions for common checks
    canCreateSurveys: () => hasFeature('create'),
    canViewAnalytics: () => hasFeature('analytics'),
    canUsePostback: () => hasFeature('postback'),
    canUsePassFail: () => hasFeature('pass_fail'),
    canUseTestLab: () => hasFeature('test_lab'),
    isBasic: () => user?.role === 'basic',
    isPremium: () => user?.role === 'premium',
    isEnterprise: () => user?.role === 'enterprise',
    getUserRole: () => user?.role || 'basic'
  };
};
