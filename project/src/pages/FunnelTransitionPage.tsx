/**
 * FunnelTransitionPage
 * Shown between a failed job survey and the next job survey in the cascade.
 * URL: /funnel-transition?f=FUNNEL_ID&sn=SESSION_ID&next_job=JOB_ID&next_survey=SURVEY_ID
 *
 * Reads transition config from URL params (passed by funnel submission handler).
 * Shows editable-content message, countdown, then redirects to next job survey.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Briefcase, Sparkles } from 'lucide-react';

const FunnelTransitionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [redirecting, setRedirecting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // URL params — support short names (f, sn) with legacy long names as fallback
  const funnelId = searchParams.get('f') || searchParams.get('funnel') || '';
  const sessionId = searchParams.get('sn') || searchParams.get('session') || '';
  const nextJobId = searchParams.get('next_job') || '';
  const nextSurveyId = searchParams.get('next_survey') || '';
  const queuePosition = parseInt(searchParams.get('pos') || '0');

  // Transition content — passed as URL params so admin can customise per job
  const heading = decodeURIComponent(searchParams.get('heading') || 'We found another great opportunity for you!');
  const message = decodeURIComponent(searchParams.get('msg') || "You didn't qualify for this role, but we have another opportunity that matches your profile.");
  const ctaText = decodeURIComponent(searchParams.get('cta') || 'See Next Opportunity →');
  const nextJobName = decodeURIComponent(searchParams.get('next_name') || '');
  const autoSeconds = parseInt(searchParams.get('auto') || '5');
  const showNextName = searchParams.get('show_name') !== 'false';

  // Determine next survey URL
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const frontendBase = isLocalhost ? 'http://localhost:5173' : 'https://survey.pepperwahl.com';
  const nextSurveyUrl = nextSurveyId
    ? `${frontendBase}/survey/${nextSurveyId}?f=${funnelId}&sn=${sessionId}&job=${nextJobId}&pos=${queuePosition}`
    : '';

  useEffect(() => {
    if (!nextSurveyUrl || autoSeconds <= 0) return;

    setCountdown(autoSeconds);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [nextSurveyUrl]);

  const handleRedirect = () => {
    if (redirecting || !nextSurveyUrl) return;
    setRedirecting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    window.location.href = nextSurveyUrl;
  };

  const progress = autoSeconds > 0 ? ((autoSeconds - countdown) / autoSeconds) * 100 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 text-center shadow-2xl">

          {/* Icon */}
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-400/30">
            <Sparkles size={28} className="text-blue-400" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-white mb-3">
            {heading}
          </h1>

          {/* Message */}
          <p className="text-blue-200 text-sm leading-relaxed mb-6">
            {message}
          </p>

          {/* Next opportunity label */}
          {showNextName && nextJobName && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 mb-6">
              <Briefcase size={14} className="text-blue-300" />
              <span className="text-white text-sm font-medium">{nextJobName}</span>
            </div>
          )}

          {/* Progress bar */}
          {autoSeconds > 0 && !redirecting && (
            <div className="mb-5">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="h-1.5 bg-blue-400 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-blue-300 text-xs">
                Redirecting in {countdown}s...
              </p>
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={handleRedirect}
            disabled={redirecting || !nextSurveyUrl}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition"
          >
            {redirecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                {ctaText}
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Opportunity counter */}
          {queuePosition > 0 && (
            <p className="text-white/40 text-xs mt-4">
              Opportunity {queuePosition + 1} of your matched roles
            </p>
          )}
        </div>

        {/* Powered by */}
        <p className="text-center text-white/20 text-xs mt-4">Powered by Pepperwahl</p>
      </div>
    </div>
  );
};

export default FunnelTransitionPage;
