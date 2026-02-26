import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './OnboardingReviewTemplate.css';
import type { Survey } from '../types/Survey';
import { buildRedirectUrl, createSessionContext } from '../utils/redirectBuilder';

interface Question { id: string; question: string; questionDescription?: string; answerDescription?: string; type: 'text' | 'radio' | 'range'; options?: string[]; }
interface RawQuestion { id: string; question: string; questionDescription?: string; answerDescription?: string; type: string; options?: string[]; }
interface Props { survey: Survey; previewMode?: boolean; }

const OnboardingReviewTemplate: React.FC<Props> = ({ survey, previewMode = false }) => {
  const location = useLocation();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [clickId, setClickId] = useState<string | null>(null);

  const normalizeType = (type: string): 'text' | 'radio' | 'range' => {
    switch (type) {
      case 'multiple_choice': case 'yes_no': return 'radio';
      case 'short_answer': return 'text';
      case 'rating': case 'opinion_scale': case 'scale': return 'range';
      default: return 'text';
    }
  };

  const normalizedQuestions: Question[] = (survey.questions || []).map((q: RawQuestion, i) => ({
    id: q.id || `q${i}`, question: q.question, questionDescription: q.questionDescription,
    answerDescription: q.answerDescription, type: normalizeType(q.type), options: q.options || [],
  }));

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const d: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => { d[q.id] = q.type === 'range' ? 0 : ''; });
    return d;
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUsername(params.get('username'));
    setEmail(params.get('email'));
    let cid = params.get('click_id');
    if (!cid) cid = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setClickId(cid);
    if (params.get('username') && params.get('email') && survey.id) {
      fetch(`${apiBaseUrl}/survey/${survey.id}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: params.get('username'), email: params.get('email') }) })
        .then(r => r.json()).then(d => d.tracking_id && setTrackingId(d.tracking_id)).catch(() => {});
    }
  }, [location.search, survey.id]);

  const handleAnswer = (id: string, value: string | number) => { setFormData(prev => ({ ...prev, [id]: value })); };
  const currentQuestion = normalizedQuestions[currentQuestionIndex];
  const isCurrentAnswered = currentQuestion ? formData[currentQuestion.id] !== '' && formData[currentQuestion.id] !== 0 : false;

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < normalizedQuestions.length - 1 && isCurrentAnswered) setCurrentQuestionIndex(p => p + 1);
  }, [currentQuestionIndex, normalizedQuestions.length, isCurrentAnswered]);
  const handlePrev = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(p => p - 1); };

  useEffect(() => {
    if (previewMode) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' && isCurrentAnswered) { e.preventDefault(); handleNext(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleNext, isCurrentAnswered, previewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (normalizedQuestions.find(q => formData[q.id] === '' || formData[q.id] === 0)) return;
    try {
      const responses: Record<string, string | number> = {};
      normalizedQuestions.forEach(q => { const v = formData[q.id]; if (v !== undefined && v !== '' && v !== 0) responses[q.question] = v; });
      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/submit-enhanced`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ responses, email, username, tracking_id: trackingId, click_id: clickId }) });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      const redirect = result?.redirect || {};
      if (redirect?.should_redirect && redirect?.redirect_url) {
        const sc = createSessionContext(result.session_id || `sess_${Date.now()}`, survey.id, clickId || username || undefined);
        const url = buildRedirectUrl(redirect.redirect_url, sc);
        setSubmitted(true);
        setTimeout(() => { window.location.href = url; }, (redirect.delay_seconds || 3) * 1000);
        return;
      }
      setSubmitted(true);
    } catch (error: unknown) { alert(error instanceof Error ? error.message : 'Submission failed'); }
  };

  const renderQuestion = (q: Question, idx: number) => {
    if (!previewMode && idx !== currentQuestionIndex) return null;
    if (previewMode && idx > 2) return null;
    return (
      <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
        {/* Bot message bubble */}
        <div className="or-bubble or-bot">
          <div className="or-avatar">🤖</div>
          <div className="or-msg">
            <p className="or-msg-text">{q.question}</p>
            {q.questionDescription && <p className="or-msg-sub">{q.questionDescription}</p>}
          </div>
        </div>
        {/* User response area */}
        <div className="or-bubble or-user">
          <div className="or-response-area">
            {q.type === 'radio' && (
              <div className="or-chips">
                {q.options?.map((opt, i) => (
                  <motion.button key={i} type="button" className={`or-chip ${formData[q.id] === opt ? 'picked' : ''}`} onClick={() => handleAnswer(q.id, opt)} whileTap={{ scale: 0.95 }}>{opt}</motion.button>
                ))}
              </div>
            )}
            {q.type === 'text' && (
              <div className="or-text-wrap">
                <textarea value={formData[q.id] as string} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Type your reply..." className="or-reply-input" rows={3} />
              </div>
            )}
            {q.type === 'range' && (
              <div className="or-rating-row">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button key={n} type="button" className={`or-rate-dot ${formData[q.id] === n ? 'lit' : ''} ${typeof formData[q.id] === 'number' && (formData[q.id] as number) >= n ? 'filled' : ''}`} onClick={() => handleAnswer(q.id, n)}>{n}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="or-chat-container">
      <div className="or-chat-header">
        <div className="or-chat-brand">
          <div className="or-chat-logo"></div>
          <div>
            <h1 className="or-chat-title">{survey.title || 'Onboarding Review'}</h1>
            {survey.subtitle && <p className="or-chat-sub">{survey.subtitle}</p>}
          </div>
        </div>
        <div className="or-chat-progress">
          <div className="or-chat-bar">
            <div className="or-chat-bar-fill" style={{ width: `${((currentQuestionIndex + 1) / normalizedQuestions.length) * 100}%` }} />
          </div>
          <span className="or-chat-count">{currentQuestionIndex + 1}/{normalizedQuestions.length}</span>
        </div>
      </div>

      <div className="or-chat-body">
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">{normalizedQuestions.map((q, i) => renderQuestion(q, i))}</AnimatePresence>
          {!previewMode && (
            <div className="or-chat-actions">
              {currentQuestionIndex > 0 && <button type="button" className="or-action-btn or-action-back" onClick={handlePrev}>← Back</button>}
              <div style={{ flex: 1 }} />
              {currentQuestionIndex < normalizedQuestions.length - 1
                ? <button type="button" className="or-action-btn or-action-send" onClick={handleNext} disabled={!isCurrentAnswered}>Send →</button>
                : <button type="submit" className="or-action-btn or-action-finish" disabled={!isCurrentAnswered}>Complete ✓</button>}
            </div>
          )}
          {previewMode && <div className="or-chat-actions"><div style={{ flex: 1 }} /><button type="submit" className="or-action-btn or-action-finish">Complete ✓</button></div>}
        </form>
      </div>

      <div className="or-chat-footer">Powered by PepperAds</div>

      {submitted && (
        <motion.div className="or-success-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="or-success-bubble" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="or-success-emoji">🎉</div>
            <h2>Welcome aboard!</h2>
            <p>Your onboarding feedback has been recorded. Thank you!</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default OnboardingReviewTemplate;
