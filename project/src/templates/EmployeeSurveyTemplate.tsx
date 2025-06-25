import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EmployeeSurveyTemplate.css';
import type { Survey } from '../types/Survey';

interface Question {
  id: string;
  question: string;
  type: 'text' | 'radio' | 'rating';
  options?: string[];
}


interface Props {
  survey: Survey;
}

const EmployeeSurveyTemplate: React.FC<Props> = ({ survey }) => {
  const normalizeType = (type: string): 'text' | 'radio' | 'rating' => {
    switch (type) {
      case 'short_answer': return 'text';
      case 'multiple_choice': return 'radio';
      case 'rating': return 'rating';
      default: return 'text';
    }
  };

  const normalizedQuestions: Question[] = (survey.questions || []).map((q, index) => ({
    id: q.id || `q${index}`,
    question: q.question,
    type: normalizeType(q.type),
    options: q.options || [],
  }));

  const [formData, setFormData] = useState<Record<string, string | number>>(() => {
    const initialData: Record<string, string | number> = {};
    normalizedQuestions.forEach(q => {
      initialData[q.id] = q.type === 'rating' ? 0 : '';
    });
    return initialData;
  });

  const [visibleCount, setVisibleCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let answeredCount = 0;
    for (let i = 0; i < normalizedQuestions.length; i++) {
      const q = normalizedQuestions[i];
      const val = formData[q.id];
      if (val !== '' && val !== 0) {
        answeredCount++;
      }
    }
    setVisibleCount(Math.min(answeredCount + 1, normalizedQuestions.length));
  }, [formData]);

  const handleChange = (id: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allAnswered = normalizedQuestions.every(q => {
      const val = formData[q.id];
      return q.type === 'rating' ? Number(val) > 0 : val !== '';
    });

    if (!allAnswered) {
      alert('Please answer all questions');
      return;
    }

    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  const renderQuestion = (q: Question, idx: number) => {
    if (idx >= visibleCount) return null;
    return (
      <AnimatePresence key={q.id}>
        <motion.div
          className="question-group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="question-title">
            <span>{idx + 1}</span> {q.question}
          </div>

          {q.type === 'rating' && (
            <div className="rating-container">
              {[1, 2, 3, 4, 5].map(value => (
                <div
                  key={value}
                  className={`rating-star ${formData[q.id] === value ? 'active' : ''}`}
                  onClick={() => handleChange(q.id, value)}
                >
                  ★
                </div>
              ))}
            </div>
          )}

          {q.type === 'radio' && q.options && (
            <div className="options-container">
              {q.options.map((opt, i) => (
                <div
                  key={i}
                  className={`option-btn ${formData[q.id] === opt ? 'selected' : ''}`}
                  onClick={() => handleChange(q.id, opt)}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          {q.type === 'text' && (
            <textarea
              className="text-input"
              rows={4}
              value={formData[q.id] as string}
              onChange={e => handleChange(q.id, e.target.value)}
              placeholder="Your response..."
            />
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="survey-container">
      <div className="survey-header">
        <h1>{survey.title || 'Employee Check-In Survey'}</h1>
        <p>{survey.subtitle || 'Your feedback helps us create a better workplace for everyone'}</p>
      </div>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${(visibleCount / normalizedQuestions.length) * 100}%` }}
        ></div>
      </div>

      {!submitted ? (
        <form className="survey-body" onSubmit={handleSubmit}>
          {normalizedQuestions.map((q, idx) => renderQuestion(q, idx))}

          {visibleCount === normalizedQuestions.length && (
            <div className="survey-footer">
              <button type="submit" className="btn btn-next">Submit</button>
            </div>
          )}
        </form>
      ) : (
        <div className="thank-you">
          <div className="thank-you-icon">✓</div>
          <h2>Thank You!</h2>
          <p>We appreciate your honest feedback and will use it to make improvements.</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeSurveyTemplate;
