import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import OptimizedLoader from '../components/OptimizedLoader';
import { CheckCircle, XCircle, Mail, Clock, User } from 'lucide-react';

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [countdown, setCountdown] = useState(5);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token found. Please use the link from your email.');
      return;
    }

    // Auto-confirm
    const confirmAccount = async () => {
      try {
        const response = await fetch('/api/auth/confirm', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || 'Account confirmed! Redirecting...');
          setSurveyId(result.surveyId || '');
          
          // Auto-redirect countdown
          const interval = setInterval(() => {
            setCountdown((c) => {
              if (c <= 1) {
                clearInterval(interval);
                if (result.surveyId) {
                  navigate(`/dashboard/responses/${result.surveyId}`);
                } else {
                  navigate('/dashboard');
                }
                return 0;
              }
              return c - 1;
            });
          }, 1000);
          
          return () => clearInterval(interval);
        } else {
          throw new Error(result.error || 'Confirmation failed');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Confirmation failed. Please try again or signup.');
      }
    };

    confirmAccount();
  }, [token, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Confirming Account...</h1>
          <p className="text-gray-600 mb-8">Verifying your email and activating your PepperAds account.</p>
          <OptimizedLoader type="inline" size="lg" />
        </div>
      </div>
    );
  }

  const isSuccess = status === 'success';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isSuccess ? 'bg-gradient-to-br from-emerald-50 to-green-50' : 'bg-gradient-to-br from-red-50 to-orange-50'}`}>
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Icon */}
        <div className={`w-24 h-24 mx-auto rounded-2xl p-6 shadow-2xl flex items-center justify-center ${isSuccess ? 'bg-emerald-500/10 border-4 border-emerald-500/30' : 'bg-red-500/10 border-4 border-red-500/30'}`}>
          {isSuccess ? (
            <CheckCircle className="w-16 h-16 text-emerald-600" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600" />
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className={`text-3xl font-bold ${isSuccess ? 'text-emerald-900' : 'text-red-900'}`}>
            {isSuccess ? 'Account Confirmed!' : 'Confirmation Failed'}
          </h1>
          <p className="text-xl font-semibold mt-2 text-gray-700">{message}</p>
        </div>

        {/* Details */}
        {isSuccess && surveyId && (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Redirecting to Response
            </h3>
            <div className="space-y-2 text-sm text-gray-600 text-left">
              <p><strong>Survey:</strong> {surveyId}</p>
              <p>Opening your dashboard with response context...</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-6">
          {isSuccess ? (
            <>
              <button
                onClick={() => {
                  if (surveyId) {
                    navigate(`/dashboard/responses/${surveyId}`);
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 mx-auto"
              >
                <CheckCircle className="w-5 h-5" />
                Go to Dashboard ({countdown}s)
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Login Now
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/signup')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Signup Again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Go to Login
              </button>
            </>
          )}
        </div>

        {/* Support note */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>Need help? Contact <a href="mailto:support@pepperads.com" className="text-red-600 hover:text-red-700 underline">support@pepperads.com</a></p>
          <p className="text-gray-400 text-[11px]">© 2024 PepperAds</p>
        </div>
      </div>
    </div>
  );
}

