import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './BasicSurveyTemplate.css';
import type { Survey, ShowIfCondition } from '../types/Survey';
import { getQuestionVariants, getAnswerVariants } from '../utils/animationConfig';
import {
  buildRedirectUrl,
  createSessionContext
} from '../utils/redirectBuilder';
import { getMoustacheleadsPayload } from '../utils/moustacheleads';
import { getVisibleQuestions } from '../utils/skipLogic';
import { requestGPSLocation } from '../hooks/useTracking';
import { getApiBaseUrl } from '../utils/deploymentFix';
import { QuestionImage, wrapOptionLabel } from '../utils/questionImages';
import SurveyVideoPlayer from '../components/SurveyVideoPlayer';
import {
  getDeviceFingerprint,
  markSurveyComplete,
  hasSurveyBeenCompleted,
  clearSurveyComplete,
} from '../utils/deviceFingerprint';

interface Question {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: 'text' | 'radio' | 'range' | 'ranking' | 'dropdown' | 'dropdown_multi' | 'matrix' | 'list';
  options?: string[];
  matrixColumns?: string[];
  answerStyle?: string;
  allowMultiple?: boolean;
  questionDelay?: number;
  show_if?: ShowIfCondition | null;
  questionImage?: string;
  questionImages?: string[];
  questionImagePosition?: 'above' | 'below';
  optionImages?: Record<string, string>;
  optionImageMode?: 'with-text' | 'replace-text';
  rawType?: string;
  numericMin?: number;
  numericMax?: number;
  /** Optional video URL for this question */
  questionVideo?: string;
  /** Display title for the video button */
  questionVideoTitle?: string;
}

interface RawQuestion {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: string;
  options?: string[];
  allowMultiple?: boolean;
  questionDelay?: number;
  show_if?: ShowIfCondition | null;
  questionImage?: string;
  questionImages?: string[];
  questionImagePosition?: 'above' | 'below';
  optionImages?: Record<string, string>;
  optionImageMode?: 'with-text' | 'replace-text';
  questionVideo?: string;
  questionVideoTitle?: string;
}

// Resume session data from mid-survey redirect
interface ResumeData {
  session_id: string;
  resume_index: number;
  answers: Record<string, string | number>;
}

