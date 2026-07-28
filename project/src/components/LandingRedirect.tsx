import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OptimizedLoader from './OptimizedLoader';
import { captureRefCode } from '../hooks/useTracking';

export default function LandingRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Capture ref code BEFORE redirecting so the click is tracked immediately
    captureRefCode();

    if (!loading) {
      // Preserve any ?ref= in the destination URL so the next page can also read it
      const params = new URLSearchParams(location.search);
      const refCode = params.get('ref');
      const dest = user ? '/dashboard' : '/create-survey';
      const destWithRef = refCode ? `${dest}?ref=${refCode}` : dest;
      navigate(destWithRef, { replace: true });
    }
  }, [user, loading, navigate, location.search]);

  return <OptimizedLoader type="page" message="Loading..." />;
}
