import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './ServiceCancellationTemplate.css';
import type { Survey } from '../types/Survey';
import { buildRedirectUrl, createSessionContext } from '../utils/redirectBuilder';

interface Question { id: string; question: string; questionDescription?: string; answerDescription?: string; type: 'text' | 'radio' | 'range'; options?: string[]; }
interface RawQuestion { id: string; question: string; questionDescription?: string; answerDescription?: string; type: string; options?: string[]; }
interface Props { survey: Survey; previewMode?: boolean; }

const OPTION_KEYS = ['A','B','C','D','E','F','G','H','I','J'];

const ServiceCancellationTemplate: React.FC<Props> = ({ survey, previewMode = false }) => {
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
  const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com/';

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

  const renderRadio = (q: Question) => (
    <div className="sc-options">
      {q.options?.map((opt, i) => (
        <motion.div key={i} className={`sc-option ${formData[q.id] === opt ? 'selected' : ''}`} onClick={() => handleAnswer(q.id, opt)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileTap={{ scale: 0.98 }}>
          <span className="sc-option-key">{OPTION_KEYS[i] || i + 1}</span>
          <span className="sc-option-label">{opt}</span>
        </motion.div>
      ))}
    </div>
  );

  const renderText = (q: Question) => (<textarea value={formData[q.id] as string} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Type your answer here..." className="sc-textarea" rows={4} />);

  const renderScale = (q: Question) => (
    <div className="sc-scale">
      <div className="sc-scale-labels"><span>Not at all</span><span>Extremely</span></div>
      <div className="sc-scale-track">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <motion.button key={n} type="button" className={`sc-scale-point ${formData[q.id] === n ? 'active' : ''}`} onClick={() => handleAnswer(q.id, n)} whileTap={{ scale: 0.9 }}>{n}</motion.button>
        ))}
      </div>
    </div>
  );

  const renderQuestion = (q: Question, idx: number) => {
    if (!previewMode && idx !== currentQuestionIndex) return null;
    if (previewMode && idx > 2) return null;
    return (
      <motion.div key={q.id} className="sc-question-area" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
        <div className="sc-question-number"><span className="sc-num-badge">{idx + 1}</span> Question {idx + 1} of {normalizedQuestions.length}</div>
        <h2 className="sc-question-text">{q.question}</h2>
        {q.questionDescription && <p className="sc-question-desc">{q.questionDescription}</p>}
        {q.answerDescription && <div className="sc-answer-hint">{q.answerDescription}</div>}
        {q.type === 'radio' && renderRadio(q)}
        {q.type === 'text' && renderText(q)}
        {q.type === 'range' && renderScale(q)}
      </motion.div>
    );
  };

  return (
    <div className="chat-cancellation-container">
      <div className="sc-card-wrapper">
        <div className="sc-pin"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="#2D2520" d="M288.6 76.8C344.8 20.6 436 20.6 492.2 76.8C548.4 133 548.4 224.2 492.2 280.4L328.2 444.4C293.8 478.8 238.1 478.8 203.7 444.4C169.3 410 169.3 354.3 203.7 319.9L356.5 167.3C369 154.8 389.3 154.8 401.8 167.3C414.3 179.8 414.3 200.1 401.8 212.6L249 365.3C239.6 374.7 239.6 389.9 249 399.2C258.4 408.5 273.6 408.6 282.9 399.2L446.9 235.2C478.1 204 478.1 153.3 446.9 122.1C415.7 90.9 365 90.9 333.8 122.1L169.8 286.1C116.7 339.2 116.7 425.3 169.8 478.4C222.9 531.5 309 531.5 362.1 478.4L492.3 348.3C504.8 335.8 525.1 335.8 537.6 348.3C550.1 360.8 550.1 381.1 537.6 393.6L407.4 523.6C329.3 601.7 202.7 601.7 124.6 523.6C46.5 445.5 46.5 318.9 124.6 240.8L288.6 76.8z"/></svg></div>
        <div className="sc-card">
          <div className="sc-header">
            <div className="sc-brand"><div className="sc-brand-icon"></div></div>
            <h1 className="sc-title">{survey.title || 'Service Cancellation'}</h1>
            {survey.subtitle && <p className="sc-subtitle">{survey.subtitle}</p>}
          </div>
          <div className="sc-progress">
            <div className="sc-progress-track" style={{ '--progress-width': `${((currentQuestionIndex + 1) / normalizedQuestions.length) * 100}%` } as React.CSSProperties} />
            <span className="sc-progress-counter">{currentQuestionIndex + 1}/{normalizedQuestions.length}</span>
          </div>
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">{normalizedQuestions.map((q, i) => renderQuestion(q, i))}</AnimatePresence>
            {!previewMode && (
              <div className="sc-footer">
                {currentQuestionIndex > 0 ? <button type="button" className="sc-btn sc-btn-back" onClick={handlePrev}>← Back</button> : <div />}
                {currentQuestionIndex < normalizedQuestions.length - 1 ? <button type="button" className="sc-btn sc-btn-next" onClick={handleNext} disabled={!isCurrentAnswered}>Next →</button> : <button type="submit" className="sc-btn sc-btn-submit" disabled={!isCurrentAnswered}>Submit</button>}
              </div>
            )}
            {previewMode && <div className="sc-footer"><div /><button type="submit" className="sc-btn sc-btn-submit">Submit</button></div>}
            {!previewMode && isCurrentAnswered && currentQuestionIndex < normalizedQuestions.length - 1 && <div className="sc-keyboard-hint">Press <kbd>Enter ↵</kbd> to continue</div>}
          </form>
        </div>
      </div>
      <div className="sc-powered">Powered by <a href="#">PepperAds</a></div>
      {submitted && (
        <motion.div className="sc-success-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="sc-success-card" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="sc-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
            <h2>Thank you!</h2><p>Your responses have been recorded. We appreciate your time.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ServiceCancellationTemplate;
