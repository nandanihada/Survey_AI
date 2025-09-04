/**
 * Protected route component
 */
import React from 'react';
import AuthGuard from './AuthGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  return (
    <AuthGuard requireAdmin={requireAdmin}>
      {children}
    </AuthGuard>
  );
};

export default ProtectedRoute;
