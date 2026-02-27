import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './WebsiteExperienceTemplate.css';
import type { Survey } from '../types/Survey';
import { buildRedirectUrl, createSessionContext } from '../utils/redirectBuilder';
import { getQuestionVariants, getAnswerVariants } from '../utils/animationConfig';

interface Question { id: string; question: string; questionDescription?: string; answerDescription?: string; type: 'text' | 'radio' | 'range'; options?: string[]; }
interface RawQuestion { id: string; question: string; questionDescription?: string; answerDescription?: string; type: string; options?: string[]; }
interface Props { survey: Survey; previewMode?: boolean; }

const WebsiteExperienceTemplate: React.FC<Props> = ({ survey, previewMode = false }) => {
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
      <div key={q.id} className="we-q-block">
        {!previewMode ? (
          <motion.h2 className="we-q-title" variants={qVariants} initial="initial" animate="animate" exit="exit">{q.question}</motion.h2>
        ) : (
          <h2 className="we-q-title">{q.question}</h2>
        )}
        {q.questionDescription && <p className="we-q-hint">{q.questionDescription}</p>}
        {q.type === 'radio' && (
          <div className="we-pill-options">
            {q.options?.map((opt, i) => {
              const aVariants = getAnswerVariants(survey.animation, i);
              return (
              <button key={i} type="button" className={`we-pill ${formData[q.id] === opt ? 'on' : ''}`} onClick={() => handleAnswer(q.id, opt)}>
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
        {q.type === 'text' && <input type="text" value={formData[q.id] as string} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Your answer..." className="we-text-input" />}
        {q.type === 'range' && (
          <div className="we-slider-wrap">
            <input type="range" min="1" max="10" value={formData[q.id] as number || 1} onChange={e => handleAnswer(q.id, parseInt(e.target.value))} className="we-range-slider" />
            <div className="we-range-labels"><span>1</span><span className="we-range-val">{formData[q.id] || 0}</span><span>10</span></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="we-fullscreen">
      <div className="we-hero-band">
        <div className="we-hero-content">
          <div className="we-hero-logo"></div>
          <h1>{survey.title || 'Website Experience'}</h1>
          {survey.subtitle && <p>{survey.subtitle}</p>}
        </div>
        <div className="we-hero-dots">
          {normalizedQuestions.map((_, i) => (
            <div key={i} className={`we-dot ${i === currentQuestionIndex ? 'active' : ''} ${formData[normalizedQuestions[i].id] !== '' && formData[normalizedQuestions[i].id] !== 0 ? 'done' : ''}`} />
          ))}
        </div>
      </div>

      <div className="we-body">
        <form onSubmit={handleSubmit} className="we-form-card">
          <div className="we-counter">Question {currentQuestionIndex + 1} of {normalizedQuestions.length}</div>
          <AnimatePresence mode="wait">{normalizedQuestions.map((q, i) => renderQuestion(q, i))}</AnimatePresence>
          {!previewMode && (
            <div className="we-btns">
              {currentQuestionIndex > 0 && <button type="button" className="we-btn we-btn-prev" onClick={handlePrev}>Back</button>}
              <div style={{ flex: 1 }} />
              {currentQuestionIndex < normalizedQuestions.length - 1
                ? <button type="button" className="we-btn we-btn-go" onClick={handleNext} disabled={!isCurrentAnswered}>Next</button>
                : <button type="submit" className="we-btn we-btn-done" disabled={!isCurrentAnswered}>Submit</button>}
            </div>
          )}
          {previewMode && <div className="we-btns"><div style={{ flex: 1 }} /><button type="submit" className="we-btn we-btn-done">Submit</button></div>}
        </form>
      </div>

      <div className="we-foot">Powered by PepperAds</div>

      {submitted && (
        <motion.div className="we-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="we-done" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="we-done-check">✓</div>
            <h2>Thank you!</h2>
            <p>Your feedback helps us improve the experience.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default WebsiteExperienceTemplate;
