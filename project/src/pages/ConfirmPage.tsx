import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '../utils/deploymentFix';

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  const token = searchParams.get('token');
  const hasAttemptedRef = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token found. Please use the link from your email.');
      return;
    }

    const confirmAccount = async () => {
      if (hasAttemptedRef.current) return;
      hasAttemptedRef.current = true;
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/auth/confirm-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || 'Your email has been verified successfully.');

          const interval = setInterval(() => {
            setCountdown((c) => {
              if (c <= 1) {
                clearInterval(interval);
                navigate('/login');
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
        setMessage('This link is invalid or has expired.');
      }
    };

    confirmAccount();
  }, [token, navigate]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-white via-white to-red-50/50">
      {/* Background shading */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-red-100/40 via-red-50/20 to-transparent" />
        <div className="absolute -top-[20%] right-[10%] w-[50vh] h-[50vh] rounded-full bg-red-100/30 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[40vh] h-[40vh] rounded-full bg-orange-100/20 blur-[80px]" />
      </div>

      {/* Floating dots */}
      <motion.div
        className="absolute top-[15%] right-[18%] w-3 h-3 rounded-full bg-red-300/30"
        animate={{ y: [-20, 20, -20], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[25%] left-[12%] w-2 h-2 rounded-full bg-orange-300/40"
        animate={{ y: [15, -15, 15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-10 border border-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.06)] text-center">

          {/* Loading State */}
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Animated loader */}
              <div className="mx-auto w-20 h-20 mb-6 relative">
                <motion.div
                  className="absolute inset-0 rounded-full border-[3px] border-red-100"
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-red-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
              <p className="text-gray-500 text-sm">Please wait while we confirm your account...</p>
            </motion.div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Success icon - animated checkmark */}
              <div className="mx-auto w-20 h-20 mb-6 relative">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-400/30"
                  initial={{ scale: 1 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
                <motion.svg
                  className="absolute inset-0 w-full h-full p-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  />
                </motion.svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
              <p className="text-gray-500 text-sm mb-8">{message}</p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-shadow"
              >
                Continue to Login ({countdown}s)
              </motion.button>

              <p className="text-xs text-gray-400 mt-4">You'll be redirected automatically</p>
            </motion.div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Error icon */}
              <div className="mx-auto w-20 h-20 mb-6 relative">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-500"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
                />
                <motion.svg
                  className="absolute inset-0 w-full h-full p-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <motion.path
                    d="M6 18L18 6M6 6l12 12"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  />
                </motion.svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
              <p className="text-gray-500 text-sm mb-8">{message}</p>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/login?mode=signup')}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-500/20"
                >
                  Try Again
                </motion.button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </motion.div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Contact <a href="mailto:support@pepperwahl.com" className="text-red-500 hover:underline">support@pepperwahl.com</a>
        </p>
      </motion.div>
    </div>
  );
}
