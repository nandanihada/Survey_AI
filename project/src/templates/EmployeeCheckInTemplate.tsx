import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './EmployeeCheckInTemplate.css';
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

const EmployeeCheckInTemplate: React.FC<Props> = ({
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

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const initialData: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => {
      initialData[q.id] = q.type === 'range' ? 5 : '';
    });
    return initialData;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);

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
    const answeredCount = Object.values(formData).filter(val => val !== '' && val !== 5).length;
    setProgress((answeredCount / normalizedQuestions.length) * 100);
  }, [formData, normalizedQuestions.length]);

  const handleAnswer = (id: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < normalizedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const unanswered = normalizedQuestions.find(q => {
      const val = formData[q.id];
      return val === '' || (q.type === 'range' && val === 5);
    });
    if (unanswered) return;

    try {
      const responses: Record<string, string | number> = {};
      normalizedQuestions.forEach(q => {
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message || 'Submission failed'}`);
      } else {
        alert('Submission failed');
      }
    }
  };

  const renderQuestion = (question: Question, index: number) => {
    if (index !== currentQuestionIndex && !previewMode) return null;
    if (previewMode && index > 2) return null; // Show only first 3 in preview

    return (
      <AnimatePresence key={question.id}>
        <motion.div
          className="checkin-question-card"
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.9 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.h2
            className="checkin-question-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="question-number">{index + 1}</span>
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
                className="editable-question"
              />
            ) : (
              question.question
            )}
          </motion.h2>

          <motion.div
            className="answer-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {question.type === 'text' && (
              <textarea
                value={formData[question.id] as string}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder="Share your thoughts..."
                className="checkin-textarea"
                rows={4}
              />
            )}

            {question.type === 'radio' && question.options && (
              <div className="radio-options">
                {question.options.map((option, i) => (
                  <motion.div
                    key={i}
                    className={`radio-option ${formData[question.id] === option ? 'selected' : ''}`}
                    onClick={() => handleAnswer(question.id, option)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="radio-indicator" />
                    <span>{option}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {question.type === 'range' && (
              <div className="range-section">
                <div className="range-labels">
                  <span>Not at all</span>
                  <span>Extremely</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData[question.id] as number}
                  onChange={(e) => handleAnswer(question.id, Number(e.target.value))}
                  className="range-slider"
                />
                <div className="range-value">{formData[question.id]}/10</div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

return (
    <div className="employee-checkin-container">
      
      <div className={`checkin-card ${previewMode ? 'preview-mode' : ''}`}>
        <motion.div
          className="checkin-header"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>{survey.title || 'Employee Check-In'}</h1>
          <p>{survey.subtitle || 'How are you feeling today? Your wellness matters to us.'}</p>
        </motion.div>

        <div className="progress-container">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="progress-text">
            {Math.round(progress)}% Complete ({currentQuestionIndex + 1}/{normalizedQuestions.length})
          </span>
        </div>

        <form onSubmit={handleSubmit} className="checkin-form">
          <div className="questions-container">
            {normalizedQuestions.map((question, index) => renderQuestion(question, index))}
          </div>

          {!previewMode && (
            <div className="navigation-buttons">
              {currentQuestionIndex > 0 && (
                <motion.button
                  type="button"
                  onClick={handlePrev}
                  className="nav-button prev-button"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ← Previous
                </motion.button>
              )}
              
              {currentQuestionIndex < normalizedQuestions.length - 1 ? (
                <motion.button
                  type="button"
                  onClick={handleNext}
                  className="nav-button next-button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!formData[normalizedQuestions[currentQuestionIndex]?.id] || 
                           (normalizedQuestions[currentQuestionIndex]?.type === 'range' && formData[normalizedQuestions[currentQuestionIndex]?.id] === 5)}
                >
                  Next →
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  className="submit-button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Complete Check-In
                </motion.button>
              )}
            </div>
          )}
          
          {previewMode && (
            <motion.button
              type="submit"
              className="submit-button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Complete Check-In
            </motion.button>
          )}
        </form>
      </div>

      {submitted && (
        <motion.div
          className="success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h2>Thank You!</h2>
            <p>Someone will contact you shortly from our team. Take care of yourself!</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EmployeeCheckInTemplate;

