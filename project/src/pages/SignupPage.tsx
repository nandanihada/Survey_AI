import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { captureRefCode } from '../hooks/useTracking';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Capture ref code BEFORE redirecting so it's saved to localStorage
    captureRefCode();

    // Preserve ?ref= through the redirect to the actual signup form
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    const dest = ref ? `/login?mode=signup&ref=${ref}` : '/login?mode=signup';
    navigate(dest, { replace: true });
  }, [navigate, location.search]);

  return null;
}