interface Props {
  survey: Survey;
  previewMode?: boolean;
  editMode?: boolean;
  onSurveyChange?: (updatedSurvey: Survey) => void;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const BasicSurveyTemplate: React.FC<Props> = ({
  survey,
  previewMode = false,
  editMode = false,
  onSurveyChange
}) => {
  const location = useLocation();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [clickId, setClickId] = useState<string | null>(null);
  const [affSub, setAffSub] = useState<string | null>(null);
  const [sub1, setSub1] = useState<string | null>(null);
  const [sub2, setSub2] = useState<string | null>(null);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // ── Funnel state ──────────────────────────────────────────────────────────
  const [funnelId, setFunnelId] = useState<string | null>(null);
  const [funnelSessionId, setFunnelSessionId] = useState<string | null>(null);
  const [funnelLayerIndex, setFunnelLayerIndex] = useState<number>(0);
  const [funnelJobId, setFunnelJobId] = useState<string | null>(null);
  const [isFunnelSurvey, setIsFunnelSurvey] = useState(false);
  const [funnelTerminated, setFunnelTerminated] = useState(false);
  const [funnelTerminateReason, setFunnelTerminateReason] = useState('');

  const normalizeType = (type: string): 'text' | 'radio' | 'range' | 'ranking' | 'dropdown' | 'dropdown_multi' | 'matrix' | 'list' => {
    switch (type) {
      case 'multiple_choice':
      case 'yes_no':
        return 'radio';
      case 'multi_select':
        return 'radio';  // handled by allowMultiple
      case 'likert':
        return 'radio';  // rendered as special radio
      case 'ranking':
        return 'ranking';
      case 'dropdown':
        return 'dropdown';
      case 'dropdown_multi':
        return 'dropdown_multi';
      case 'matrix':
        return 'matrix';
      case 'list':
        return 'list';
      case 'short_answer':
        return 'text';
      case 'numeric':
        return 'text';
      case 'rating':
      case 'opinion_scale':
      case 'scale':
        return 'range';
      default:
        return 'text';
    }
  };

  const normalizedQuestions: Question[] = (survey.questions || []).map((q: RawQuestion, index) => ({
    id: q.id || `q${index}`,
    // Strip any URLs that may have accidentally been appended to the question text
    question: (q.question || '').replace(/https?:\/\/[^\s]+/g, '').replace(/\s{2,}/g, ' ').trim(),
    questionDescription: q.questionDescription,
    answerDescription: q.answerDescription,
    type: normalizeType(q.type),
    options: (() => {
      // Always ensure yes_no questions have options
      if ((q.type === 'yes_no') && (!q.options || q.options.length === 0)) {
        return ['Yes', 'No'];
      }
      return q.options || [];
    })(),
    answerStyle: (q as any).answerStyle || undefined,
    allowMultiple: q.allowMultiple || false,
    questionDelay: q.questionDelay || 0,
    show_if: q.show_if || null,
    questionImage: q.questionImage,
    questionImages: (q as any).questionImages,
    questionImagePosition: q.questionImagePosition,
    optionImages: q.optionImages,
    optionImageMode: q.optionImageMode,
    rawType: (q as any).rawType || q.type,
    numericMin: (q as any).numericMin,
    numericMax: (q as any).numericMax,
    matrixColumns: (q as any).matrixColumns || [],
    questionVideo: (q as any).questionVideo,
    questionVideoTitle: (q as any).questionVideoTitle,
  }));

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const initialData: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => {
      // Don't initialize range questions with 0, leave them empty until user selects
      initialData[q.id] = '';
    });
    return initialData;
  });

  // Compute visible questions based on current answers (skip logic)
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(normalizedQuestions, formData),
    [normalizedQuestions, formData]
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(0);
  // Chain survey state — shown mid-survey or post-completion
  const [chainSurveyPrompt, setChainSurveyPrompt] = useState<{
    url: string;
    mode: 'ask' | 'inline' | 'direct';
    message: string;
    yesLabel: string;
    noLabel: string;
  } | null>(null);
  // Layer queue state
  const [layerQueue, setLayerQueue] = useState<Array<{
    type: 'result_page' | 'spinner' | 'chain_survey' | 'end_survey';
    variant?: 'pass' | 'fail';
    title?: string;
    subtitle?: string;
    cta_text?: string;
    duration?: number;
    text?: string;
    survey_url?: string;
    chain_mode?: 'direct' | 'ask';
    chain_message?: string;
    chain_yes_label?: string;
    chain_no_label?: string;
  }>>([]);
  const [activeLayer, setActiveLayer] = useState<typeof layerQueue[0] | null>(null);
  const layerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to the current queue so the Continue button doesn't use stale closure
  const layerQueueRef = React.useRef<typeof layerQueue>([]);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  // Admin resubmit policy state
  const [resubmitBlocked, setResubmitBlocked] = useState(false);
  const [resubmitReason, setResubmitReason] = useState<'block_forever' | 'cooldown_active' | ''>('');
  const [resubmitCooldownEnds, setResubmitCooldownEnds] = useState<Date | null>(null);

  // Per-question timing tracking
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Clamp question index if visible questions change due to skip logic
  useEffect(() => {
    if (currentQuestionIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentQuestionIndex]);

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://surevy-pepperwahl.onrender.com';

  // ── Back button admin control ────────────────────────────────────────────────
  // Fetch once from the public platform-config endpoint
  const [backButtonEnabled, setBackButtonEnabled] = useState<boolean>(true);
  // When Back is disabled and user hits browser-back, show email capture UI
  const [showBackBlocker, setShowBackBlocker] = useState(false);
  const [blockerEmail, setBlockerEmail] = useState('');
  const [blockerSubmitting, setBlockerSubmitting] = useState(false);
  const [blockerSubmitted, setBlockerSubmitted] = useState(false);

  useEffect(() => {
    // Don't fetch in preview mode — show real behavior in live survey
    if (previewMode) return;
    const surveyId = (survey as any).short_id || survey.id;
    if (!surveyId) return;
    // Use the per-survey resolved endpoint (survey → user → global precedence)
    fetch(`${apiBaseUrl}/api/admin/back-button-config/${surveyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data.back_button_enabled === 'boolean') {
          setBackButtonEnabled(data.back_button_enabled);
        }
      })
      .catch(() => { /* keep default (enabled) on failure */ });
  }, [apiBaseUrl, previewMode, survey]);

  // Intercept browser back button when back is disabled
  useEffect(() => {
    if (previewMode || backButtonEnabled) return;
    // Push a dummy state so we detect the browser-back event
    window.history.pushState({ surveyGuard: true }, '');
    const handlePopState = (e: PopStateEvent) => {
      // Re-push so pressing back again shows the blocker again
      window.history.pushState({ surveyGuard: true }, '');
      setShowBackBlocker(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [backButtonEnabled, previewMode]);

  // Check for resume token on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resumeToken = params.get('resume');
    
    if (resumeToken && survey.id && !previewMode) {
      setIsResuming(true);
      // Attempt to resume session
      fetch(`${apiBaseUrl}/api/surveys/${survey.id}/resume?token=${encodeURIComponent(resumeToken)}`)
        .then(res => res.json())
        .then((data: ResumeData & { error?: string }) => {
          if (data.error) {
            console.error('Resume error:', data.error);
            setIsResuming(false);
            return;
          }
          
          // Restore session state
          setResumeSessionId(data.session_id);
          setFormData(prev => ({ ...prev, ...data.answers }));
          setCurrentQuestionIndex(Math.min(data.resume_index, visibleQuestions.length - 1));
          console.log(`?? Resumed survey from question ${data.resume_index + 1}`);
          setIsResuming(false);
        })
        .catch(err => {
          console.error('Resume fetch error:', err);
          setIsResuming(false);
        });
    }
  }, [location.search, survey.id, previewMode, apiBaseUrl]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUsername(params.get('username'));
    setEmail(params.get('email'));
    setAffSub(params.get('aff_sub'));
    setSub1(params.get('sub1'));
    setSub2(params.get('sub2'));

    // Funnel params — support both short names (f, ly, sn) and legacy long names for backward compat
    const fid = params.get('f') || params.get('funnel');
    const fsid = params.get('sn') || params.get('session');
    const flayer = parseInt(params.get('ly') || params.get('layer') || '0');
    const fjob = params.get('job');
    if (fid) {
      setFunnelId(fid);
      setIsFunnelSurvey(true);
      setFunnelLayerIndex(flayer);
      if (fsid && fsid !== 'new') setFunnelSessionId(fsid);
      if (fjob) setFunnelJobId(fjob);
    }

    let extractedClickId = params.get('click_id');
    if (!extractedClickId) {
      extractedClickId = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    setClickId(extractedClickId);

    if (params.get('username') && params.get('email') && survey.id) {
      fetch(`${apiBaseUrl}/survey/${survey.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: params.get('username'), email: params.get('email') }),
      })
        .then(res => res.json())
        .then(data => data.tracking_id && setTrackingId(data.tracking_id))
        .catch(err => console.error('Tracking error:', err));
    }

    if (survey.id && !previewMode) {
      setTimeout(() => {
        trackClickInteraction('survey_loaded', {
          survey_title: survey.title,
          total_questions: visibleQuestions.length
        });
      }, 1000);
    }
  }, [location.search, survey.id]);

  // Request GPS location only when global setting AND survey-level flag are both enabled
  useEffect(() => {
    if (previewMode) return; // Never ask for location in preview/edit mode

    const checkAndRequestLocation = async () => {
      // First check survey-level flag (fast path — no network call if off)
      if (!survey.collect_location) return;

      // Then verify admin's global master switch
      try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const cfgBase = isLocalhost ? 'http://localhost:5000' : 'https://surevy-pepperwahl.onrender.com';
        const res = await fetch(`${cfgBase}/api/admin/location/public-config`);
        if (!res.ok) return;
        const cfg = await res.json();

        // Fire only when global is ON, AND either all_surveys flag or per-survey flag is set
        if (cfg.global_location_enabled && (cfg.all_surveys_location_enabled || survey.collect_location === true)) {
          requestGPSLocation();
        }
      } catch {
        // non-critical — degrade gracefully
      }
    };

    checkAndRequestLocation();
  }, [survey.id, survey.collect_location, previewMode]);

  // -- Duplicate detection: localStorage check + fingerprint collection --------
  useEffect(() => {
    if (previewMode || !survey.id) return;

    // Soft localStorage check — may be overridden by server policy below
    const lsDone = hasSurveyBeenCompleted(survey.id);
    if (lsDone) {
      setAlreadyCompleted(true);
    }

    // Collect device fingerprint then run server-side resubmit policy check.
    // The server is the source of truth — if it says "allowed", clear localStorage
    // so the user can actually fill the survey (e.g. cooldown has passed).
    getDeviceFingerprint().then(async (fp) => {
      setDeviceFingerprint(fp);

      const surveyId = (survey as any).short_id || survey.id;
      if (!surveyId) return;
      try {
        const params = new URLSearchParams(location.search);
        const emailParam = params.get('email') || '';
        const res = await fetch(`${apiBaseUrl}/api/admin/resubmit/check/${surveyId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprint_hash: fp, email: emailParam || undefined }),
        });
        if (res.ok) {
          const data = await res.json();

          if (data.allowed) {
            // Server says this user can fill — clear any stale localStorage block
            // This handles: cooldown passed, admin unlocked, no policy set
            if (lsDone) {
              clearSurveyComplete(survey.id);
              setAlreadyCompleted(false);
            }
            setResubmitBlocked(false);
          } else {
            // Server is blocking — show the correct screen
            setResubmitBlocked(true);
            setResubmitReason(data.reason === 'block_forever' ? 'block_forever' : 'cooldown_active');
            if (data.cooldown_ends_at) {
              setResubmitCooldownEnds(new Date(data.cooldown_ends_at));
            }
            // If there's NO admin policy at all (no_policy / allow), fall back to
            // the localStorage-only check — don't override it with a false allow
          }
        }
        // On fetch failure: keep whatever localStorage said (fail closed for LS, fail open for policy)
      } catch {
        // Non-critical — keep existing state
      }
    });
  }, [survey.id, previewMode]);
  // -----------------------------------------------------------------------------

  const trackClickInteraction = async (action: string, data?: Record<string, unknown>) => {
    if (!survey.id) return;
    try {
      const params = new URLSearchParams(location.search);
      await fetch(`${apiBaseUrl}/api/track-click/${survey.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          data,
          username: username || params.get('username'),
          email: email || params.get('email'),
          click_id: clickId,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url_params: Object.fromEntries(params.entries())
        }),
      });
    } catch (error) {
      console.error('Click tracking error:', error);
    }
  };

  // Mid-survey redirect handler
  // Saves progress, generates resume token, then redirects to the external URL.
  // open_in_new_tab = true (default) opens in new tab so survey stays open.
  const handleMidSurveyRedirect = useCallback(async (redirectUrl: string, redirectNodeId: string, answer?: string, openInNewTab: boolean = true) => {
    if (!survey.id) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/surveys/${survey.id}/redirect/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: resumeSessionId || undefined,
          answers: formData,
          current_question_index: currentQuestionIndex,
          redirect_url: redirectUrl,
          redirect_node_id: redirectNodeId,
          expiry_hours: (survey.questions || []).find((q: any) => q.id === redirectNodeId.replace('question_', ''))?.redirect_config?.resume_expiry_hours ?? 24,
          extra: {
            click_id: clickId || '',
            answer: answer || '',
            survey_id: survey.id
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to prepare redirect');
      
      const data = await response.json();
      
      trackClickInteraction('mid_survey_redirect', {
        redirect_url: redirectUrl,
        current_question: currentQuestionIndex + 1,
        session_id: data.session_id,
        open_in_new_tab: openInNewTab,
      });

      // Open in new tab (default) so the survey stays open in the current tab.
      // open_in_new_tab=false navigates the current tab away.
      if (openInNewTab) {
        window.open(data.final_redirect_url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = data.final_redirect_url;
      }
      
    } catch (error) {
      console.error('Mid-survey redirect error:', error);
      // Fallback
      if (openInNewTab) window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      else window.location.href = redirectUrl;
    }
  }, [survey.id, apiBaseUrl, formData, currentQuestionIndex, resumeSessionId, clickId, trackClickInteraction]);

  const handleAnswer = (id: string, value: string | number, isMultiple?: boolean) => {
    if (isMultiple) {
      // Toggle the option in a comma-separated string
      setFormData(prev => {
        const current = prev[id] ? String(prev[id]).split(',') : [];
        const strVal = String(value);
        const next = current.includes(strVal)
          ? current.filter(v => v !== strVal)
          : [...current, strVal];
        return { ...prev, [id]: next.join(',') };
      });
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    trackClickInteraction('answer_selected', { questionId: id, answer: value });
  };

  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const isCurrentAnswered = currentQuestion
    ? currentQuestion.type === 'range'
      ? formData[currentQuestion.id] !== undefined && formData[currentQuestion.id] !== ''
      : currentQuestion.type === 'matrix'
        ? (() => {
            const rows = (currentQuestion.options || []) as string[];
            if (rows.length === 0) return true;
            try {
              const ans = JSON.parse(String(formData[currentQuestion.id] || '{}')) as Record<string, string>;
              return rows.every((r: string) => !!ans[r]);
            } catch { return false; }
          })()
        : currentQuestion.allowMultiple
          ? !!(formData[currentQuestion.id] && String(formData[currentQuestion.id]).length > 0)
          : currentQuestion.type === 'ranking'
            ? String(formData[currentQuestion.id] || '').includes('|||')
            : formData[currentQuestion.id] !== '' && formData[currentQuestion.id] !== 0 && formData[currentQuestion.id] !== undefined
    : false;

  // Check if current question has a redirect configured
  const checkQuestionRedirect = useCallback(async (questionId: string, answer: string | number) => {
    // Get the original question data from survey (not normalized)
    const originalQuestion = (survey.questions || []).find((q: any) => q.id === questionId);
    if (!originalQuestion) return false;

    // ── Multi-redirect support (redirect_configs array) ──────────────────
    // When a question has condition-based redirects (e.g. Yes→url1, No→url2),
    // they are stored as redirect_configs array. Check each in order.
    const multiConfigs: any[] = (originalQuestion as any).redirect_configs || [];
    if (multiConfigs.length > 1) {
      // Find the first config whose condition matches the answer
      const answerStr = String(answer).toLowerCase();
      const matched = multiConfigs.find((cfg: any) => {
        if (!cfg?.enabled || !cfg?.url) return false;
        const cond = String(cfg.condition || 'always').toLowerCase();
        return cond === 'always' || cond === answerStr;
      });
      if (matched) {
        let finalUrl = matched.url
          .replace('{click_id}', clickId || '')
          .replace('{session_id}', resumeSessionId || `session_${Date.now()}`)
          .replace('{answer}', encodeURIComponent(String(answer)))
          .replace('{survey_id}', survey.id || '');
        const openInNewTab = matched.open_in_new_tab !== false; // default true
        if (matched.allow_resume !== false) {
          await handleMidSurveyRedirect(finalUrl, `question_${questionId}`, String(answer), openInNewTab);
        } else {
          trackClickInteraction('question_redirect', { question_id: questionId, redirect_url: finalUrl, answer });
          if (openInNewTab) window.open(finalUrl, '_blank', 'noopener,noreferrer');
          else window.location.href = finalUrl;
        }
        return true;
      }
      // No condition matched — no redirect
      return false;
    }

    // ── Single redirect (legacy redirect_config) ──────────────────────────
    if (!originalQuestion?.redirect_config?.enabled) return false;
    
    const redirectConfig = originalQuestion.redirect_config;
    const redirectUrl = redirectConfig.url;
    
    // Check if redirect condition matches
    const condition = redirectConfig.condition || 'always';
    if (condition !== 'always') {
      const answerStr = String(answer).toLowerCase();
      const conditionStr = String(condition).toLowerCase();
      if (answerStr !== conditionStr) {
        return false; // Condition not met, don't redirect
      }
    }
    
    if (!redirectUrl) return false;
    
    // Build final redirect URL with placeholders replaced
    let finalUrl = redirectUrl
      .replace('{click_id}', clickId || '')
      .replace('{session_id}', resumeSessionId || `session_${Date.now()}`)
      .replace('{answer}', encodeURIComponent(String(answer)))
      .replace('{survey_id}', survey.id || '');
    
    // If resume is allowed, use the mid-survey redirect handler
    const openInNewTab = (redirectConfig as any).open_in_new_tab !== false; // default true
    if (redirectConfig.allow_resume !== false) {
      await handleMidSurveyRedirect(finalUrl, `question_${questionId}`, String(answer), openInNewTab);
    } else {
      trackClickInteraction('question_redirect', {
        question_id: questionId,
        redirect_url: finalUrl,
        answer: answer
      });
      if (openInNewTab) window.open(finalUrl, '_blank', 'noopener,noreferrer');
      else window.location.href = finalUrl;
    }
    
    return true; // Redirect triggered
  }, [survey.questions, clickId, resumeSessionId, survey.id, handleMidSurveyRedirect, trackClickInteraction]);

  // ── Check if current question has a chain-survey configured ────────────────
  const checkChainSurvey = useCallback((questionId: string, answer: string | number): boolean => {
    const originalQuestion = (survey.questions || []).find((q: any) => q.id === questionId);
    const ns = (originalQuestion as any)?.next_survey;
    if (!ns?.enabled) return false;

    const answerStr = String(answer).toLowerCase();
    let matchedUrl = '';
    let matchedMode: 'ask' | 'inline' | 'direct' = (ns.mode as 'ask' | 'inline' | 'direct') || 'ask';

    const configs: Array<{ condition: string; url: string; mode: string }> = ns.configs || [];
    if (configs.length > 0) {
      // Try to find a per-answer match first
      const found = configs.find(c => c.condition?.toLowerCase() === answerStr);
      if (found && found.url) {
        matchedUrl = found.url;
        // Always use top-level mode — per-answer entries don't track mode individually
        matchedMode = (ns.mode as 'ask' | 'inline' | 'direct') || 'ask';
      } else if (ns.url && (ns.condition === 'always' || !ns.condition)) {
        // Fall back to "always" global URL
        matchedUrl = ns.url;
      } else {
        return false;
      }
    } else {
      // No per-answer configs — use global url/condition
      if (ns.condition !== 'always' && ns.condition && ns.condition.toLowerCase() !== answerStr) return false;
      matchedUrl = ns.url || '';
    }

    if (!matchedUrl) return false;

    if (matchedMode === 'direct') {
      // Direct: silently navigate, no prompt
      window.location.href = matchedUrl;
      return true;
    }

    // ask / inline — show the prompt card
    setChainSurveyPrompt({
      url: matchedUrl,
      mode: matchedMode,
      message: ns.message || 'Another survey is waiting for you!',
      yesLabel: ns.yes_label || 'Continue',
      noLabel: ns.no_label || 'No thanks',
    });
    return true;
  }, [survey.questions]);

  // ── Check if current question has a pass/fail page configured ─────────────
  // Use a ref so processNextLayer never has stale closure over itself
  const processNextLayerRef = React.useRef<(queue: typeof layerQueue) => void>(() => {});

  const processNextLayer = useCallback((queue: typeof layerQueue) => {
    processNextLayerRef.current(queue);
  }, []);

  // Define the actual implementation — updated whenever state setters change
  // (state setters are stable, so this effect runs once)
  useEffect(() => {
    processNextLayerRef.current = (queue: typeof layerQueue) => {
      if (queue.length === 0) {
        setActiveLayer(null);
        layerQueueRef.current = [];
        setLayerQueue([]);
        return;
      }
      const [next, ...rest] = queue;
      layerQueueRef.current = rest;

      // end_survey layer — terminate immediately
      if (next.type === 'end_survey') {
        setActiveLayer(null);
        setLayerQueue([]);
        layerQueueRef.current = [];
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
        return;
      }

      // chain_survey layer — direct redirect or show prompt
      if (next.type === 'chain_survey') {
        setActiveLayer(null);
        setLayerQueue(rest);
        layerQueueRef.current = rest;
        const url = next.survey_url || '';
        if (!url) {
          processNextLayerRef.current(rest);
          return;
        }
        if (next.chain_mode === 'direct') {
          window.location.href = url;
          return;
        }
        setChainSurveyPrompt({
          url,
          mode: 'ask',
          message: next.chain_message || 'Another survey is waiting for you!',
          yesLabel: next.chain_yes_label || 'Continue',
          noLabel: next.chain_no_label || 'No thanks',
        });
        return;
      }

      // result_page or spinner — show it
      setActiveLayer(next);
      setLayerQueue(rest);
      layerQueueRef.current = rest;

      if (next.type === 'spinner') {
        const duration = (next.duration ?? 3) * 1000;
        // Clear any existing timer before setting a new one
        if (layerTimerRef.current) clearTimeout(layerTimerRef.current);
        layerTimerRef.current = setTimeout(() => {
          layerTimerRef.current = null;
          setActiveLayer(null);
          processNextLayerRef.current(rest);
        }, duration);
      }
    };
  }); // No deps — runs every render to always stay fresh

  const checkLayers = useCallback((questionId: string, answer: string | number): boolean => {
    const originalQuestion = (survey.questions || []).find((q: any) => q.id === questionId);
    const layers: any[] = (originalQuestion as any)?.layers || [];
    if (layers.length === 0) return false;

    const answerStr = String(answer).toLowerCase();

    // Only the FIRST layer checks the answer condition.
    // All subsequent layers run automatically in sequence regardless of answer.
    const firstLayer = layers[0];
    const firstCond = (firstLayer?.condition || 'always').toLowerCase();
    const firstMatches = firstCond === 'always' || firstCond === answerStr;

    if (!firstMatches) return false;

    // All layers run — but strip condition from layers 2+ so runtime never re-checks
    const matchedLayers = layers.map((layer, i) =>
      i === 0 ? layer : { ...layer, condition: 'always' }
    );

    // Sync the ref before processing so it's always fresh
    layerQueueRef.current = matchedLayers;
    setLayerQueue(matchedLayers);
    processNextLayer(matchedLayers);
    return true;
  }, [survey.questions, processNextLayer]);

  // Cleanup layer timer on unmount
  useEffect(() => {
    return () => {
      if (layerTimerRef.current) clearTimeout(layerTimerRef.current);
    };
  }, []);

  const handleNext = useCallback(async () => {
    if (!isCurrentAnswered) return;

    const currentQ = visibleQuestions[currentQuestionIndex];
    if (currentQ) {
      // Record time spent on current question
      const timeSpent = (Date.now() - questionStartTime) / 1000;
      setQuestionTimings(prev => ({ ...prev, [currentQ.id]: timeSpent }));

      const answer = formData[currentQ.id];

      // Check redirect first
      const shouldRedirect = await checkQuestionRedirect(currentQ.id, answer);
      if (shouldRedirect) return;

      // Check chain survey (mid-survey)
      const shouldChain = checkChainSurvey(currentQ.id, answer);
      if (shouldChain) return;

      // Check layer queue (result pages, spinners)
      const shouldShowLayer = checkLayers(currentQ.id, answer);
      if (shouldShowLayer) return;

      // Check end_here
      const originalQ = (survey.questions || []).find((q: any) => q.id === currentQ.id);
      if (originalQ?.end_here?.enabled) {
        const endCondition = originalQ.end_here.condition || 'always';
        const shouldEnd = endCondition === 'always' ||
          String(answer).toLowerCase() === String(endCondition).toLowerCase();
        if (shouldEnd) {
          // Trigger the form submit directly � ends the survey now
          if (formRef.current) {
            formRef.current.requestSubmit();
          }
          return;
        }
      }
    }

    // Normal navigation
    if (currentQuestionIndex < visibleQuestions.length - 1) {
      const nextQ = visibleQuestions[currentQuestionIndex + 1];
      const delay = (nextQ as any)?.questionDelay || 0;

      trackClickInteraction('question_navigation', {
        action: 'next',
        from_question: currentQuestionIndex + 1,
        to_question: currentQuestionIndex + 2
      });

      if (delay > 0) {
        // Lock navigation immediately so user can't double-click
        setIsTransitioning(true);
        setTransitionCountdown(Math.ceil(delay / 1000));

        // Tick the countdown every second
        let remaining = Math.ceil(delay / 1000);
        const ticker = setInterval(() => {
          remaining -= 1;
          setTransitionCountdown(remaining);
          if (remaining <= 0) clearInterval(ticker);
        }, 1000);

        setTimeout(() => {
          clearInterval(ticker);
          setIsTransitioning(false);
          setTransitionCountdown(0);
          setQuestionStartTime(Date.now());
          setCurrentQuestionIndex(prev => prev + 1);
        }, delay);
      } else {
        setQuestionStartTime(Date.now());
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  }, [currentQuestionIndex, visibleQuestions, isCurrentAnswered, questionStartTime, formData, checkQuestionRedirect, checkChainSurvey, checkLayers, processNextLayer, trackClickInteraction, survey.questions]);

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      // Record time spent on current question before going back
      const currentQ = visibleQuestions[currentQuestionIndex];
      if (currentQ) {
        const timeSpent = (Date.now() - questionStartTime) / 1000;
        setQuestionTimings(prev => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || 0) + timeSpent
        }));
      }
      setQuestionStartTime(Date.now());
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (previewMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isCurrentAnswered) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, isCurrentAnswered, previewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate questions up to and including the current visible question
    // (end_here may have stopped us before all questions were answered)
    const questionsToValidate = visibleQuestions.slice(0, currentQuestionIndex + 1);
    const unanswered = questionsToValidate.find(q => {
      const val = formData[q.id];
      if (q.type === 'range') {
        return val === undefined || val === '';
      }
      return val === '' || val === undefined;
    });
    if (unanswered) return;

    // Record timing for the last question
    const lastQ = visibleQuestions[currentQuestionIndex];
    const finalTimings = { ...questionTimings };
    if (lastQ) {
      const timeSpent = (Date.now() - questionStartTime) / 1000;
      finalTimings[lastQ.id] = timeSpent;
    }

    setIsSubmitting(true);

    try {
      // Only submit answers for visible questions
      const responses: Record<string, string | number> = {};
      visibleQuestions.forEach(q => {
        const val = formData[q.id];
        if (val !== undefined && val !== '') {
          if (q.type === 'range') {
            responses[q.id] = val;
          } else {
            if (val !== 0) {
              // If "Other" was selected and they typed custom text, submit that text instead
              const otherKey = `${q.id}__other_text`;
              const otherText = formData[otherKey] as string;
              const isOtherSelected = String(val).toLowerCase().startsWith('other');
              if (isOtherSelected && otherText && otherText.trim()) {
                responses[q.id] = `Other: ${otherText.trim()}`;
              } else {
                responses[q.id] = val;
              }
            }
          }
        }
      });

      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/submit-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          question_timings: finalTimings,
          email: email,
          username,
          tracking_id: trackingId,
          click_id: clickId,
          aff_sub: affSub,
          sub1: sub1,
          sub2: sub2,
          device_fingerprint: deviceFingerprint || undefined,
          ...getMoustacheleadsPayload()
        }),
      });

      console.log('?? Survey submission data:', {
        responses,
        email: email,
        username,
        tracking_id: trackingId,
        click_id: clickId
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();

      // ── FUNNEL ROUTING (if this is a funnel survey) ─────────────────────
      // For funnel surveys we ALWAYS use funnel routing — never the normal redirect.
      if (isFunnelSurvey && funnelId) {
        const newSessionId = funnelSessionId || result.session_id || `fs_${Date.now()}`;

        const isJobSurvey = !!funnelJobId;
        const funnelEndpoint = isJobSurvey
          ? `${apiBaseUrl}/api/funnels/${funnelId}/submit-job`
          : `${apiBaseUrl}/api/funnels/${funnelId}/submit-screening`;

        const funnelPayload = isJobSurvey
          ? { job_id: funnelJobId, answers: responses, funnel_session_id: newSessionId }
          : { survey_id: survey.id, layer_index: funnelLayerIndex, answers: responses, funnel_session_id: newSessionId, email, username, click_id: clickId };

        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const frontendBase = isLocalHost ? 'http://localhost:5173' : 'https://survey.pepperwahl.com';

        // Show redirecting spinner immediately so user sees something
        setRedirecting(true);
        console.log(`🎯 [Funnel] Calling ${funnelEndpoint}`, { isJobSurvey, funnelId, funnelLayerIndex, funnelSessionId: newSessionId, survey_id: survey.id });

        try {
          const funnelRes = await fetch(funnelEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(funnelPayload)
          });

          if (!funnelRes.ok) {
            const errText = await funnelRes.text();
            console.error('Funnel API error:', funnelRes.status, errText);
            // Show error to user instead of silent success page
            setRedirecting(false);
            setIsSubmitting(false);
            alert(`Funnel routing error (${funnelRes.status}): ${errText.slice(0, 200)}. Please try submitting again.`);
            return;
          }

          const funnelResult = await funnelRes.json();
          console.log('🎯 [Funnel] Full result:', JSON.stringify(funnelResult).slice(0, 500));
          const sessionIdToUse = funnelResult.funnel_session_id || newSessionId;
          const action = funnelResult.action;

          console.log(`🎯 [Funnel] Action: ${action}`, funnelResult);

          if (action === 'terminate') {
            const fallback = funnelResult.redirect_url;
            if (fallback) {
              setTimeout(() => { window.location.href = fallback; }, 2000);
            } else {
              setRedirecting(false);
              setFunnelTerminated(true);
              setFunnelTerminateReason(funnelResult.reason || 'Unfortunately, you do not meet the eligibility criteria for this opportunity at this time.');
              setSubmitted(true);
            }
            return;
          }

          if (action === 'no_match' || action === 'all_failed') {
            const fallback = funnelResult.redirect_url;
            if (fallback) {
              setTimeout(() => { window.location.href = fallback; }, 2000);
            } else {
              setRedirecting(false);
              setSubmitted(true);
            }
            return;
          }

          if (action === 'next_screening') {
            const nextUrl = `${frontendBase}/survey/${funnelResult.next_survey_id}?f=${funnelId}&ly=${funnelResult.next_layer}&sn=${sessionIdToUse}`;
            setTimeout(() => { window.location.href = nextUrl; }, 1000);
            return;
          }

          if (action === 'go_to_job') {
            const nextUrl = `${frontendBase}/survey/${funnelResult.job_survey_id}?f=${funnelId}&sn=${sessionIdToUse}&job=${funnelResult.job_id}&pos=0`;
            setTimeout(() => { window.location.href = nextUrl; }, 1000);
            return;
          }

          if (action === 'pass') {
            const dest = funnelResult.redirect_url;
            if (dest) {
              setTimeout(() => { window.location.href = dest; }, 2000);
            } else {
              setRedirecting(false);
              setSubmitted(true);
            }
            return;
          }

          if (action === 'next_job') {
            const tp = funnelResult.transition_page || {};
            const transitionUrl = `${frontendBase}/funnel-transition?` + new URLSearchParams({
              f: funnelId,
              sn: sessionIdToUse,
              next_job: funnelResult.next_job_id || '',
              next_survey: funnelResult.next_job_survey_id || '',
              pos: String(funnelResult.queue_position || 0),
              heading: tp.heading || 'We found another great opportunity for you!',
              msg: tp.message || "You didn't qualify for this role, but we have another opportunity.",
              cta: tp.cta_text || 'See Next Opportunity →',
              next_name: tp.next_job_display_name || '',
              auto: String(tp.auto_redirect_seconds ?? 5),
              show_name: tp.show_next_job_name ? 'true' : 'false'
            }).toString();
            setTimeout(() => { window.location.href = transitionUrl; }, 1000);
            return;
          }

          // Unknown action — show submitted rather than bouncing to dashboard
          console.warn('[Funnel] Unknown action:', action);
          setRedirecting(false);
          setSubmitted(true);
          return;

        } catch (funnelErr) {
          console.error('Funnel routing error:', funnelErr);
          setRedirecting(false);
          setIsSubmitting(false);
          alert(`Funnel network error: ${String(funnelErr).slice(0, 150)}. Please try submitting again.`);
          return;
        }
      }
      // ── END FUNNEL ROUTING ───────────────────────────────────────────────

      const redirect = result?.redirect || {};
      const evaluation = result?.evaluation || {};

      console.log('?? Evaluation result:', evaluation);

      if (redirect?.should_redirect && redirect?.redirect_url) {
        let finalRedirectUrl: string;
        if (redirect.redirect_type === 'moustacheleads') {
          finalRedirectUrl = redirect.redirect_url;
        } else {
          const sessionContext = createSessionContext(
            result.session_id || `sess_${Date.now()}`,
            survey.id,
            clickId || username || undefined
          );
          finalRedirectUrl = buildRedirectUrl(
            redirect.redirect_url,
            sessionContext
          );
        }

        // Show spinner for 7 seconds then redirect
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = finalRedirectUrl;
        }, 7000);
        return;
      }

      setSubmitted(true);
      // Mark as complete in localStorage so the browser remembers on next visit
      if (survey.id) {
        markSurveyComplete(survey.id);
      }

      // Check post-completion chain survey
      const surveyNs = (survey as any).next_survey;
      if (surveyNs?.enabled && surveyNs?.url) {
        if (surveyNs.mode === 'direct') {
          setTimeout(() => { window.location.href = surveyNs.url; }, 2000);
        } else {
          setTimeout(() => {
            setChainSurveyPrompt({
              url: surveyNs.url,
              mode: surveyNs.mode || 'ask',
              message: surveyNs.message || 'Thank you! Another survey is waiting for you.',
              yesLabel: surveyNs.yes_label || 'Continue',
              noLabel: surveyNs.no_label || 'No thanks',
            });
          }, 2500); // small delay so the success animation runs first
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message || 'Submission failed'}`);
      } else {
        alert('Submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -- Render Helpers -- */

  const qVariants = getQuestionVariants(survey.animation);

  const answerStyle = (survey as any).answerStyle || 'classic';

  const getStyleForQuestion = (question: Question) => question.answerStyle || answerStyle;

  const renderRadioOptions = (question: Question) => {
    const isMultiple = question.allowMultiple;
    const selectedValues = isMultiple && formData[question.id]
      ? String(formData[question.id]).split(',').filter(Boolean)
      : [];

    // Detect "Other" option — any option whose text starts with "Other"
    const options = question.options || [];
    const otherIdx = options.findIndex(o => /^other/i.test(o.trim()));
    const hasOther = otherIdx !== -1;
    const otherKey = `${question.id}__other_text`;

    return (
      <div className={`pepper-options pepper-style-${getStyleForQuestion(question)} ${isMultiple ? 'pepper-options--multi' : ''}`}>
        {options.map((option, i) => {
          const aVariants = getAnswerVariants(survey.animation, i);
          const optImg = question.optionImages?.[option];
          const replaceText = question.optionImageMode === 'replace-text';
          const isSelected = isMultiple
            ? selectedValues.includes(option)
            : formData[question.id] === option;

          return (
            <motion.div key={i} variants={aVariants} initial="initial" animate="animate">
              <div
                className={`pepper-option ${isSelected ? 'selected' : ''} ${isMultiple ? 'pepper-option--checkbox' : ''} ${optImg && replaceText ? 'pepper-option--image-only' : ''}`}
                onClick={() => handleAnswer(question.id, option, isMultiple)}
              >
                {isMultiple ? (
                  <span className={`pepper-checkbox ${isSelected ? 'pepper-checkbox--checked' : ''}`}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                ) : (
                  <span className="pepper-option-key">{OPTION_KEYS[i] || i + 1}</span>
                )}
                {optImg && replaceText ? (
                  <img src={optImg} alt={option} className="pepper-option-image-replace" />
                ) : optImg ? (
                  <span className="pepper-option-label pepper-option-label--img">
                    <img src={optImg} alt="" className="pepper-option-image-inline" />
                    <span>{option.replace(/^[A-Z][\:\)\.\-]\s*/i, '')}</span>
                  </span>
                ) : (
                  <span className="pepper-option-label">{option.replace(/^[A-Z][\:\)\.\-]\s*/i, '')}</span>
                )}
              </div>
              {/* "Other" text input — appears inline when Other is selected */}
              {hasOther && i === otherIdx && isSelected && (
                <input
                  type="text"
                  className="pepper-other-input"
                  placeholder="Please specify..."
                  value={(formData[otherKey] as string) || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [otherKey]: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              )}
            </motion.div>
          );
        })}
        {isMultiple && (
          <p className="pepper-multi-hint">Select all that apply</p>
        )}
      </div>
    );
  };

  const renderTextInput = (question: Question) => {
    const style = getStyleForQuestion(question);
    const aVariants = getAnswerVariants(survey.animation, 0);
    return (
      <motion.div variants={aVariants} initial="initial" animate="animate">
        <textarea
          value={formData[question.id] as string || ''}
          onChange={(e) => {
            handleAnswer(question.id, e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onFocus={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder="Type your answer here..."
          className={`pepper-textarea pepper-textarea-${style}`}
          rows={1}
        />
      </motion.div>
    );
  };

  const renderScale = (question: Question) => {
    const scaleMax = 10;
    return (
      <div className="pepper-scale">
        <div className="pepper-scale-labels">
          <span>Low</span>
          <span>High</span>
        </div>
        <div className="pepper-scale-track">
          {Array.from({ length: scaleMax }, (_, i) => i + 1).map(num => {
            const aVariants = getAnswerVariants(survey.animation, num - 1);
            return (
              <motion.button
                key={num}
                type="button"
                className={`pepper-scale-point ${formData[question.id] === num ? 'active' : ''}`}
                onClick={() => handleAnswer(question.id, num)}
                variants={aVariants}
                initial="initial"
                animate="animate"
                whileTap={{ scale: 0.9 }}
              >
                {num}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLikert = (question: Question) => {
    const options = question.options?.length ? question.options : ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'];
    return (
      <div className="pepper-likert">
        {options.map((opt, i) => {
          const aVariants = getAnswerVariants(survey.animation, i);
          const isSelected = formData[question.id] === opt;
          return (
            <motion.div
              key={i}
              className={`pepper-likert-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleAnswer(question.id, opt)}
              variants={aVariants}
              initial="initial"
              animate="animate"
            >
              <div className={`pepper-likert-dot ${isSelected ? 'active' : ''}`} />
              <span className="pepper-likert-label">{opt}</span>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderRanking = (question: Question) => {
    const options = question.options || [];
    const currentRanking: string[] = formData[question.id]
      ? String(formData[question.id]).split('|||')
      : [];

    const moveUp = (idx: number) => {
      if (idx === 0) return;
      const arr = currentRanking.length === options.length ? [...currentRanking] : [...options];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      handleAnswer(question.id, arr.join('|||'));
    };
    const moveDown = (idx: number) => {
      const arr = currentRanking.length === options.length ? [...currentRanking] : [...options];
      if (idx >= arr.length - 1) return;
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      handleAnswer(question.id, arr.join('|||'));
    };

    const displayItems = currentRanking.length === options.length ? currentRanking : options;

    return (
      <div className="pepper-ranking">
        <p className="pepper-ranking-hint">Drag or use arrows to rank from most to least important</p>
        {displayItems.map((item, i) => (
          <div key={i} className="pepper-ranking-item">
            <span className="pepper-ranking-num">{i + 1}</span>
            <span className="pepper-ranking-label">{item}</span>
            <div className="pepper-ranking-controls">
              <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="pepper-rank-btn">↑</button>
              <button type="button" onClick={() => moveDown(i)} disabled={i === displayItems.length - 1} className="pepper-rank-btn">↓</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDropdown = (question: Question) => (
    <div className="pepper-dropdown-wrap">
      <select
        className="pepper-dropdown"
        value={formData[question.id] as string || ''}
        onChange={(e) => handleAnswer(question.id, e.target.value)}
      >
        <option value="">Select an option...</option>
        {question.options?.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  // ── Multi-select dropdown ──────────────────────────────────────────────────
  const renderDropdownMulti = (question: Question) => {
    const selectedValues = formData[question.id]
      ? String(formData[question.id]).split(',').filter(Boolean)
      : [];
    const toggle = (opt: string) => {
      const next = selectedValues.includes(opt)
        ? selectedValues.filter(v => v !== opt)
        : [...selectedValues, opt];
      handleAnswer(question.id, next.join(','));
    };
    return (
      <div className="pepper-options pepper-options--multi">
        {question.options?.map((opt, i) => {
          const aVariants = getAnswerVariants(survey.animation, i);
          const isSelected = selectedValues.includes(opt);
          return (
            <motion.div key={i} variants={aVariants} initial="initial" animate="animate">
              <div
                className={`pepper-option pepper-option--checkbox ${isSelected ? 'selected' : ''}`}
                onClick={() => toggle(opt)}
              >
                <span className={`pepper-checkbox ${isSelected ? 'pepper-checkbox--checked' : ''}`}>
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span className="pepper-option-label">{opt}</span>
              </div>
            </motion.div>
          );
        })}
        <p className="pepper-multi-hint">Select all that apply</p>
      </div>
    );
  };

  // ── Matrix / Grid ──────────────────────────────────────────────────────────
  const renderMatrix = (question: Question) => {
    const rows = question.options || [];
    const cols = question.matrixColumns || ['Option A', 'Option B', 'Option C'];
    // Answer stored as JSON string: { "Row1": "ColA", "Row2": "ColB", ... }
    let answers: Record<string, string> = {};
    try { answers = JSON.parse(String(formData[question.id] || '{}')); } catch { answers = {}; }

    const selectCell = (row: string, col: string) => {
      const updated = { ...answers, [row]: col };
      handleAnswer(question.id, JSON.stringify(updated));
    };

    return (
      <div className="pepper-matrix-wrap" style={{ overflowX: 'auto', marginTop: 8 }}>
        <table className="pepper-matrix" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
          <thead>
            <tr>
              <th style={{ width: '35%', textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 600, color: 'var(--pepper-text-lighter)' }}></th>
              {cols.map((col, ci) => (
                <th key={ci} style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--pepper-text-lighter)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--pepper-paper)' : 'transparent', borderRadius: 8 }}>
                <td style={{ padding: '10px 10px', fontSize: 13, fontWeight: 500, color: 'var(--pepper-dark)' }}>{row}</td>
                {cols.map((col, ci) => {
                  const isSelected = answers[row] === col;
                  return (
                    <td key={ci} style={{ textAlign: 'center', padding: '8px' }}>
                      <button
                        type="button"
                        onClick={() => selectCell(row, col)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--pepper-red)' : 'var(--pepper-border)'}`,
                          background: isSelected ? 'var(--pepper-red)' : 'transparent',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSelected && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Progress hint */}
        {(() => {
          const rows = question.options || [];
          const answered = rows.filter(r => answers[r]).length;
          if (answered < rows.length) {
            return (
              <p style={{ fontSize: 11, color: 'var(--pepper-text-lighter)', marginTop: 8, fontStyle: 'italic' }}>
                {answered} of {rows.length} rows answered
              </p>
            );
          }
          return null;
        })()}
      </div>
    );
  };

  // ── List ───────────────────────────────────────────────────────────────────
  const renderList = (question: Question) => {
    const items = question.options || [];
    const selected = formData[question.id]
      ? String(formData[question.id]).split(',').filter(Boolean)
      : [];
    const toggle = (item: string) => {
      const next = selected.includes(item)
        ? selected.filter(v => v !== item)
        : [...selected, item];
      handleAnswer(question.id, next.join(','));
    };
    return (
      <div style={{ marginTop: 8 }}>
        {items.map((item, i) => {
          const aVariants = getAnswerVariants(survey.animation, i);
          const isChecked = selected.includes(item);
          return (
            <motion.div key={i} variants={aVariants} initial="initial" animate="animate">
              <div
                onClick={() => toggle(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                  border: `1.5px solid ${isChecked ? 'var(--pepper-red)' : 'var(--pepper-border)'}`,
                  background: isChecked ? 'var(--pepper-red-light-10, #FEF0EC)' : 'var(--pepper-paper-inner)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${isChecked ? 'var(--pepper-red)' : 'var(--pepper-border)'}`,
                  background: isChecked ? 'var(--pepper-red)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {isChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: 13, color: isChecked ? 'var(--pepper-red-dark, #A8624A)' : 'var(--pepper-text)', fontWeight: isChecked ? 500 : 400 }}>
                  {i + 1}. {item}
                </span>
              </div>
            </motion.div>
          );
        })}
        <p className="pepper-multi-hint">Select all that apply</p>
      </div>
    );
  };

  const renderNumeric = (question: Question) => (
    <div className="pepper-numeric-wrap">
      <input
        type="number"
        className="pepper-numeric"
        value={formData[question.id] as string || ''}
        onChange={(e) => handleAnswer(question.id, e.target.value)}
        min={question.numericMin}
        max={question.numericMax}
        placeholder={question.numericMin !== undefined && question.numericMax !== undefined
          ? `Enter a number (${question.numericMin}–${question.numericMax})`
          : 'Enter a number'}
      />
      {question.numericMin !== undefined && question.numericMax !== undefined && (
        <span className="pepper-numeric-hint">Range: {question.numericMin} – {question.numericMax}</span>
      )}
    </div>
  );

  const renderQuestion = (question: Question, index: number) => {
    if (!previewMode && index !== currentQuestionIndex) return null;
    if (previewMode && index !== currentQuestionIndex) return null;

    const isTypewriter = (survey.animation?.questionAnimation === 'typewriter');

    return (
      <motion.div
        key={`${question.id}-${currentQuestionIndex}`}
        className="pepper-question-area pepper-animate-question"
        variants={qVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="pepper-question-number">
          <span className="num-badge">{index + 1}</span>
          Question {index + 1}{survey.show_question_count === true ? ` of ${visibleQuestions.length}` : ''}
        </div>

        {/* Question video — shown above the question if set */}
        {question.questionVideo && !previewMode && (
          <SurveyVideoPlayer
            videos={[{ url: question.questionVideo, title: question.questionVideoTitle || `Video` }]}
            replayEnabled={survey.video_replay_enabled === true}
            onDisqualify={() => {
              setFunnelTerminated(true);
              setFunnelTerminateReason(
                'You switched tabs or left this window while a required video was playing. Your survey response has been disqualified.'
              );
              setSubmitted(true);
            }}
          />
        )}

        {/* Question images — above position (default) */}
        <QuestionImage q={question} position="above" />

        {/* Question text — typewriter gets CSS animation, others use motion */}
        {isTypewriter ? (
          <h2
            key={`tw-${question.id}-${currentQuestionIndex}`}
            className="pepper-question-text pepper-typewriter"
            style={{
              '--tw-chars': `${question.question.length}`,
              '--tw-dur': `${Math.max(0.8, question.question.length * 0.045)}s`,
            } as React.CSSProperties}
          >
            {editMode ? (
              <input
                type="text"
                value={question.question}
                onChange={(e) => {
                  const updated = { ...survey };
                  if (updated.questions[index]) {
                    updated.questions[index].question = e.target.value;
                    onSurveyChange?.(updated);
                  }
                }}
                className="pepper-editable-input"
              />
            ) : (
              question.question
            )}
          </h2>
        ) : (
          <h2 className="pepper-question-text">
            {editMode ? (
              <input
                type="text"
                value={question.question}
                onChange={(e) => {
                  const updated = { ...survey };
                  if (updated.questions[index]) {
                    updated.questions[index].question = e.target.value;
                    onSurveyChange?.(updated);
                  }
                }}
                className="pepper-editable-input"
              />
            ) : (
              question.question
            )}
          </h2>
        )}

        {question.questionDescription && (
          <p className="pepper-question-desc">{question.questionDescription}</p>
        )}

        {/* Question images — below position */}
        <QuestionImage q={question} position="below" />

        <div className="pepper-question-separator"></div>

        {question.answerDescription && (
          <div className="pepper-answer-hint">{question.answerDescription}</div>
        )}

        {question.type === 'radio' && question.rawType === 'likert' && renderLikert(question)}
        {question.type === 'radio' && question.rawType !== 'likert' && renderRadioOptions(question)}
        {question.type === 'text' && question.rawType === 'numeric' && renderNumeric(question)}
        {question.type === 'text' && question.rawType !== 'numeric' && renderTextInput(question)}
        {question.type === 'range' && renderScale(question)}
        {question.type === 'ranking' && renderRanking(question)}
        {question.type === 'dropdown' && renderDropdown(question)}
        {question.type === 'dropdown_multi' && renderDropdownMulti(question)}
        {question.type === 'matrix' && renderMatrix(question)}
        {question.type === 'list' && renderList(question)}
      </motion.div>
    );
  };

  /* -- Main Render -- */
  
  // Show resuming state
  if (isResuming) {
    return (
      <div className="pepper-survey-container">
        <div className="pepper-card-wrapper">
          <div className="pepper-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div className="pepper-loading-spinner" />
            <h2 style={{ marginTop: '20px', color: 'var(--pepper-dark)' }}>Resuming your survey...</h2>
            <p style={{ color: 'var(--pepper-muted)', marginTop: '10px' }}>Please wait while we restore your progress.</p>
          </div>
        </div>
      </div>
    );
  }

  // Already completed (localStorage check) � near-zero false positive
  if (alreadyCompleted && !previewMode && !resubmitBlocked) {
    return (
      <div className="pepper-survey-container">
        <div style={{ maxWidth: '880px', width: '100%', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
          <div style={{ width: '28px', height: '28px', backgroundImage: 'url(/logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', flexShrink: 0 }} />
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pepper-dark)', fontFamily: "'Kalam', cursive" }}>
            {survey.title || 'Survey'}
          </h1>
        </div>
        <div className="pepper-card-wrapper">
          <div className="pepper-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            {/* Checkmark icon */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ color: 'var(--pepper-dark)', marginBottom: 12, fontSize: 22 }}>
              You've already completed this survey
            </h2>
            <p style={{ color: 'var(--pepper-muted)', fontSize: 15, maxWidth: 380, margin: '0 auto' }}>
              Our records show this survey was already filled out on this device.
              Each person can only submit once. Thanks for your participation!
            </p>
          </div>
        </div>
        <div className="pepper-powered">
          Powered by <a href="#">Pepperwahl</a>
        </div>
      </div>
    );
  }

  // Admin resubmit policy block — server-side enforcement
  if (resubmitBlocked && !previewMode) {
    const isForever = resubmitReason === 'block_forever';
    return (
      <div className="pepper-survey-container">
        <div style={{ maxWidth: '880px', width: '100%', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
          <div style={{ width: '28px', height: '28px', backgroundImage: 'url(/logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', flexShrink: 0 }} />
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pepper-dark)', fontFamily: "'Kalam', cursive" }}>
            {survey.title || 'Survey'}
          </h1>
        </div>
        <div className="pepper-card-wrapper">
          <div className="pepper-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: isForever
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: isForever
                ? '0 4px 20px rgba(239,68,68,0.35)'
                : '0 4px 20px rgba(245,158,11,0.35)',
            }}>
              {isForever ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <h2 style={{ color: 'var(--pepper-dark)', marginBottom: 12, fontSize: 22 }}>
              {isForever ? 'Survey already completed' : 'Survey temporarily unavailable'}
            </h2>
            <p style={{ color: 'var(--pepper-muted)', fontSize: 15, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              {isForever
                ? 'You have already submitted this survey. Only one response per person is allowed.'
                : resubmitCooldownEnds
                  ? (() => {
                      const now = new Date();
                      const diff = resubmitCooldownEnds.getTime() - now.getTime();
                      if (diff <= 0) return 'You can fill this survey again now.';
                      const totalMins = Math.ceil(diff / 60000);
                      if (totalMins < 60) return `You can fill this survey again in ${totalMins} minute${totalMins !== 1 ? 's' : ''}.`;
                      const totalHours = Math.ceil(diff / 3600000);
                      if (totalHours < 24) return `You can fill this survey again in ${totalHours} hour${totalHours !== 1 ? 's' : ''} (${resubmitCooldownEnds.toLocaleString()}).`;
                      return `You can fill this survey again after ${resubmitCooldownEnds.toLocaleString()}.`;
                    })()
                  : 'This survey has a cooldown period. Please try again later.'}
            </p>
          </div>
        </div>
        <div className="pepper-powered">
          Powered by <a href="#">Pepperwahl</a>
        </div>
      </div>
    );
  }

  // ── Font settings from survey.theme ────────────────────────────────────
  const FONT_STACKS: Record<string, string> = {
    outfit:   "'Outfit', -apple-system, sans-serif",
    inter:    "'Inter', -apple-system, sans-serif",
    roboto:   "'Roboto', -apple-system, sans-serif",
    lato:     "'Lato', -apple-system, sans-serif",
    playfair: "'Playfair Display', Georgia, serif",
    poppins:  "'Poppins', -apple-system, sans-serif",
  };
  const fontFamilyKey = (survey.theme as any)?.font_family || 'outfit';
  const fontStack = FONT_STACKS[fontFamilyKey] || FONT_STACKS.outfit;
  const fontSizeScale: number = (survey.theme as any)?.font_size_scale ?? 1.0;
  const rootFontStyle: React.CSSProperties = {
    fontFamily: fontStack,
    fontSize: `${Math.round(fontSizeScale * 100)}%`,
  };

  return (
    <div className="pepper-survey-container" style={rootFontStyle}>
      {/* ── Browser-back blocker overlay ── */}
      {showBackBlocker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(45, 37, 32, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          {/* Paper card */}
          <div style={{
            background: '#FAF8F5',
            borderRadius: 20,
            padding: '44px 40px 36px',
            maxWidth: 420, width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 48px rgba(45,37,32,0.22), 0 2px 8px rgba(45,37,32,0.08)',
            border: '1px solid #EBE8E3',
            position: 'relative',
            fontFamily: "'Outfit', -apple-system, sans-serif",
          }}>
            {blockerSubmitted ? (
              <>
                {/* Success state */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#F0FDF4', border: '1.5px solid #BBF7D0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2D2520', marginBottom: 8, letterSpacing: '-0.02em' }}>
                  You're on the list
                </h2>
                <p style={{ fontSize: 13, color: '#9B9189', lineHeight: 1.65 }}>
                  We'll reach out when the next opportunity opens up. Keep an eye on your inbox.
                </p>
              </>
            ) : (
              <>
                {/* Icon — simple SVG arrow, no emoji */}
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: '#FEF0EC', border: '1.5px solid #F8D5C8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 22px',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4785C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2D2520', marginBottom: 8, letterSpacing: '-0.02em' }}>
                  Leaving already?
                </h2>
                <p style={{ fontSize: 13, color: '#9B9189', lineHeight: 1.65, marginBottom: 26 }}>
                  Navigating back will exit the survey. Drop your email below — we'll notify you when the next opportunity opens.
                </p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!blockerEmail.trim()) return;
                  setBlockerSubmitting(true);
                  try {
                    await fetch(`${apiBaseUrl}/api/surveys/${(survey as any).short_id || survey.id}/back-exit-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: blockerEmail.trim(), survey_id: (survey as any).short_id || survey.id }),
                    });
                  } catch { /* silent */ }
                  setBlockerSubmitted(true);
                  setBlockerSubmitting(false);
                }}>
                  <input
                    type="email"
                    required
                    value={blockerEmail}
                    onChange={e => setBlockerEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      width: '100%', padding: '11px 14px', fontSize: 13,
                      border: '1.5px solid #EBE8E3', borderRadius: 10,
                      outline: 'none', marginBottom: 10,
                      boxSizing: 'border-box' as const,
                      background: '#FDFCFA', color: '#2D2520',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#C4785C'; }}
                    onBlur={e => { e.target.style.borderColor = '#EBE8E3'; }}
                  />
                  <button
                    type="submit"
                    disabled={blockerSubmitting}
                    style={{
                      width: '100%', padding: '12px', fontSize: 13, fontWeight: 600,
                      background: '#C4785C', color: '#fff',
                      border: 'none', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'inherit', letterSpacing: '0.01em',
                      boxShadow: '0 2px 10px rgba(196,120,92,0.3)',
                      marginBottom: 14,
                      opacity: blockerSubmitting ? 0.7 : 1,
                      transition: 'opacity 0.15s, background 0.15s',
                    }}
                  >
                    {blockerSubmitting ? 'Saving…' : 'Notify me of the next opportunity'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setShowBackBlocker(false)}
                  style={{
                    background: 'none', border: 'none',
                    color: '#C4A99A', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                    letterSpacing: '0.01em',
                    textDecoration: 'underline',
                    textDecorationColor: '#EBE8E3',
                    display: backButtonEnabled ? 'inline' : 'none',
                  }}
                >
                  Continue the survey instead
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Title + Logo � OUTSIDE the paper card */}
      <div style={{ maxWidth: '880px', width: '100%', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
        <div style={{ width: '28px', height: '28px', backgroundImage: 'url(/logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', flexShrink: 0 }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pepper-dark)', fontFamily: "'Kalam', cursive" }}>
          {survey.title || 'Survey'}
        </h1>
      </div>

      <div className="pepper-card-wrapper">
        {/* Clip � just above the paper card top edge */}
        <div style={{ position: 'absolute', top: '-18px', left: '30px', zIndex: 20, width: '36px', height: '36px', transform: 'rotate(-20deg)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="36" height="36">
            <path fill="#2D2520" d="M288.6 76.8C344.8 20.6 436 20.6 492.2 76.8C548.4 133 548.4 224.2 492.2 280.4L328.2 444.4C293.8 478.8 238.1 478.8 203.7 444.4C169.3 410 169.3 354.3 203.7 319.9L356.5 167.3C369 154.8 389.3 154.8 401.8 167.3C414.3 179.8 414.3 200.1 401.8 212.6L249 365.3C239.6 374.7 239.6 389.9 249 399.2C258.4 408.5 273.6 408.6 282.9 399.2L446.9 235.2C478.1 204 478.1 153.3 446.9 122.1C415.7 90.9 365 90.9 333.8 122.1L169.8 286.1C116.7 339.2 116.7 425.3 169.8 478.4C222.9 531.5 309 531.5 362.1 478.4L492.3 348.3C504.8 335.8 525.1 335.8 537.6 348.3C550.1 360.8 550.1 381.1 537.6 393.6L407.4 523.6C329.3 601.7 202.7 601.7 124.6 523.6C46.5 445.5 46.5 318.9 124.6 240.8L288.6 76.8z"/>
          </svg>
        </div>

        <div className={`pepper-card ${previewMode ? 'preview-mode' : ''}`}>

        {/* Progress Bar (hidden via CSS) */}
        <div className="pepper-progress">
          <div className="pepper-progress-track" style={{ '--progress-width': `${((currentQuestionIndex + 1) / visibleQuestions.length) * 100}%` } as React.CSSProperties}>
          </div>
          <span className="pepper-progress-counter">
            {currentQuestionIndex + 1}/{visibleQuestions.length}
          </span>
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit} ref={formRef}>
          {/* ── Inline chain survey card — replaces the question area ── */}
          {chainSurveyPrompt && chainSurveyPrompt.mode === 'inline' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              style={{ padding: '8px 0 16px', textAlign: 'center' }}
            >
              {/* Red badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 20, padding: '4px 14px', marginBottom: 20,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'Outfit', sans-serif" }}>
                  Continue Your Journey
                </span>
              </div>

              <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>

              <h3 style={{
                margin: '0 0 10px', fontSize: 22, fontWeight: 800,
                color: '#111827', lineHeight: 1.3, fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
              }}>
                {chainSurveyPrompt.message}
              </h3>
              <p style={{
                margin: '0 0 28px', fontSize: 14, color: '#6b7280',
                lineHeight: 1.6, fontFamily: "'Outfit', sans-serif",
              }}>
                A short survey awaits — it takes just a few minutes.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', maxWidth: 380, margin: '0 auto' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { window.location.href = chainSurveyPrompt.url; }}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                  }}
                >
                  {chainSurveyPrompt.yesLabel} →
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setChainSurveyPrompt(null)}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 14,
                    border: '1.5px solid #e5e7eb', background: '#f9fafb',
                    color: '#374151', fontWeight: 600, fontSize: 15,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {chainSurveyPrompt.noLabel}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {visibleQuestions.map((q, i) => renderQuestion(q, i))}
            </AnimatePresence>
          )}

          {/* Footer Navigation */}
          {!previewMode && (
            <div className="pepper-footer">
              {currentQuestionIndex > 0 && backButtonEnabled ? (
                <button
                  type="button"
                  className="pepper-btn pepper-btn-back"
                  onClick={handlePrev}
                  disabled={isTransitioning}
                >
                  <span className="arrow">←</span> Back
                </button>
              ) : (
                <div />
              )}

              {currentQuestionIndex < visibleQuestions.length - 1 ? (
                <button
                  type="button"
                  className="pepper-btn pepper-btn-next"
                  onClick={handleNext}
                  disabled={!isCurrentAnswered || isTransitioning}
                >
                  {isTransitioning ? (
                    <>
                      <span className="pepper-transition-spinner" />
                      {transitionCountdown > 0 ? `${transitionCountdown}s` : '…'}
                    </>
                  ) : (
                    <>Next <span className="arrow">→</span></>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  className="pepper-btn pepper-btn-submit"
                  disabled={!isCurrentAnswered || isTransitioning}
                >
                  Submit
                </button>
              )}
            </div>
          )}

          {previewMode && (
            <div className="pepper-footer">
              {currentQuestionIndex > 0 && backButtonEnabled !== false ? (
                <button
                  type="button"
                  className="pepper-btn pepper-btn-back"
                  onClick={handlePrev}
                >
                  <span className="arrow">←</span> Back
                </button>
              ) : (
                <div />
              )}
              {currentQuestionIndex < visibleQuestions.length - 1 ? (
                <button
                  type="button"
                  className="pepper-btn pepper-btn-next"
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                >
                  Next <span className="arrow">→</span>
                </button>
              ) : (
                <button type="submit" className="pepper-btn pepper-btn-submit">
                  Submit
                </button>
              )}
            </div>
          )}

          {/* Keyboard hint */}
          {!previewMode && isCurrentAnswered && currentQuestionIndex < visibleQuestions.length - 1 && (
            <div className="pepper-keyboard-hint">
              Press <kbd>Enter ?</kbd> to continue
            </div>
          )}
        </form>
      </div>
      </div>{/* close pepper-card-wrapper */}

      {/* Powered by */}
      <div className="pepper-powered">
        Powered by <a href="#">Pepperwahl</a>
      </div>

      {/* ── Active Layer Renderer ── */}
      {activeLayer && activeLayer.type === 'result_page' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9996,
            fontFamily: "'Outfit', sans-serif",
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '40px 20px 32px',
            background: '#eef0f3',
          }}
        >
          {/* Spacer top */}
          <div style={{ flex: 1 }} />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.08 }}
            style={{
              width: '100%', maxWidth: 440,
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
              padding: '48px 36px 40px',
              textAlign: 'center',
            }}
          >
            {/* Icon tile */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.18 }}
              style={{
                width: 88, height: 88, borderRadius: 20, margin: '0 auto 28px',
                background: activeLayer.variant === 'pass' ? '#e6f4ec' : '#fce8e8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: activeLayer.variant === 'pass' ? '#22c55e' : '#e53e3e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: activeLayer.variant === 'pass'
                  ? '0 4px 16px rgba(34,197,94,0.35)'
                  : '0 4px 16px rgba(229,62,62,0.35)',
              }}>
                {activeLayer.variant === 'pass' ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <motion.polyline points="20 6 9 17 4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.3 }} />
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <motion.line x1="18" y1="6" x2="6" y2="18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, delay: 0.28 }} />
                    <motion.line x1="6" y1="6" x2="18" y2="18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, delay: 0.42 }} />
                  </svg>
                )}
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              style={{
                margin: '0 0 12px', fontSize: 28, fontWeight: 800,
                color: '#111827', lineHeight: 1.15, letterSpacing: '-0.01em',
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              {activeLayer.title || (activeLayer.variant === 'pass' ? "You're Qualified!" : 'Not Quite Yet')}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              style={{
                margin: '0 0 32px', fontSize: 14.5,
                color: '#6b7280', lineHeight: 1.65,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {activeLayer.subtitle || (
                activeLayer.variant === 'pass'
                  ? "Congratulations! You've met all the requirements for the Pepperwahl program. We're excited to have you on board."
                  : "Unfortunately, you don't meet the current criteria for this round. Don't worry—you can try again in 30 days or explore our resources."
              )}
            </motion.p>

            {/* CTA button */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActiveLayer(null); processNextLayer(layerQueueRef.current); }}
              style={{
                padding: '13px 32px',
                borderRadius: 10, border: 'none',
                background: activeLayer.variant === 'pass' ? '#22c55e' : '#111827',
                color: '#fff', fontWeight: 600, fontSize: 15,
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                letterSpacing: '0.01em',
                boxShadow: activeLayer.variant === 'pass'
                  ? '0 4px 18px rgba(34,197,94,0.35)'
                  : '0 4px 18px rgba(0,0,0,0.25)',
              }}
            >
              {activeLayer.cta_text || (activeLayer.variant === 'pass' ? 'Get Started' : 'View Resources')}
            </motion.button>
          </motion.div>

          {/* Spacer bottom */}
          <div style={{ flex: 1 }} />

          {/* Powered by Pepperwahl footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 28,
            }}
          >
            <img src="/logo.png" alt="Pepperwahl" style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.65 }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase', color: '#9ca3af',
              fontFamily: "'Outfit', sans-serif",
            }}>
              Powered by Pepperwahl
            </span>
          </motion.div>
        </motion.div>
      )}
      {/* ── Spinner Layer ── */}
      {activeLayer && activeLayer.type === 'spinner' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9996,
            background: 'rgba(255,255,255,0.97)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {/* Dual-ring spinner */}
          <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 28 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                border: '4px solid #f3f4f6',
                borderTopColor: '#ef4444',
              }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: 8,
                borderRadius: '50%',
                border: '3px solid #fef2f2',
                borderBottomColor: '#f97316',
              }}
            />
          </div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#1f2937', margin: '0 0 6px' }}>
            {activeLayer.text || 'Verifying your answers...'}
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
            Please wait
          </p>
        </motion.div>
      )}

      {/* ── Chain Survey Prompt Card (ask overlay mode) ── */}
      {chainSurveyPrompt && chainSurveyPrompt.mode === 'ask' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'linear-gradient(135deg, rgba(15,10,10,0.85) 0%, rgba(80,10,10,0.75) 100%)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, fontFamily: "'Outfit', sans-serif",
          }}
        >
          {/* Decorative background dots */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[...Array(6)].map((_, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.06, scale: 1 }}
                transition={{ delay: i * 0.1 + 0.2 }}
                style={{
                  position: 'absolute',
                  width: [300,200,400,150,250,350][i],
                  height: [300,200,400,150,250,350][i],
                  borderRadius: '50%',
                  background: '#ef4444',
                  left: ['10%','60%','30%','80%','5%','55%'][i],
                  top: ['10%','5%','60%','50%','70%','80%'][i],
                  transform: 'translate(-50%,-50%)',
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.88, y: 32, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
            style={{
              background: '#fff', borderRadius: 28,
              width: '100%', maxWidth: 460,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
              position: 'relative',
            }}
          >
            {/* Red accent top bar */}
            <div style={{
              height: 6,
              background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #ef4444 100%)',
            }} />

            {/* Content */}
            <div style={{ padding: '40px 36px 36px', textAlign: 'center' }}>
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 }}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '3px solid #fecaca',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px', fontSize: 30,
                }}
              >
                📋
              </motion.div>

              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 20, padding: '4px 12px', marginBottom: 16,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>
                  New Survey Available
                </span>
              </div>

              <h3 style={{
                margin: '0 0 12px', fontSize: 24, fontWeight: 800,
                color: '#111827', lineHeight: 1.3, letterSpacing: '-0.02em',
              }}>
                {chainSurveyPrompt.message}
              </h3>
              <p style={{ margin: '0 0 32px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                It only takes a few minutes. Your input helps us improve.
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { window.location.href = chainSurveyPrompt.url; }}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {chainSurveyPrompt.yesLabel} →
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setChainSurveyPrompt(null)}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 14,
                    border: '1.5px solid #e5e7eb', background: '#f9fafb',
                    color: '#374151', fontWeight: 600, fontSize: 15,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {chainSurveyPrompt.noLabel}
                </motion.button>
              </div>

              {/* Subtle skip text */}
              <button
                onClick={() => setChainSurveyPrompt(null)}
                style={{
                  marginTop: 20, background: 'none', border: 'none',
                  fontSize: 12, color: '#9ca3af', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Redirecting Spinner Overlay */}
      {redirecting && (
        <motion.div
          className="pepper-success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="pepper-success-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <h2 style={{ margin: 0 }}>Verifying your responses...</h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Please wait while we process your submission.</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </motion.div>
        </motion.div>
      )}

      {/* Success Overlay */}
      {(submitted || funnelTerminated) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: funnelTerminated
              ? 'linear-gradient(135deg, #111 0%, #1a0808 100%)'
              : 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #2d0a0a 100%)',
            padding: 24,
          }}
        >
          {/* Funnel not eligible page */}
          {funnelTerminated && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ textAlign: 'center', maxWidth: 420 }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 14, fontFamily: "'Outfit', sans-serif" }}>
                Thank You for Participating
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7, marginBottom: 10 }}>
                {funnelTerminateReason}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                We appreciate your time and interest.
              </p>
            </motion.div>
          )}
          {/* Animated confetti dots */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400) }}
                animate={{ opacity: [0, 1, 0], y: [0, (typeof window !== 'undefined' ? window.innerHeight : 600) + 50] }}
                transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 2, repeat: Infinity }}
                style={{
                  position: 'absolute', top: 0,
                  width: 6 + Math.random() * 6, height: 6 + Math.random() * 6,
                  borderRadius: '50%',
                  background: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)],
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
          >
            {/* Animated checkmark circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 15 }}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', boxShadow: '0 10px 40px rgba(16,185,129,0.3)',
              }}
            >
              <motion.svg
                width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.5 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </motion.svg>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}
            >
              You're awesome!
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 40px', maxWidth: 320, lineHeight: 1.5 }}
            >
              Your responses are in. Thanks for taking a moment to share your thoughts!
            </motion.p>

            {/* PepperWahl CTA */}
            <motion.a
              href="https://survey.pepperwahl.com/create-survey"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '14px 24px',
                background: 'rgba(255,255,255,0.08)', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                textDecoration: 'none', transition: 'all 0.25s',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <img src="/logo.png" alt="PepperWahl" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' }}>Create your own in 2 minutes</span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Powered by PepperWahl � Free</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.a>
          </motion.div>
        </motion.div>
      )}
      {/* Submission Loading Overlay */}
      {isSubmitting && (
        <div className="pepper-submitting-overlay">
          <div className="pepper-submitting-content">
            <div className="pepper-submitting-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Submitting your responses...</p>
          </div>
          <style>{`
            .pepper-submitting-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255,255,255,0.92);
              animation: pepperSubFadeIn 0.3s ease-out;
            }
            .pepper-submitting-content {
              text-align: center;
            }
            .pepper-submitting-content p {
              margin-top: 20px;
              font-size: 15px;
              font-weight: 500;
              color: #64748b;
              font-family: 'Outfit', sans-serif;
            }
            .pepper-submitting-dots {
              display: flex;
              gap: 8px;
              justify-content: center;
            }
            .pepper-submitting-dots span {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #ef4444;
              animation: pepperDotBounce 1.4s ease-in-out infinite;
            }
            .pepper-submitting-dots span:nth-child(2) {
              animation-delay: 0.16s;
              background: #f97316;
            }
            .pepper-submitting-dots span:nth-child(3) {
              animation-delay: 0.32s;
              background: #fbbf24;
            }
            @keyframes pepperDotBounce {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40% { transform: scale(1.2); opacity: 1; }
            }
            @keyframes pepperSubFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default BasicSurveyTemplate;
