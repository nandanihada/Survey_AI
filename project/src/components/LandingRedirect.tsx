import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OptimizedLoader from './OptimizedLoader';

export default function LandingRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading) {
      navigate(user ? '/dashboard' : '/create-survey', { replace: true });
    }
  }, [user, loading, navigate]);
  
  return <OptimizedLoader type="page" message="Loading..." />;
}
