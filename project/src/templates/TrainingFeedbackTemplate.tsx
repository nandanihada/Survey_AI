import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './TrainingFeedbackTemplate.css';
import type { Survey } from '../types/Survey';
import { buildRedirectUrl, createSessionContext } from '../utils/redirectBuilder';

interface Question { id: string; question: string; questionDescription?: string; answerDescription?: string; type: 'text' | 'radio' | 'range'; options?: string[]; }
interface RawQuestion { id: string; question: string; questionDescription?: string; answerDescription?: string; type: string; options?: string[]; }
interface Props { survey: Survey; previewMode?: boolean; }

const TrainingFeedbackTemplate: React.FC<Props> = ({ survey, previewMode = false }) => {
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
      <motion.div key={q.id} className="tf-lined-area" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
        <div className="tf-q-label">📝 Question {idx + 1}</div>
        <h2 className="tf-q-text">{q.question}</h2>
        {q.questionDescription && <p className="tf-q-sub">{q.questionDescription}</p>}
        {q.type === 'radio' && (
          <div className="tf-radio-list">
            {q.options?.map((opt, i) => (
              <label key={i} className={`tf-radio-item ${formData[q.id] === opt ? 'checked' : ''}`}>
                <input type="radio" name={q.id} checked={formData[q.id] === opt} onChange={() => handleAnswer(q.id, opt)} />
                <span className="tf-radio-circle" />
                <span className="tf-radio-text">{opt}</span>
              </label>
            ))}
          </div>
        )}
        {q.type === 'text' && <textarea value={formData[q.id] as string} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Write your answer on the lines..." className="tf-lined-input" rows={4} />}
        {q.type === 'range' && (
          <div className="tf-star-row">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`tf-star ${typeof formData[q.id] === 'number' && (formData[q.id] as number) >= n ? 'filled' : ''}`} onClick={() => handleAnswer(q.id, n)}>★</button>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="tf-notebook">
      <div className="tf-spiral">
        {Array.from({ length: 12 }).map((_, i) => <div key={i} className="tf-ring" />)}
      </div>
      <div className="tf-page">
        <div className="tf-page-header">
          <div className="tf-page-brand">
            <div className="tf-page-logo"></div>
            <div>
              <h1 className="tf-page-title">{survey.title || 'Training Feedback'}</h1>
              {survey.subtitle && <p className="tf-page-sub">{survey.subtitle}</p>}
            </div>
          </div>
          <div className="tf-page-tabs">
            {normalizedQuestions.map((_, i) => (
              <div key={i} className={`tf-tab ${i === currentQuestionIndex ? 'active' : ''} ${formData[normalizedQuestions[i].id] !== '' && formData[normalizedQuestions[i].id] !== 0 ? 'done' : ''}`}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="tf-page-body">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">{normalizedQuestions.map((q, i) => renderQuestion(q, i))}</AnimatePresence>
            {!previewMode && (
              <div className="tf-page-nav">
                {currentQuestionIndex > 0 && <button type="button" className="tf-nav-btn tf-nav-back" onClick={handlePrev}>← Previous</button>}
                <div style={{ flex: 1 }} />
                {currentQuestionIndex < normalizedQuestions.length - 1
                  ? <button type="button" className="tf-nav-btn tf-nav-next" onClick={handleNext} disabled={!isCurrentAnswered}>Next →</button>
                  : <button type="submit" className="tf-nav-btn tf-nav-submit" disabled={!isCurrentAnswered}>Submit Feedback</button>}
              </div>
            )}
            {previewMode && <div className="tf-page-nav"><div style={{ flex: 1 }} /><button type="submit" className="tf-nav-btn tf-nav-submit">Submit</button></div>}
          </form>
        </div>

        <div className="tf-page-footer">Powered by PepperAds</div>
      </div>

      {submitted && (
        <motion.div className="tf-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="tf-complete" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="tf-complete-icon">🎓</div>
            <h2>Feedback Submitted!</h2>
            <p>Thank you for helping us improve our training programs.</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TrainingFeedbackTemplate;
