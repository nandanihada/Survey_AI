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
}
const QUESTION_FADE_DURATION = 0.6; 
const CustomerFeedbackTemplate: React.FC<Props> = ({ survey, previewMode = false }) => {
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

  const [progress, setProgress] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
const [visibleCount, setVisibleCount] = useState<number>(previewMode ? normalizedQuestions.length : 2);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uname = params.get('username');
    const mail = params.get('email');
    setUsername(uname);
    setEmail(mail);

    if (uname && mail && survey.id) {
      fetch(`http://localhost:5000/survey/${survey.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, email: mail }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.tracking_id) {
            setTrackingId(data.tracking_id);
          }
        })
        .catch(err => console.error('Tracking error:', err));
    }
  }, [location.search, survey.id]);

  useEffect(() => {
    let completed = 0;
    normalizedQuestions.forEach((q) => {
      const val = formData[q.id];
      if (val !== undefined && val !== '' && !(q.type === 'range' && val === 5)) {
        completed++;
      }
    });
    setProgress((completed / normalizedQuestions.length) * 100);

    if (completed >= visibleCount && visibleCount < normalizedQuestions.length) {
      setVisibleCount(visibleCount + 1);
    }
  }, [formData, normalizedQuestions, visibleCount]);

  const handleChange = (id: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unanswered = normalizedQuestions.find(q => {
      const val = formData[q.id];
      return val === '' || (q.type === 'range' && val === 5);
    });
    if (unanswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      const responseData: Record<string, string | number> = {};
      normalizedQuestions.forEach(q => {
        responseData[q.question] = formData[q.id];
      });

      const requestBody = {
        responses: responseData,
        email,
        username,
        tracking_id: trackingId
      };

      const response = await fetch(`http://localhost:5000/survey/${survey.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());

      const result = await response.json();
      setSubmitted(true);
      alert(`Response submitted! ID: ${result.response_id}`);

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Error: Submission failed');
      }
    }
  };

  const renderQuestion = (q: Question, idx: number) => {
    if (idx >= visibleCount) return null;
    return (
      <AnimatePresence key={q.id}>
        <motion.div
  className="question-block"
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 30 }}
  transition={{ duration: 1.2, ease: 'easeOut' }} // ⬅️ slower animation
>

       <motion.h5
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: QUESTION_FADE_DURATION }}
  className="question-title"
  style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
>
  <span className="question-icon" style={{ background: 'none', marginRight: '10px' }}>
    <img
      src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
      alt="Chilli Icon"
      style={{ width: 24, height: 24 }}
    />
  </span>

  <span style={{ display: 'inline', whiteSpace: 'pre-wrap', fontWeight: 600, color: '#fff' }}>
    {(q.question || '').split('').map((char, i) => (

      <motion.span
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 * i }}
        style={{
          display: 'inline-block',
          whiteSpace: 'pre', // Preserve spacing
          marginRight: char === ' ' ? '2px' : '0',
        }}
      >
        {char}
      </motion.span>
    ))}
  </span>
</motion.h5>


          {q.type === 'range' && (
            <>
              <div className="range-labels">
                <span>0</span>
                <span>10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={formData[q.id] as number}
                onChange={(e) => handleChange(q.id, Number(e.target.value))}
                className="form-range"
              />
              <div className="text-center mt-2">
                <span style={{ color: '#fff', fontWeight: 600 }}>{formData[q.id]}</span>
              </div>
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
                  <label className="form-check-label" htmlFor={`${q.id}-${i}`}>
                    {opt}
                  </label>
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
  <motion.h1
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <i className="bi bi-stars"></i> {survey.title || 'Customer Feedback'}
  </motion.h1>

  <motion.p
    className="survey-subtitle"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3, duration: 0.8 }}
  >
    {survey.subtitle || 'Please answer the following questions'}
  </motion.p>

  <motion.p
    className="survey-tagline"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.6, duration: 0.6 }}
    style={{
      color: '#d1fae5',
      fontSize: '1.05rem',
      marginTop: '12px',
      fontWeight: 500,
    }}
  >
    ✨ Your opinion makes a difference ✨
  </motion.p>
</div>


        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          {normalizedQuestions.map((q, idx) => renderQuestion(q, idx))}

          <button
            type="submit"
            className="submit-btn"
            disabled={submitted || visibleCount < normalizedQuestions.length}
          >
            {submitted ? (
              <><i className="bi bi-check-circle"></i> Submitted!</>
            ) : (
              <><i className="bi bi-send"></i> Submit Feedback</>
            )}
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
