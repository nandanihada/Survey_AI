/**
 * Email Confirmation Page Component
 * Handles email confirmation link click and token verification
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EmailConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirmEmail } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasAttemptedRef = React.useRef(false);

  useEffect(() => {
    const confirmEmailToken = async () => {
      if (hasAttemptedRef.current) return;
      hasAttemptedRef.current = true;
      try {
        const token = searchParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('No confirmation token provided. Please check your email link.');
          return;
        }

        console.log('🔍 Confirming email with token:', token.substring(0, 20) + '...');
        
        await confirmEmail(token);
        
        setStatus('success');
        setMessage('✅ Your email has been confirmed! You can now login to your account.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } catch (error: any) {
        console.error('❌ Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to confirm your email. The link may have expired.');
      }
    };

    confirmEmailToken();
  }, [searchParams, confirmEmail, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">Email Confirmation</h1>
        
        {status === 'loading' && (
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-gray-600">Confirming your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mb-4 text-5xl">✅</div>
            <p className="text-green-600 font-semibold mb-2">Email Confirmed!</p>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mb-4 text-5xl">❌</div>
            <p className="text-red-600 font-semibold mb-2">Confirmation Failed</p>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                New Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConfirmation;
