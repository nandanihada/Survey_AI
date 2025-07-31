import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './CustomerFeedbackTemplate.css';
import type { Survey } from '../types/Survey';

interface Question {
  id: string;
  question: string;
  type: 'text' | 'radio' | 'range';
  options?: string[];
}

interface RawQuestion {
  id: string;
  question: string;
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
    : 'https://pepper-flask-app.onrender.com';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUsername(params.get('username'));
    setEmail(params.get('email'));

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
    const unanswered = visibleQuestionsData.find(q => {
      const val = formData[q.id];
      return val === '' || (q.type === 'range' && val === 5);
    });
    if (unanswered) return alert('Please answer all visible questions before submitting.');

    try {
      const responses: Record<string, string | number> = {};
      // Only include responses from visible questions that have been answered
      visibleQuestionsData.forEach(q => {
        const val = formData[q.id];
        if (val !== undefined && val !== '' && !(q.type === 'range' && val === 5)) {
          responses[q.question] = val;
        }
      });

      const response = await fetch(`${apiBaseUrl}/survey/${survey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, email, username, tracking_id: trackingId }),
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      setSubmitted(true);
      alert(`Submitted! ID: ${result.response_id}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message || 'Submission failed'}`);
      } else {
        alert('Submission failed');
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
          </motion.h5>

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
            <p>Your feedback has been submitted successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerFeedbackTemplate;
