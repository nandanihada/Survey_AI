import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './BasicSurveyTemplate.css';
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
  }));

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const initialData: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => {
      initialData[q.id] = q.type === 'range' ? 0 : '';
    });
    return initialData;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://api.theinterwebsite.space/';

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
          total_questions: normalizedQuestions.length
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
  };

  const currentQuestion = normalizedQuestions[currentQuestionIndex];
  const isCurrentAnswered = currentQuestion
    ? formData[currentQuestion.id] !== '' && formData[currentQuestion.id] !== 0
    : false;

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < normalizedQuestions.length - 1 && isCurrentAnswered) {
      setCurrentQuestionIndex(prev => prev + 1);
      trackClickInteraction('question_navigation', {
        action: 'next',
        from_question: currentQuestionIndex + 1,
        to_question: currentQuestionIndex + 2
      });
    }
  }, [currentQuestionIndex, normalizedQuestions.length, isCurrentAnswered]);

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

    const unanswered = normalizedQuestions.find(q => {
      const val = formData[q.id];
      return val === '' || val === 0;
    });
    if (unanswered) return;

    try {
      const responses: Record<string, string | number> = {};
      normalizedQuestions.forEach(q => {
        const val = formData[q.id];
        if (val !== undefined && val !== '' && val !== 0) {
          responses[q.question] = val;
        }
      });

      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/submit-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          email,
          username,
          tracking_id: trackingId,
          click_id: clickId
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();

      const redirect = result?.redirect || {};
      const evaluation = result?.evaluation || {};

      console.log('📊 Evaluation result:', evaluation);

      if (redirect?.should_redirect && redirect?.redirect_url) {
        const sessionContext = createSessionContext(
          result.session_id || `sess_${Date.now()}`,
          survey.id,
          clickId || username || undefined
        );

        const finalRedirectUrl = buildRedirectUrl(
          redirect.redirect_url,
          sessionContext
        );

        setSubmitted(true);
        const delay = redirect?.delay_seconds || 3;
        setTimeout(() => {
          window.location.href = finalRedirectUrl;
        }, delay * 1000);
        return;
      }

      setSubmitted(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message || 'Submission failed'}`);
      } else {
        alert('Submission failed');
      }
    }
  };

  /* ── Render Helpers ── */

  const renderRadioOptions = (question: Question) => (
    <div className="pepper-options">
      {question.options?.map((option, i) => (
        <motion.div
          key={i}
          className={`pepper-option ${formData[question.id] === option ? 'selected' : ''}`}
          onClick={() => handleAnswer(question.id, option)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="pepper-option-key">{OPTION_KEYS[i] || i + 1}</span>
          <span className="pepper-option-label">{option}</span>
        </motion.div>
      ))}
    </div>
  );

  const renderTextInput = (question: Question) => (
    <textarea
      value={formData[question.id] as string}
      onChange={(e) => handleAnswer(question.id, e.target.value)}
      placeholder="Type your answer here..."
      className="pepper-textarea"
      rows={4}
    />
  );

  const renderScale = (question: Question) => (
    <div className="pepper-scale">
      <div className="pepper-scale-labels">
        <span>Not at all</span>
        <span>Extremely</span>
      </div>
      <div className="pepper-scale-track">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
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

  const renderQuestion = (question: Question, index: number) => {
    if (!previewMode && index !== currentQuestionIndex) return null;
    if (previewMode && index > 2) return null;

    return (
      <motion.div
        key={question.id}
        className="pepper-question-area pepper-animate-question"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35 }}
      >
        <div className="pepper-question-number">
          <span className="num-badge">{index + 1}</span>
          Question {index + 1} of {normalizedQuestions.length}
        </div>

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

        {question.questionDescription && (
          <p className="pepper-question-desc">{question.questionDescription}</p>
        )}

        {question.answerDescription && (
          <div className="pepper-answer-hint">{question.answerDescription}</div>
        )}

        {question.type === 'radio' && renderRadioOptions(question)}
        {question.type === 'text' && renderTextInput(question)}
        {question.type === 'range' && renderScale(question)}
      </motion.div>
    );
  };

  /* ── Main Render ── */
  return (
    <div className="pepper-survey-container">
      <div className="pepper-card-wrapper">
        {/* Pin icon - positioned at top-left corner, half on paper half outside */}
        <div className="pepper-pin">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path fill="#2D2520" d="M288.6 76.8C344.8 20.6 436 20.6 492.2 76.8C548.4 133 548.4 224.2 492.2 280.4L328.2 444.4C293.8 478.8 238.1 478.8 203.7 444.4C169.3 410 169.3 354.3 203.7 319.9L356.5 167.3C369 154.8 389.3 154.8 401.8 167.3C414.3 179.8 414.3 200.1 401.8 212.6L249 365.3C239.6 374.7 239.6 389.9 249 399.2C258.4 408.5 273.6 408.6 282.9 399.2L446.9 235.2C478.1 204 478.1 153.3 446.9 122.1C415.7 90.9 365 90.9 333.8 122.1L169.8 286.1C116.7 339.2 116.7 425.3 169.8 478.4C222.9 531.5 309 531.5 362.1 478.4L492.3 348.3C504.8 335.8 525.1 335.8 537.6 348.3C550.1 360.8 550.1 381.1 537.6 393.6L407.4 523.6C329.3 601.7 202.7 601.7 124.6 523.6C46.5 445.5 46.5 318.9 124.6 240.8L288.6 76.8z"/>
          </svg>
        </div>

        <div className={`pepper-card ${previewMode ? 'preview-mode' : ''}`}>
        {/* Header */}
        <div className="pepper-header">
          <div className="pepper-brand">
            <div className="pepper-brand-icon"></div>
          </div>
          <h1 className="pepper-title">{survey.title || 'Survey'}</h1>
          {survey.subtitle && <p className="pepper-subtitle">{survey.subtitle}</p>}
        </div>

        {/* Progress Bar */}
        <div className="pepper-progress">
          <div className="pepper-progress-track" style={{ '--progress-width': `${((currentQuestionIndex + 1) / normalizedQuestions.length) * 100}%` } as React.CSSProperties}>
          </div>
          <span className="pepper-progress-counter">
            {currentQuestionIndex + 1}/{normalizedQuestions.length}
          </span>
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {normalizedQuestions.map((q, i) => renderQuestion(q, i))}
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

              {currentQuestionIndex < normalizedQuestions.length - 1 ? (
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
          {!previewMode && isCurrentAnswered && currentQuestionIndex < normalizedQuestions.length - 1 && (
            <div className="pepper-keyboard-hint">
              Press <kbd>Enter ↵</kbd> to continue
            </div>
          )}
        </form>
      </div>
      </div>{/* close pepper-card-wrapper */}

      {/* Powered by */}
      <div className="pepper-powered">
        Powered by <a href="#">PepperAds</a>
      </div>

      {/* Success Overlay */}
      {submitted && (
        <motion.div
          className="pepper-success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="pepper-success-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="pepper-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Thank you!</h2>
            <p>Your responses have been recorded successfully. We appreciate your time and feedback.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default BasicSurveyTemplate;
