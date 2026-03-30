import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import OptimizedLoader from '../components/OptimizedLoader';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token found. Please use the link from your email.');
      return;
    }

    const confirmAccount = async () => {
      try {
        // ✅ Call your backend
        const isLocal = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocal ? 'http://localhost:5000' : 'https://api.pepperwahl.com';
        const response = await fetch(`${baseUrl}/api/auth/confirm?token=${token}`);
        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || 'Account confirmed successfully! Redirecting...');

          // ✅ Auto redirect countdown
          const interval = setInterval(() => {
            setCountdown((c) => {
              if (c <= 1) {
                clearInterval(interval);
                navigate('/dashboard');
                return 0;
              }
              return c - 1;
            });
          }, 1000);

        } else {
          throw new Error(result.message || 'Confirmation failed');
        }

      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage('Invalid or expired confirmation link.');
      }
    };

    confirmAccount();
  }, [token, navigate]);

  // 🔄 Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Confirming Account...</h1>
          <p className="text-gray-600 mb-8">
            Verifying your email and activating your account.
          </p>
          <OptimizedLoader type="page" />
        </div>
      </div>
    );
  }

  const isSuccess = status === 'success';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isSuccess
        ? 'bg-gradient-to-br from-emerald-50 to-green-50'
        : 'bg-gradient-to-br from-red-50 to-orange-50'
    }`}>
      
      <div className="max-w-md w-full space-y-6 text-center">

        {/* Icon */}
        <div className={`w-24 h-24 mx-auto rounded-2xl p-6 shadow-2xl flex items-center justify-center ${
          isSuccess
            ? 'bg-emerald-500/10 border-4 border-emerald-500/30'
            : 'bg-red-500/10 border-4 border-red-500/30'
        }`}>
          {isSuccess ? (
            <CheckCircle className="w-16 h-16 text-emerald-600" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600" />
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className={`text-3xl font-bold ${
            isSuccess ? 'text-emerald-900' : 'text-red-900'
          }`}>
            {isSuccess ? 'Account Confirmed!' : 'Confirmation Failed'}
          </h1>
          <p className="text-xl font-semibold mt-2 text-gray-700">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-6">
          {isSuccess ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg transition"
              >
                Go to Dashboard ({countdown}s)
              </button>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-xl"
              >
                Login Now
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/signup')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg transition"
              >
                Try Signup Again
              </button>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-xl"
              >
                Go to Login
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500">
          <p>
            Need help? Contact{' '}
            <a
              href="mailto:support@yourapp.com"
              className="text-red-600 underline"
            >
              support@pepperads.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}