/**
 * Legal Footer - Only appears on login, signup, and create-survey pages
 * Links: Privacy Policy, Terms of Use, Cookie Notice, Acceptable Uses, Do Not Sell, Cookie Preferences, Contact
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { openCookiePreferences } from './CookieConsent';

const SHOW_ON_ROUTES = ['/login', '/signup', '/create-survey'];

const LegalFooter: React.FC = () => {
  const location = useLocation();

  // Only show on specific routes
  if (!SHOW_ON_ROUTES.includes(location.pathname)) return null;

  return (
    <footer className="w-full border-t border-stone-200 bg-white/80 backdrop-blur-sm mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Privacy Policy</a>
        <span className="text-stone-300">·</span>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Terms of Use</a>
        <span className="text-stone-300">·</span>
        <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Cookie Notice</a>
        <span className="text-stone-300">·</span>
        <a href="/acceptable-uses" target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Acceptable Uses</a>
        <span className="text-stone-300">·</span>
        <a href="/do-not-sell" target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Do Not Sell My Info</a>
        <span className="text-stone-300">·</span>
        <button onClick={() => openCookiePreferences()} className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Cookie Preferences</button>
        <span className="text-stone-300">·</span>
        <a href="/contact" target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 hover:text-red-600 transition-colors">Contact</a>
      </div>
      <div className="text-center pb-5">
        <p className="text-xs text-stone-400">&copy; 2026 Survtit Market Research Survey LLP (Pepperwahl)</p>
      </div>
    </footer>
  );
};

export default LegalFooter;
