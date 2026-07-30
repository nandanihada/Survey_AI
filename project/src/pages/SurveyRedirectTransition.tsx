/**
 * SurveyRedirectTransition - Transition page shown between survey and external redirect
 *
 * Flow:
 * 1. User answers Q5 (which has a redirect configured)
 * 2. System generates a return URL (resume token valid 24h)
 * 3. User is sent to: /survey-redirect?to=EXTERNAL_URL&return=RETURN_URL&survey=SURVEY_ID
 * 4. THIS PAGE shows:
 *    - A countdown timer (5s) then auto-redirects to external URL
 *    - A prominent "Continue Survey" button showing the return URL
 *    - User can copy the return link or bookmark it
 * 5. When user clicks "Continue Survey" (from the external page or this page), they resume from Q6
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const COUNTDOWN_SECONDS = 5;

const SurveyRedirectTransition: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [copied, setCopied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const externalUrl = searchParams.get('to') || '';
  const returnUrl = searchParams.get('return') || '';
  const surveyId = searchParams.get('survey') || '';

  // Ensure external URL has a scheme
  const normalizedExternal = externalUrl && !externalUrl.startsWith('http')
    ? 'https://' + externalUrl
    : externalUrl;

  // Sanitize URLs — only allow http/https
  const safeTo = /^https?:\/\//.test(normalizedExternal) ? normalizedExternal : '';
  const safeReturn = /^https?:\/\//.test(returnUrl) ? returnUrl : '';

  useEffect(() => {
    if (!safeTo) return;

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setRedirecting(true);
          window.location.href = safeTo;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [safeTo]);

  const handleGoNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRedirecting(true);
    window.location.href = safeTo;
  };

  const handleCopyReturn = async () => {
    if (!safeReturn) return;
    try {
      await navigator.clipboard.writeText(safeReturn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = safeReturn;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!safeTo) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Invalid redirect link</h2>
          <p style={styles.errorText}>No valid destination URL was provided.</p>
          {safeReturn && (
            <a href={safeReturn} style={styles.returnBtn}>
              ← Return to Survey
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Top — redirecting indicator */}
        <div style={styles.topBadge}>
          <span style={styles.dot} />
          Redirecting you to an external page
        </div>

        <h1 style={styles.title}>One quick step!</h1>
        <p style={styles.subtitle}>
          You'll be sent to an external page and can <strong>return to continue your survey</strong> anytime within 24 hours.
        </p>

        {/* Countdown */}
        {!redirecting ? (
          <div style={styles.countdownWrapper}>
            <div style={styles.countdownCircle}>
              <span style={styles.countdownNumber}>{countdown}</span>
              <span style={styles.countdownLabel}>sec</span>
            </div>
            <p style={styles.countdownText}>Auto-redirecting in {countdown} second{countdown !== 1 ? 's' : ''}…</p>
            <button onClick={handleGoNow} style={styles.goNowBtn}>
              Go Now →
            </button>
          </div>
        ) : (
          <div style={styles.redirectingState}>
            <div style={styles.spinner} />
            <p style={styles.redirectingText}>Redirecting…</p>
          </div>
        )}

        {/* Return link section */}
        {safeReturn && (
          <div style={styles.returnSection}>
            <div style={styles.returnHeader}>
              <span style={styles.returnIcon}>🔗</span>
              <span style={styles.returnTitle}>Your return link (save this!)</span>
            </div>
            <p style={styles.returnDesc}>
              Use this link to come back and continue your survey from where you left off:
            </p>
            <div style={styles.returnUrlRow}>
              <input
                type="text"
                readOnly
                value={safeReturn}
                style={styles.returnUrlInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button onClick={handleCopyReturn} style={styles.copyBtn}>
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <a href={safeReturn} style={styles.continueSurveyBtn}>
              ← Continue Survey (return later)
            </a>
          </div>
        )}

        {/* Destination preview */}
        <div style={styles.destinationNote}>
          <span style={styles.destinationLabel}>Going to:</span>
          <span style={styles.destinationUrl}>
            {safeTo.length > 60 ? safeTo.slice(0, 60) + '…' : safeTo}
          </span>
        </div>
      </div>
    </div>
  );
};

// Inline styles for zero-dependency standalone page
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '40px 36px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  topBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#fef3c7',
    color: '#92400e',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '20px',
  },
  dot: {
    width: '8px',
    height: '8px',
    background: '#f59e0b',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse 1.5s infinite',
  },
  title: {
    margin: '0 0 10px',
    fontSize: '26px',
    fontWeight: 700,
    color: '#1e293b',
  },
  subtitle: {
    margin: '0 0 28px',
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.6,
  },
  countdownWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
    padding: '24px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  countdownCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  countdownNumber: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1,
  },
  countdownLabel: {
    fontSize: '11px',
    opacity: 0.8,
    letterSpacing: '0.5px',
  },
  countdownText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  goNowBtn: {
    padding: '10px 28px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  redirectingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '28px',
    marginBottom: '28px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  redirectingText: {
    margin: 0,
    color: '#64748b',
    fontSize: '14px',
  },
  returnSection: {
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '2px solid #6ee7b7',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '20px',
  },
  returnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  returnIcon: {
    fontSize: '20px',
  },
  returnTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#065f46',
  },
  returnDesc: {
    margin: '0 0 12px',
    fontSize: '13px',
    color: '#047857',
    lineHeight: 1.5,
  },
  returnUrlRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  returnUrlInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #6ee7b7',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    background: 'white',
    color: '#1e293b',
    outline: 'none',
    cursor: 'text',
  },
  copyBtn: {
    padding: '10px 14px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  continueSurveyBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    background: 'white',
    color: '#065f46',
    border: '2px solid #10b981',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  destinationNote: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    padding: '12px 14px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  destinationLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    paddingTop: '1px',
  },
  destinationUrl: {
    fontSize: '12px',
    color: '#64748b',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  errorIcon: {
    fontSize: '40px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  errorTitle: {
    textAlign: 'center',
    margin: '0 0 8px',
    fontSize: '20px',
    color: '#1e293b',
  },
  errorText: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: '20px',
  },
  returnBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    background: '#6366f1',
    color: 'white',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: 600,
  },
};

export default SurveyRedirectTransition;
