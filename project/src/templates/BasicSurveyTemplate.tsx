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

interface Question {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: 'text' | 'radio' | 'range';
  options?: string[];
  answerStyle?: string;
  show_if?: ShowIfCondition | null;
}

interface RawQuestion {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: string;
  options?: string[];
  show_if?: ShowIfCondition | null;
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

  const normalizeType = (type: string): 'text' | 'radio' | 'range' => {
    switch (type) {
      case 'multiple_choice':
      case 'yes_no':
        return 'radio';
      case 'short_answer':
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
    question: q.question,
    questionDescription: q.questionDescription,
    answerDescription: q.answerDescription,
    type: normalizeType(q.type),
    options: q.options || [],
    answerStyle: (q as any).answerStyle || undefined,
    show_if: q.show_if || null,
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

  // Clamp question index if visible questions change due to skip logic
  useEffect(() => {
    if (currentQuestionIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentQuestionIndex]);

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://hostslice.onrender.com';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUsername(params.get('username'));
    setEmail(params.get('email'));

    let extractedClickId = params.get('click_id');
    if (!extractedClickId) {
      extractedClickId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  const handleAnswer = (id: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    trackClickInteraction('answer_selected', { questionId: id, answer: value });
    // Email triggers are now backend-only - no frontend checking needed
  };

  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const isCurrentAnswered = currentQuestion
    ? currentQuestion.type === 'range' 
      ? formData[currentQuestion.id] !== undefined && formData[currentQuestion.id] !== ''
      : formData[currentQuestion.id] !== '' && formData[currentQuestion.id] !== 0
    : false;

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < visibleQuestions.length - 1 && isCurrentAnswered) {
      setCurrentQuestionIndex(prev => prev + 1);
      trackClickInteraction('question_navigation', {
        action: 'next',
        from_question: currentQuestionIndex + 1,
        to_question: currentQuestionIndex + 2
      });
    }
  }, [currentQuestionIndex, visibleQuestions.length, isCurrentAnswered]);

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
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

    // Only validate visible questions (skip logic hides some)
    const unanswered = visibleQuestions.find(q => {
      const val = formData[q.id];
      if (q.type === 'range') {
        return val === undefined || val === '';
      }
      return val === '' || val === undefined;
    });
    if (unanswered) return;

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
              responses[q.id] = val;
            }
          }
        }
      });

      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/submit-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          email: email, // Use URL email parameter
          username,
          tracking_id: trackingId,
          click_id: clickId,
          ...getMoustacheleadsPayload()
          // No email_triggers_met flag - backend handles triggers automatically
        }),
      });

      console.log('📧 Survey submission data:', {
        responses,
        email: email,
        username,
        tracking_id: trackingId,
        click_id: clickId
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();

      const redirect = result?.redirect || {};
      const evaluation = result?.evaluation || {};

      console.log('📊 Evaluation result:', evaluation);

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

  /* ── Render Helpers ── */

  const qVariants = getQuestionVariants(survey.animation);

  const answerStyle = (survey as any).answerStyle || 'classic';

  const getStyleForQuestion = (question: Question) => question.answerStyle || answerStyle;

  const renderRadioOptions = (question: Question) => (
    <div className={`pepper-options pepper-style-${getStyleForQuestion(question)}`}>
      {question.options?.map((option, i) => {
        const aVariants = getAnswerVariants(survey.animation, i);
        return (
          <div
            key={i}
            className={`pepper-option ${formData[question.id] === option ? 'selected' : ''}`}
            onClick={() => handleAnswer(question.id, option)}
          >
            <span className="pepper-option-key">{OPTION_KEYS[i] || i + 1}</span>
            {!previewMode ? (
              <motion.span className="pepper-option-label" variants={aVariants} initial="initial" animate="animate">{option.replace(/^[A-Z][\:\)\.\-]\s*/i, '')}</motion.span>
            ) : (
              <span className="pepper-option-label">{option.replace(/^[A-Z][\:\)\.\-]\s*/i, '')}</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTextInput = (question: Question) => (
    <textarea
      value={formData[question.id] as string}
      onChange={(e) => handleAnswer(question.id, e.target.value)}
      placeholder="Type your answer here..."
      className={`pepper-textarea pepper-textarea-${getStyleForQuestion(question)}`}
      rows={4}
    />
  );

  const renderScale = (question: Question) => {
    // Determine scale range: use 10 for rating questions
    const scaleMax = 10;
    return (
      <div className="pepper-scale">
        <div className="pepper-scale-labels">
          <span>Low</span>
          <span>High</span>
        </div>
        <div className="pepper-scale-track">
          {Array.from({ length: scaleMax }, (_, i) => i + 1).map(num => (
            <motion.button
              key={num}
              type="button"
              className={`pepper-scale-point ${formData[question.id] === num ? 'active' : ''}`}
              onClick={() => handleAnswer(question.id, num)}
              whileTap={{ scale: 0.9 }}
            >
              {num}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestion = (question: Question, index: number) => {
    if (!previewMode && index !== currentQuestionIndex) return null;
    if (previewMode && index > 2) return null;

    return (
      <div
        key={question.id}
        className="pepper-question-area pepper-animate-question"
      >
        <div className="pepper-question-number">
          <span className="num-badge">{index + 1}</span>
          Question {index + 1} of {visibleQuestions.length}
        </div>

        {!previewMode ? (
          <motion.h2 className="pepper-question-text" variants={qVariants} initial="initial" animate="animate" exit="exit">
            {question.question}
          </motion.h2>
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

        <div className="pepper-question-separator"></div>

        {question.answerDescription && (
          <div className="pepper-answer-hint">{question.answerDescription}</div>
        )}

        {question.type === 'radio' && renderRadioOptions(question)}
        {question.type === 'text' && renderTextInput(question)}
        {question.type === 'range' && renderScale(question)}
      </div>
    );
  };

  /* ── Main Render ── */
  return (
    <div className="pepper-survey-container">
      {/* Title + Logo — OUTSIDE the paper card */}
      <div style={{ maxWidth: '880px', width: '100%', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
        <div style={{ width: '28px', height: '28px', backgroundImage: 'url(/logo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', flexShrink: 0 }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pepper-dark)', fontFamily: "'Kalam', cursive" }}>
          {survey.title || 'Survey'}
        </h1>
      </div>

      <div className="pepper-card-wrapper">
        {/* Clip — just above the paper card top edge */}
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
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {visibleQuestions.map((q, i) => renderQuestion(q, i))}
          </AnimatePresence>

          {/* Footer Navigation */}
          {!previewMode && (
            <div className="pepper-footer">
              {currentQuestionIndex > 0 ? (
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
                  onClick={handleNext}
                  disabled={!isCurrentAnswered}
                >
                  Next <span className="arrow">→</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="pepper-btn pepper-btn-submit"
                  disabled={!isCurrentAnswered}
                >
                  Submit
                </button>
              )}
            </div>
          )}

          {previewMode && (
            <div className="pepper-footer">
              <div />
              <button type="submit" className="pepper-btn pepper-btn-submit">
                Submit
              </button>
            </div>
          )}

          {/* Keyboard hint */}
          {!previewMode && isCurrentAnswered && currentQuestionIndex < visibleQuestions.length - 1 && (
            <div className="pepper-keyboard-hint">
              Press <kbd>Enter ↵</kbd> to continue
            </div>
          )}
        </form>
      </div>
      </div>{/* close pepper-card-wrapper */}

      {/* Powered by */}
      <div className="pepper-powered">
        Powered by <a href="#">Pepperwahl</a>
      </div>

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
      {submitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #2d0a0a 100%)',
            padding: 24,
          }}
        >
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
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Powered by PepperWahl · Free</span>
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
