/**
 * User Tracking Hook
 * Sends real-time tracking events to the backend.
 * Tracks: page visits, button clicks, pricing clicks, premium attempts, sessions
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/deploymentFix';

const baseUrl = getApiBaseUrl();

// Generate a session ID that persists for the browser session
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('tracking_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('tracking_session_id', sessionId);
  }
  return sessionId;
}

// Get user info from localStorage
function getUserInfo() {
  try {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      return {
        user_id: user.id || user._id || 'anonymous',
        user_email: user.email || '',
        user_name: user.name || ''
      };
    }
  } catch {}
  return { user_id: 'anonymous', user_email: '', user_name: '' };
}

// Send tracking event (fire-and-forget, no await needed)
function sendTrackingEvent(endpoint: string, data: Record<string, any>) {
  const user = getUserInfo();
  const payload = {
    ...user,
    session_id: getSessionId(),
    ...data
  };

  fetch(`${baseUrl}/api/tracking/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {}); // Silent fail - tracking should never break UX
}

// ==================== Exported tracking functions ====================

/** Track a page visit */
export function trackPageVisit(page: string, pageTitle?: string) {
  sendTrackingEvent('page-visit', {
    page,
    page_title: pageTitle || document.title,
    referrer: document.referrer
  });
}

/** Track a button click */
export function trackButtonClick(buttonId: string, buttonText: string, page: string, section?: string) {
  sendTrackingEvent('button-click', {
    button_id: buttonId,
    button_text: buttonText,
    page,
    section: section || ''
  });
}

/** Track a pricing page/CTA click */
export function trackPricingClick(source: string, planClicked?: string, buttonText?: string) {
  sendTrackingEvent('pricing-click', {
    source,
    plan_clicked: planClicked || '',
    button_text: buttonText || '',
    page: window.location.pathname
  });
}

/** Track a premium feature attempt */
export function trackPremiumAttempt(featureName: string, featureDescription?: string) {
  const userData = localStorage.getItem('user_data');
  let userRole = 'basic';
  try {
    if (userData) userRole = JSON.parse(userData).role || 'basic';
  } catch {}

  sendTrackingEvent('premium-attempt', {
    feature_name: featureName,
    feature_description: featureDescription || '',
    user_role: userRole,
    page: window.location.pathname
  });
}

/** Track session start */
export function trackSessionStart() {
  sendTrackingEvent('session-start', {});

  // Request GPS location (user will see a permission popup once)
  requestGPSLocation();
}

/** Request GPS geolocation and send to backend if allowed */
function requestGPSLocation() {
  if (!navigator.geolocation) return;

  // Check if we already got GPS this session
  if (sessionStorage.getItem('tracking_gps_sent')) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      // User allowed - send precise GPS location
      sessionStorage.setItem('tracking_gps_sent', '1');
      sendTrackingEvent('geo-update', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'gps'
      });
    },
    () => {
      // User denied or error - that's fine, IP-based will be used
      sessionStorage.setItem('tracking_gps_sent', '1');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

/** Track login event (call after successful login) */
export function trackLoginEvent(loginMethod: string = 'email') {
  sendTrackingEvent('login-event', {
    login_method: loginMethod
  });

  // Link landing page session to this user if ref_session exists in URL
  linkLandingSession();
}

/** Link landing page anonymous session to the now-logged-in user */
export function linkLandingSession() {
  try {
    // Check URL for ref_session parameter (passed from landing page)
    const params = new URLSearchParams(window.location.search);
    const landingSession = params.get('ref_session');
    if (!landingSession) return;

    const user = getUserInfo();
    if (!user.user_email || user.user_email === '') return;

    fetch(`${baseUrl}/api/tracking/link-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: landingSession,
        user_id: user.user_id,
        user_email: user.user_email,
        user_name: user.user_name
      })
    }).catch(() => {});

    // Clean the URL param so it doesn't persist
    params.delete('ref_session');
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
  } catch {}
}

// ==================== Auto-tracking hook ====================

/**
 * Hook that automatically tracks page visits on route changes
 * and sends session start on first mount.
 * Place this in your App component or layout.
 */
export function useAutoTracking() {
  const location = useLocation();
  const sessionStarted = useRef(false);
  const lastPath = useRef('');

  // Track session start once
  useEffect(() => {
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      trackSessionStart();
    }
  }, []);

  // Track page visits on route change
  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      trackPageVisit(location.pathname);
    }
  }, [location.pathname]);

  // Global button/link click tracking — captures every <button> and <a> click
  useEffect(() => {
    function handleGlobalClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Walk up the DOM to find the nearest button or anchor
      const clickable = target.closest('button, a, [role="button"]') as HTMLElement | null;
      if (!clickable) return;

      const tagName = clickable.tagName.toLowerCase();
      const buttonText = clickable.textContent?.trim().substring(0, 80) || '';
      const buttonId = clickable.id || clickable.getAttribute('data-track-id') || `${tagName}:${buttonText.substring(0, 30)}`;
      const href = clickable.getAttribute('href') || '';
      const section = clickable.closest('section, [data-section], nav, header, footer, main')
        ?.getAttribute('data-section') || clickable.closest('nav') ? 'nav'
        : clickable.closest('header') ? 'header'
        : clickable.closest('footer') ? 'footer'
        : '';

      // Don't track empty/invisible elements
      if (!buttonText && !href) return;

      trackButtonClick(
        buttonId,
        buttonText || href,
        location.pathname,
        section
      );
    }

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [location.pathname]);
}

/**
 * Hook that provides a click handler wrapper for tracking button clicks.
 * Use on important buttons throughout the app.
 */
export function useButtonTracking(buttonId: string, buttonText: string, section?: string) {
  const location = useLocation();

  const trackClick = useCallback((originalHandler?: () => void) => {
    trackButtonClick(buttonId, buttonText, location.pathname, section);
    originalHandler?.();
  }, [buttonId, buttonText, location.pathname, section]);

  return trackClick;
}

export default useAutoTracking;
