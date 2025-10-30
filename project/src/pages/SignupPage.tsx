import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupForm, { SignupFormData } from '../components/SignupForm';
import { useAuth } from '../contexts/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDarkMode] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignup = async (formData: SignupFormData) => {
    try {
      // Use real signup API
      console.log('Signup data:', formData);
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          website: formData.website,
          postbackUrl: formData.postbackUrl,
          parameterMappings: formData.parameterMappings
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Signup successful:', result);
        
        // Show success message
        alert('PepperAds account created successfully! Please login to continue.');
        
        // Redirect to login
        navigate('/login');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert(`Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return <SignupForm isDarkMode={isDarkMode} onSubmit={handleSignup} />;
}
