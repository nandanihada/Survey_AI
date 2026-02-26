import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OptimizedLoader from './OptimizedLoader';

interface PublicRouteProps {
  children: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <OptimizedLoader type="page" message="Loading..." />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
