import React, { useState, useEffect } from 'react';

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay for page to load first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setVisible(false);
  };

  const handleCustomize = () => {
    localStorage.setItem('cookie_consent', 'essential_only');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999] max-w-sm"
      style={{ animation: 'cookieSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Text */}
        <p className="text-[13px] sm:text-sm text-slate-700 leading-relaxed mb-4">
          We use cookies to improve your experience and analyze site usage. You can accept all, reject non-essential, or only allow what's necessary.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Accept all
          </button>
          <button
            onClick={handleCustomize}
            className="flex-1 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold text-slate-700 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold text-stone-500 hover:text-stone-700 transition-colors"
          >
            Reject all
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cookieSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CookieConsent;
