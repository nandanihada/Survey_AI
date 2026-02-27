import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './ServiceCancellationTemplate.css';
import type { Survey } from '../types/Survey';
import { buildRedirectUrl, createSessionContext } from '../utils/redirectBuilder';
import { getQuestionVariants, getAnswerVariants } from '../utils/animationConfig';

interface Question { id: string; question: string; questionDescription?: string; answerDescription?: string; type: 'text' | 'radio' | 'range'; options?: string[]; }
interface RawQuestion { id: string; question: string; questionDescription?: string; answerDescription?: string; type: string; options?: string[]; }
interface Props { survey: Survey; previewMode?: boolean; }

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

  const qVariants = getQuestionVariants(survey.animation);

  const renderQuestion = (q: Question, idx: number) => {
    if (!previewMode && idx !== currentQuestionIndex) return null;
    if (previewMode && idx > 2) return null;
    return (
      <div key={q.id} className="sc-q-wrap">
        {!previewMode ? (
          <motion.h2 className="sc-q-title" variants={qVariants} initial="initial" animate="animate" exit="exit">{q.question}</motion.h2>
        ) : (
          <h2 className="sc-q-title">{q.question}</h2>
        )}
        {q.questionDescription && <p className="sc-q-desc">{q.questionDescription}</p>}
        {q.type === 'radio' && (
          <div className="sc-card-options">
            {q.options?.map((opt, i) => {
              const aVariants = getAnswerVariants(survey.animation, i);
              return (
              <button key={i} type="button" className={`sc-card-opt ${formData[q.id] === opt ? 'selected' : ''}`} onClick={() => handleAnswer(q.id, opt)}>
                <div className="sc-card-icon">{['😔','😐','🤔','😊','🎯','💡','⭐','🔥','💪','🚀'][i] || '📌'}</div>
                {!previewMode ? (
                  <motion.span variants={aVariants} initial="initial" animate="animate">{opt}</motion.span>
                ) : (
                  <span>{opt}</span>
                )}
              </button>
              );
            })}
          </div>
        )}
        {q.type === 'text' && <textarea value={formData[q.id] as string} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Tell us more..." className="sc-text-area" rows={4} />}
        {q.type === 'range' && (
          <div className="sc-bar-scale">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <div key={n} className="sc-bar-col">
                <motion.div className={`sc-bar ${typeof formData[q.id] === 'number' && (formData[q.id] as number) >= n ? 'filled' : ''}`} style={{ height: `${n * 10}%` }} onClick={() => handleAnswer(q.id, n)} whileHover={{ scale: 1.1 }} />
                <span className="sc-bar-num">{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sc-dark-container">
      <div className="sc-top-bar">
        <div className="sc-top-brand">
          <div className="sc-top-logo"></div>
          <span>PepperAds</span>
        </div>
        <div className="sc-top-counter">{currentQuestionIndex + 1} / {normalizedQuestions.length}</div>
      </div>

      <div className="sc-center">
        <div className="sc-glass-card">
          <div className="sc-card-head">
            <div className="sc-emoji-icon">💬</div>
            <h1 className="sc-card-title">{survey.title || 'Service Cancellation'}</h1>
            {survey.subtitle && <p className="sc-card-sub">{survey.subtitle}</p>}
          </div>

          <div className="sc-progress-dots">
            {normalizedQuestions.map((_, i) => (
              <div key={i} className={`sc-pdot ${i === currentQuestionIndex ? 'active' : ''} ${formData[normalizedQuestions[i].id] !== '' && formData[normalizedQuestions[i].id] !== 0 ? 'done' : ''}`} />
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">{normalizedQuestions.map((q, i) => renderQuestion(q, i))}</AnimatePresence>
            {!previewMode && (
              <div className="sc-actions">
                {currentQuestionIndex > 0 && <button type="button" className="sc-act-btn sc-act-back" onClick={handlePrev}>← Back</button>}
                <div style={{ flex: 1 }} />
                {currentQuestionIndex < normalizedQuestions.length - 1
                  ? <button type="button" className="sc-act-btn sc-act-next" onClick={handleNext} disabled={!isCurrentAnswered}>Next →</button>
                  : <button type="submit" className="sc-act-btn sc-act-submit" disabled={!isCurrentAnswered}>Submit Feedback</button>}
              </div>
            )}
            {previewMode && <div className="sc-actions"><div style={{ flex: 1 }} /><button type="submit" className="sc-act-btn sc-act-submit">Submit</button></div>}
          </form>
        </div>
      </div>

      <div className="sc-bottom">Powered by PepperAds</div>

      {submitted && (
        <motion.div className="sc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="sc-done-card" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="sc-done-emoji">🙏</div>
            <h2>We're sorry to see you go</h2>
            <p>Your feedback has been recorded and will help us improve.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ServiceCancellationTemplate;
