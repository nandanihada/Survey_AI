/**
 * Cookie Consent Banner
 * Shows on first visit with: Accept All / Reject Non-Essential / Customize
 * Customize view: toggles per category. Essential cannot be turned off.
 * Can be re-opened via "Cookie Preferences" link in footer.
 */
import React, { useState, useEffect } from 'react';
import { Cookie, Shield, BarChart3, Megaphone, Settings2 } from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';

export interface CookiePreferences {
  essential: boolean; // always true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
};

/** Get saved cookie preferences */
export function getCookiePreferences(): CookiePreferences | null {
  try {
    const saved = localStorage.getItem('cookie_preferences');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

/** Open cookie preferences banner (call from footer link) */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
}

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);

  useEffect(() => {
    const existing = getCookiePreferences();
    if (!existing) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setPrefs(existing);
    }
  }, []);

  // Listen for re-open event from footer
  useEffect(() => {
    const handler = () => {
      const existing = getCookiePreferences();
      if (existing) setPrefs(existing);
      setShowCustomize(true);
      setVisible(true);
    };
    window.addEventListener('open-cookie-preferences', handler);
    return () => window.removeEventListener('open-cookie-preferences', handler);
  }, []);

  const savePreferences = (preferences: CookiePreferences) => {
    localStorage.setItem('cookie_preferences', JSON.stringify(preferences));
    localStorage.setItem('cookie_consent', 'customized');
    setPrefs(preferences);
    setVisible(false);
    setShowCustomize(false);

    // Save cookie preferences to backend (for admin panel + cross-domain sync)
    import('../hooks/useTracking').then(m => {
      m.trackButtonClick(
        'cookie_preference',
        `Cookie: functional=${preferences.functional}, analytics=${preferences.analytics}, marketing=${preferences.marketing}`,
        window.location.pathname,
        'cookie_banner'
      );
    });

    // Also save as a dedicated cookie preference record
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    fetch(`${getApiBaseUrl()}/api/tracking/cookie-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id || user._id || 'anonymous',
        user_email: user.email || '',
        user_name: user.name || '',
        session_id: sessionStorage.getItem('tracking_session_id') || '',
        preferences: preferences
      })
    }).catch(() => {});
  };

  const handleAcceptAll = () => {
    savePreferences({ essential: true, functional: true, analytics: true, marketing: true });
  };

  const handleRejectNonEssential = () => {
    savePreferences({ essential: true, functional: false, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    savePreferences({ ...prefs, essential: true });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-xs" style={{ animation: 'cookieSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      <div className="rounded-xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <Cookie size={16} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Cookie Preferences</h3>
            </div>
          </div>

          {!showCustomize ? (
            <>
              <p className="text-[11px] text-stone-600 leading-relaxed mb-3">
                We use cookies to keep you logged in, remember preferences, and improve your experience.
                {' '}<a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Learn more</a>
              </p>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleAcceptAll}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Accept All
                </button>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleRejectNonEssential}
                    className="flex-1 py-2 rounded-lg text-[11px] font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
                  >
                    Reject Non-Essential
                  </button>
                  <button
                    onClick={() => setShowCustomize(true)}
                    className="flex-1 py-2 rounded-lg text-[11px] font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Settings2 size={12} /> Customize
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Customize view */}
              <div className="space-y-2 mb-3">
                {/* Essential - always on */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-green-600" />
                    <div>
                      <p className="text-xs font-medium text-stone-800">Essential</p>
                      <p className="text-[10px] text-stone-500">Login, security</p>
                    </div>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-green-500 flex items-center justify-end px-0.5 cursor-not-allowed">
                    <div className="w-3 h-3 rounded-full bg-white shadow" />
                  </div>
                </div>

                {/* Functional */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-stone-200">
                  <div className="flex items-center gap-2">
                    <Settings2 size={14} className="text-blue-600" />
                    <div>
                      <p className="text-xs font-medium text-stone-800">Functional</p>
                      <p className="text-[10px] text-stone-500">Preferences</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs(p => ({ ...p, functional: !p.functional }))}
                    className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${prefs.functional ? 'bg-blue-500 justify-end' : 'bg-stone-300 justify-start'}`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow" />
                  </button>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-stone-200">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-purple-600" />
                    <div>
                      <p className="text-xs font-medium text-stone-800">Analytics</p>
                      <p className="text-[10px] text-stone-500">Usage data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
                    className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${prefs.analytics ? 'bg-purple-500 justify-end' : 'bg-stone-300 justify-start'}`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow" />
                  </button>
                </div>

                {/* Marketing */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-stone-200">
                  <div className="flex items-center gap-2">
                    <Megaphone size={14} className="text-orange-600" />
                    <div>
                      <p className="text-xs font-medium text-stone-800">Marketing</p>
                      <p className="text-[10px] text-stone-500">Ads</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs(p => ({ ...p, marketing: !p.marketing }))}
                    className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${prefs.marketing ? 'bg-orange-500 justify-end' : 'bg-stone-300 justify-start'}`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow" />
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowCustomize(false)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveCustom}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer link */}
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 text-center">
          <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-[10px] text-stone-500 hover:text-red-600 hover:underline">
            Full Cookie Notice
          </a>
        </div>
      </div>

      <style>{`
        @keyframes cookieSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CookieConsent;
