import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './CustomerFeedbackTemplate.css';
import type { Survey } from '../types/Survey';
import { 
  buildRedirectUrl, 
  createSessionContext
} from '../utils/redirectBuilder';

interface Question {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: 'text' | 'radio' | 'range';
  options?: string[];
}

interface RawQuestion {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: string;
  options?: string[];
}

interface Props {
  survey: Survey;
  previewMode?: boolean;
  editMode?: boolean;
  onSurveyChange?: (updatedSurvey: Survey) => void;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const CustomerFeedbackTemplate: React.FC<Props> = ({
  survey,
  previewMode = false,
}) => {
  const location = useLocation();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [clickId, setClickId] = useState<string | null>(null);
  const [urlParameters, setUrlParameters] = useState<Record<string, string>>({});

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
  }));

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const initialData: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => {
      initialData[q.id] = q.type === 'range' ? 5 : '';
    });
    return initialData;
  });

  const [progress, setProgress] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [visibleQuestions, setVisibleQuestions] = useState<string[]>(() =>
    previewMode
      ? normalizedQuestions.map(q => q.id)
      : normalizedQuestions.length > 0 ? [normalizedQuestions[0].id] : []
  );
  const [isLoadingNextQuestions, setIsLoadingNextQuestions] = useState<boolean>(false);

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://hostslice.onrender.com';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const allParams: Record<string, string> = {};
    params.forEach((value, key) => { allParams[key] = value; });
    setUrlParameters(allParams);
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
          total_questions: normalizedQuestions.length
        });
      }, 1000);
    }
  }, [location.search, survey.id]);

  const trackClickInteraction = async (action: string, data?: any) => {
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

  useEffect(() => {
    let completed = 0;
    const visibleQData = normalizedQuestions.filter(q => visibleQuestions.includes(q.id));
    visibleQData.forEach(q => {
      const val = formData[q.id];
      if (val !== undefined && val !== '' && !(q.type === 'range' && val === 5)) completed++;
    });
    const total = visibleQData.length;
    setProgress(total > 0 ? (completed / total) * 100 : 0);
  }, [formData, normalizedQuestions, visibleQuestions]);

  const handleChange = async (id: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    trackClickInteraction('answer_selected', { questionId: id, answer: value });

    if (previewMode) return;

    setIsLoadingNextQuestions(true);
    try {
      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/branching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: id,
          answer: value,
          current_visible_questions: visibleQuestions
        }),
      });
      if (!response.ok) throw new Error(`Branching API error: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data.next_questions)) {
        setVisibleQuestions(data.next_questions);
      }
    } catch (error) {
      console.error('Failed to fetch next questions:', error);
      const currentIndex = normalizedQuestions.findIndex(q => q.id === id);
      if (currentIndex !== -1 && currentIndex < normalizedQuestions.length - 1) {
        const nextId = normalizedQuestions[currentIndex + 1].id;
        setVisibleQuestions(prev => prev.includes(nextId) ? prev : [...prev, nextId]);
      }
    } finally {
      setIsLoadingNextQuestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const visibleQData = normalizedQuestions.filter(q => visibleQuestions.includes(q.id));
    const hasEmpty = visibleQData.some(q => {
      const v = formData[q.id];
      return v === '' || v === undefined || v === null;
    });
    if (hasEmpty) { alert('Please fill in all visible fields before submitting.'); return; }

    try {
      const responses: Record<string, string | number> = {};
      normalizedQuestions.forEach(q => {
        if (visibleQuestions.includes(q.id)) responses[q.id] = formData[q.id];
      });

      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/submit-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          email,
          username,
          tracking_id: trackingId,
          click_id: clickId,
          url_parameters: urlParameters
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();

      const redirect = result?.redirect || {};
      if (redirect?.should_redirect && redirect?.redirect_url) {
        const sessionContext = createSessionContext(
          result.session_id || `sess_${Date.now()}`,
          survey.id,
          clickId || username || undefined
        );
        const finalRedirectUrl = buildRedirectUrl(redirect.redirect_url, sessionContext);
        setSubmitted(true);
        const delay = redirect.delay_seconds || 3;
        setTimeout(() => { window.location.href = finalRedirectUrl; }, delay * 1000);
        return;
      }
      setSubmitted(true);
    } catch (error: unknown) {
      if (error instanceof Error) alert(`Error: ${error.message || 'Submission failed'}`);
      else alert('An unknown error occurred');
    }
  };

  /* ── Render Helpers ── */

  const renderRadioOptions = (question: Question) => (
    <div className="cf-options">
      {question.options?.map((option, i) => (
        <motion.div
          key={i}
          className={`cf-option ${formData[question.id] === option ? 'selected' : ''}`}
          onClick={() => handleChange(question.id, option)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="cf-option-key">{OPTION_KEYS[i] || i + 1}</span>
          <span className="cf-option-label">{option}</span>
        </motion.div>
      ))}
    </div>
  );

  const renderTextInput = (question: Question) => (
    <textarea
      value={formData[question.id] as string}
      onChange={(e) => handleChange(question.id, e.target.value)}
      placeholder="Type your answer here..."
      className="cf-textarea"
      rows={3}
    />
  );

  const renderScale = (question: Question) => (
    <div className="cf-scale">
      <div className="cf-scale-labels">
        <span>Not at all</span>
        <span>Extremely</span>
      </div>
      <div className="cf-scale-track">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
          <motion.button
            key={num}
            type="button"
            className={`cf-scale-point ${formData[question.id] === num ? 'active' : ''}`}
            onClick={() => handleChange(question.id, num)}
            whileTap={{ scale: 0.9 }}
          >
            {num}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderQuestion = (q: Question, idx: number) => {
    if (!visibleQuestions.includes(q.id)) return null;
    const isAnswered = formData[q.id] !== undefined && formData[q.id] !== '' && !(q.type === 'range' && formData[q.id] === 5);

    return (
      <motion.div
        key={q.id}
        className={`cf-question-block ${isAnswered ? 'answered' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="cf-question-number">
          <span className="cf-num-badge">{idx + 1}</span>
          Question {idx + 1}
        </div>
        <h3 className="cf-question-text">{q.question}</h3>
        {q.questionDescription && <p className="cf-question-desc">{q.questionDescription}</p>}
        {q.answerDescription && <div className="cf-answer-hint">{q.answerDescription}</div>}
        {q.type === 'radio' && renderRadioOptions(q)}
        {q.type === 'text' && renderTextInput(q)}
        {q.type === 'range' && renderScale(q)}
      </motion.div>
    );
  };

  /* ── Main Render ── */
  return (
    <div className="cf-survey-container">
      <div className="cf-card-wrapper">
        {/* Pin */}
        <div className="cf-pin">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path fill="#0D9488" d="M288.6 76.8C344.8 20.6 436 20.6 492.2 76.8C548.4 133 548.4 224.2 492.2 280.4L328.2 444.4C293.8 478.8 238.1 478.8 203.7 444.4C169.3 410 169.3 354.3 203.7 319.9L356.5 167.3C369 154.8 389.3 154.8 401.8 167.3C414.3 179.8 414.3 200.1 401.8 212.6L249 365.3C239.6 374.7 239.6 389.9 249 399.2C258.4 408.5 273.6 408.6 282.9 399.2L446.9 235.2C478.1 204 478.1 153.3 446.9 122.1C415.7 90.9 365 90.9 333.8 122.1L169.8 286.1C116.7 339.2 116.7 425.3 169.8 478.4C222.9 531.5 309 531.5 362.1 478.4L492.3 348.3C504.8 335.8 525.1 335.8 537.6 348.3C550.1 360.8 550.1 381.1 537.6 393.6L407.4 523.6C329.3 601.7 202.7 601.7 124.6 523.6C46.5 445.5 46.5 318.9 124.6 240.8L288.6 76.8z"/>
          </svg>
        </div>

        <div className={`cf-card ${previewMode ? 'preview-mode' : ''}`}>
          {/* Header */}
          <div className="cf-header">
            <div className="cf-brand">
              <div className="cf-brand-icon"></div>
            </div>
            <h1 className="cf-title">{survey.title || 'Customer Feedback'}</h1>
            {survey.subtitle && <p className="cf-subtitle">{survey.subtitle}</p>}
            <span className="cf-tagline">Your opinion makes a difference</span>
          </div>

          {/* Progress */}
          <div className="cf-progress">
            <div className="cf-progress-track" style={{ '--progress-width': `${progress}%` } as React.CSSProperties} />
            <span className="cf-progress-counter">{Math.round(progress)}%</span>
          </div>

          {/* Questions (scroll-based) */}
          <form onSubmit={handleSubmit}>
            <div className="cf-questions-list">
              <AnimatePresence>
                {normalizedQuestions.map((q, i) => renderQuestion(q, i))}
              </AnimatePresence>

              {isLoadingNextQuestions && (
                <div className="cf-loading">
                  <span className="cf-loading-spinner" />
                  Loading next questions...
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="cf-footer">
              <button
                type="submit"
                className="cf-btn-submit"
                disabled={submitted || isLoadingNextQuestions}
              >
                {submitted ? (
                  <><span>✓</span> Submitted</>
                ) : (
                  <><span>→</span> Submit Feedback</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Powered by */}
      <div className="cf-powered">
        Powered by <a href="#">PepperAds</a>
      </div>

      {/* Success Overlay */}
      {submitted && (
        <motion.div
          className="cf-success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="cf-success-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="cf-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted successfully. We appreciate your time and input.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default CustomerFeedbackTemplate;
