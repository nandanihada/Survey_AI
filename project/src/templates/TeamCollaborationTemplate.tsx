import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './TeamCollaborationTemplate.css';
import type { Survey } from '../types/Survey';
import { buildRedirectUrl, createSessionContext } from '../utils/redirectBuilder';

interface Question { id: string; question: string; questionDescription?: string; answerDescription?: string; type: 'text' | 'radio' | 'range'; options?: string[]; }
interface RawQuestion { id: string; question: string; questionDescription?: string; answerDescription?: string; type: string; options?: string[]; }
interface Props { survey: Survey; previewMode?: boolean; }

const TeamCollaborationTemplate: React.FC<Props> = ({ survey, previewMode = false }) => {
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
      <motion.div key={q.id} className="tc-question-content" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
        <h2 className="tc-q-text">{q.question}</h2>
        {q.questionDescription && <p className="tc-q-desc">{q.questionDescription}</p>}
        {q.type === 'radio' && (
          <div className="tc-grid-options">
            {q.options?.map((opt, i) => (
              <motion.button key={i} type="button" className={`tc-grid-opt ${formData[q.id] === opt ? 'active' : ''}`} onClick={() => handleAnswer(q.id, opt)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <span className="tc-opt-num">{i + 1}</span>
                <span>{opt}</span>
              </motion.button>
            ))}
          </div>
        )}
        {q.type === 'text' && <textarea value={formData[q.id] as string} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Share your thoughts..." className="tc-input" rows={4} />}
        {q.type === 'range' && (
          <div className="tc-emoji-scale">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`tc-emoji-btn ${formData[q.id] === n ? 'active' : ''}`} onClick={() => handleAnswer(q.id, n)}>{n}</button>
            ))}
            <div className="tc-scale-ends"><span>Low</span><span>High</span></div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="tc-layout">
      {/* Left sidebar with steps */}
      <aside className="tc-sidebar">
        <div className="tc-sidebar-brand">
          <div className="tc-logo"></div>
          <span>PepperAds</span>
        </div>
        <h1 className="tc-sidebar-title">{survey.title || 'Team Collaboration'}</h1>
        {survey.subtitle && <p className="tc-sidebar-sub">{survey.subtitle}</p>}
        <div className="tc-steps">
          {normalizedQuestions.map((q, i) => (
            <div key={q.id} className={`tc-step ${i === currentQuestionIndex ? 'current' : ''} ${formData[q.id] !== '' && formData[q.id] !== 0 ? 'done' : ''}`}>
              <div className="tc-step-dot">{formData[q.id] !== '' && formData[q.id] !== 0 ? '✓' : i + 1}</div>
              <span className="tc-step-label">Q{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="tc-sidebar-footer">Step {currentQuestionIndex + 1} of {normalizedQuestions.length}</div>
      </aside>

      {/* Right content area */}
      <main className="tc-main">
        <div className="tc-main-inner">
          <div className="tc-step-indicator">
            <span className="tc-step-tag">Question {currentQuestionIndex + 1}</span>
          </div>
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">{normalizedQuestions.map((q, i) => renderQuestion(q, i))}</AnimatePresence>
            {!previewMode && (
              <div className="tc-nav">
                {currentQuestionIndex > 0 && <button type="button" className="tc-nav-btn tc-back" onClick={handlePrev}>← Previous</button>}
                <div className="tc-nav-spacer" />
                {currentQuestionIndex < normalizedQuestions.length - 1
                  ? <button type="button" className="tc-nav-btn tc-next" onClick={handleNext} disabled={!isCurrentAnswered}>Continue →</button>
                  : <button type="submit" className="tc-nav-btn tc-submit" disabled={!isCurrentAnswered}>Submit Survey</button>}
              </div>
            )}
            {previewMode && <div className="tc-nav"><div className="tc-nav-spacer" /><button type="submit" className="tc-nav-btn tc-submit">Submit</button></div>}
          </form>
        </div>
      </main>

      {submitted && (
        <motion.div className="tc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="tc-done-card" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="tc-done-icon">✓</div>
            <h2>All done!</h2>
            <p>Your team feedback has been submitted successfully.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TeamCollaborationTemplate;
