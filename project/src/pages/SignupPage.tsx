import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page with signup mode
    navigate('/login?mode=signup', { replace: true });
  }, [navigate]);

  return null;
}
