import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './CustomerFeedbackTemplate.css';
import type { Survey } from '../types/Survey';

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

const QUESTION_FADE_DURATION = 0.6;

const CustomerFeedbackTemplate: React.FC<Props> = ({
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
  
  console.log('CustomerFeedbackTemplate - Survey data:', survey);
  console.log('CustomerFeedbackTemplate - Raw questions:', survey.questions);
  console.log('CustomerFeedbackTemplate - Normalized questions:', normalizedQuestions);
  console.log('CustomerFeedbackTemplate - Preview mode:', previewMode);

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const initialData: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => {
      initialData[q.id] = q.type === 'range' ? 5 : '';
    });
    return initialData;
  });

  const [progress, setProgress] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(previewMode ? normalizedQuestions.length : 2);
  const [visibleQuestions, setVisibleQuestions] = useState<string[]>(() => {
    // Initially show first question or all questions in preview mode
    return previewMode ? normalizedQuestions.map(q => q.id) : normalizedQuestions.length > 0 ? [normalizedQuestions[0].id] : [];
  });
  const [isLoadingNextQuestions, setIsLoadingNextQuestions] = useState<boolean>(false);
  
  // Dynamic API URL detection
  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://hostslice.onrender.com/';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUsername(params.get('username'));
    setEmail(params.get('email'));
    
    // Auto-generate click_id if not provided
    let extractedClickId = params.get('click_id');
    if (!extractedClickId) {
      extractedClickId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🎯 Auto-generated click_id:', extractedClickId);
    }
    setClickId(extractedClickId);
    
    console.log('🔍 URL Parameters extracted:', {
      username: params.get('username'),
      email: params.get('email'),
      click_id: extractedClickId
    });

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
  }, [location.search, survey.id]);

  useEffect(() => {
    let completed = 0;
    const visibleQuestionsData = normalizedQuestions.filter(q => visibleQuestions.includes(q.id));
    
    visibleQuestionsData.forEach((q) => {
      const val = formData[q.id];
      if (val !== undefined && val !== '' && !(q.type === 'range' && val === 5)) {
        completed++;
      }
    });
    
    // Calculate progress based on visible questions only
    const totalVisible = visibleQuestionsData.length;
    setProgress(totalVisible > 0 ? (completed / totalVisible) * 100 : 0);
  }, [formData, normalizedQuestions, visibleQuestions]);

  const handleChange = async (id: string, value: string | number) => {
    // Update form data first
    setFormData(prev => ({ ...prev, [id]: value }));
    
    // Skip branching logic in preview mode
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
      
      if (!response.ok) {
        throw new Error(`Branching API error: ${response.status}`);
      }
      
      const data = await response.json();
      const { next_questions } = data;
      
      if (Array.isArray(next_questions)) {
        setVisibleQuestions(next_questions);
        console.log(`Branching: Showing ${next_questions.length} questions based on answer '${value}'`);
      } else {
        console.warn('Invalid branching response:', data);
      }
    } catch (error) {
      console.error('Failed to fetch next questions:', error);
      // Fallback: show next question in sequence
      const currentIndex = normalizedQuestions.findIndex(q => q.id === id);
      if (currentIndex !== -1 && currentIndex < normalizedQuestions.length - 1) {
        const nextQuestionId = normalizedQuestions[currentIndex + 1].id;
        setVisibleQuestions(prev => [...prev, nextQuestionId]);
      }
    } finally {
      setIsLoadingNextQuestions(false);
    }
  };

  const handleEditQuestionText = (index: number, newText: string) => {
    const updated = { ...survey };
    if (updated.questions[index]) {
      updated.questions[index].question = newText;
      onSurveyChange?.(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only check visible questions for completion
    const visibleQuestionsData = normalizedQuestions.filter(q => visibleQuestions.includes(q.id));
    const hasEmptyFields = visibleQuestionsData.some(q => {
      const value = formData[q.id];
      return value === '' || value === undefined || value === null;
    });

    if (hasEmptyFields) {
      alert('Please fill in all visible fields before submitting.');
      return;
    }

    try {
      const responses: Record<string, string | number> = {};
      normalizedQuestions.forEach(q => {
        if (visibleQuestions.includes(q.id)) {
          responses[q.id] = formData[q.id];
        }
      });

      console.log('🚀 Submitting survey responses:', responses);
      console.log('📋 Survey ID:', survey.id);
      console.log('👤 User info:', { username, email, trackingId, clickId });

      // Try enhanced endpoint first, fallback to regular endpoint
      let response;
      let result;
      
      // Always use enhanced endpoint for pass/fail functionality
      response = await fetch(`${apiBaseUrl}/survey/${survey.id}/submit-enhanced`, {
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Enhanced endpoint failed:', errorText);
        throw new Error(`Enhanced submission failed: ${errorText}`);
      }
      
      result = await response.json();
      console.log('✅ Enhanced submission successful:', result);

      // Handle redirection logic
      const redirect = result?.redirect || {};
      const evaluation = result?.evaluation || {};
      
      console.log('📊 Evaluation result:', evaluation);
      console.log('🔗 Redirect info:', redirect);
      console.log('🔍 Should redirect?', redirect?.should_redirect);
      console.log('🔍 Redirect URL?', redirect?.redirect_url);
      
      if (redirect?.should_redirect && redirect?.redirect_url) {
        console.log('🚀 Redirecting to:', redirect.redirect_url);
        
        // Show success message briefly before redirect
        setSubmitted(true);
        
        // Add delay if specified
        const delay = redirect.delay_seconds || 3;
        console.log(`⏱️ Redirecting in ${delay} seconds...`);
        
        setTimeout(() => {
          console.log('🔄 Executing redirect now...');
          window.location.href = redirect.redirect_url;
        }, delay * 1000);
        
        return;
      }
      
      // No redirect - show success message
      console.log('ℹ️ No redirect - showing success message');
      setSubmitted(true);
      
    } catch (error: unknown) {
      console.error('❌ Survey submission error:', error);
      if (error instanceof Error) {
        alert(`Error: ${error.message || 'Submission failed'}`);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  const renderQuestion = (q: Question, idx: number) => {
    // Check if this question should be visible based on branching logic
    if (!visibleQuestions.includes(q.id)) return null;

    // Check if question is answered
    const isAnswered = formData[q.id] !== undefined && formData[q.id] !== '' && !(q.type === 'range' && formData[q.id] === 5);

    return (
      <AnimatePresence key={q.id}>
        <motion.div
          className={`question-block ${isAnswered ? 'answered' : ''}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <motion.h5
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: QUESTION_FADE_DURATION }}
            className="question-title"
            style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <span className="question-icon" style={{ marginRight: '10px' }}>
              <img src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png" alt="Chilli" style={{ width: 24, height: 24 }} />
            </span>

            {editMode ? (
              <input
                type="text"
                value={q.question}
                onChange={(e) => handleEditQuestionText(idx, e.target.value)}
                className="text-white font-semibold text-lg bg-transparent border-b border-white focus:outline-none"
              />
            ) : (
              <span style={{ fontWeight: 600, color: '#fff' }}>{q.question}</span>
            )}
            {q.questionDescription && (
              <p style={{ fontSize: '0.9rem', color: '#d1fae5', marginTop: '0.5rem' }}>{q.questionDescription}</p>
            )}
          </motion.h5>

          {q.answerDescription && (
            <p style={{ fontSize: '0.8rem', color: '#93c5fd', marginBottom: '0.5rem' }}>{q.answerDescription}</p>
          )}

          {q.type === 'range' && (
            <>
              <div className="range-labels"><span>0</span><span>10</span></div>
              <input type="range" min="0" max="10" value={formData[q.id] as number} onChange={(e) => handleChange(q.id, Number(e.target.value))} className="form-range" />
              <div className="text-center mt-2"><span style={{ color: '#fff', fontWeight: 600 }}>{formData[q.id]}</span></div>
            </>
          )}

          {q.type === 'text' && (
            <textarea
              name={q.id}
              className="form-control"
              rows={3}
              placeholder="Your answer..."
              value={formData[q.id] as string}
              onChange={(e) => handleChange(q.id, e.target.value)}
              required
            />
          )}

          {q.type === 'radio' && q.options && (
            <div className="radio-group">
              {q.options.map((opt, i) => (
                <div className="form-check" key={i}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={formData[q.id] === opt}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    id={`${q.id}-${i}`}
                    required
                  />
                  <label className="form-check-label" htmlFor={`${q.id}-${i}`}>{opt}</label>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="container-wrapper">
      <div className={`survey-card ${previewMode ? 'no-glass no-blur full-opacity' : ''}`}>
        <div className="survey-header">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <i className="bi bi-stars"></i> {survey.title || 'Customer Feedback'}
          </motion.h1>
          <motion.p className="survey-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            {survey.subtitle || 'Please answer the following questions'}
          </motion.p>
          <motion.p className="survey-tagline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
            style={{ color: '#d1fae5', fontSize: '1.05rem', marginTop: '12px', fontWeight: 500 }}>
            ✨ Your opinion makes a difference ✨
          </motion.p>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          {normalizedQuestions.map((q, idx) => renderQuestion(q, idx))}
          
          {isLoadingNextQuestions && (
            <div className="loading-indicator" style={{ textAlign: 'center', padding: '20px', color: '#4ade80' }}>
              <i className="bi bi-arrow-clockwise spin"></i> Loading next questions...
            </div>
          )}
          
          <button type="submit" className="submit-btn" disabled={submitted || isLoadingNextQuestions}>
            {submitted ? (<><i className="bi bi-check-circle"></i> Submitted!</>) : (<><i className="bi bi-send"></i> Submit Feedback</>)}
          </button>
        </form>
      </div>

      {submitted && (
        <div className="success-animation show">
          <div className="success-content">
            <i className="bi bi-check-circle" style={{ fontSize: '4rem', color: '#4ade80', marginBottom: '20px' }}></i>
            <h3>Thank You!</h3>
            <p>Your feedback has been submitted successfully. Someone will contact you shortly from our team.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerFeedbackTemplate;
