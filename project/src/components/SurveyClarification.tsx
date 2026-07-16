import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Sparkles } from 'lucide-react';
import { ClarificationNeeds } from '../utils/promptParser';

interface ClarificationProps {
  needs: ClarificationNeeds;
  onSubmit: (answers: ClarificationAnswers) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
  prompt?: string;
}

export interface ClarificationAnswers {
  questionCount?: number;
  topic?: string;
  audience?: string;
  dataCollection: string;
  tone?: string;
  aiContext?: string;
}

interface Step {
  key: string;
  phrase: string;
  options: { key: string; label: string }[];
  isAI?: boolean;
}

const SurveyClarification: React.FC<ClarificationProps> = ({
  needs,
  onSubmit,
  onCancel,
  isDarkMode = false,
  prompt = '',
}) => {
  const [aiStep, setAiStep] = useState<Step | null>(null);

  // Fetch AI contextual question on mount
  useEffect(() => {
    if (!prompt || prompt.length < 10) return;
    const fetchAIQuestion = async () => {
      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiBase = isLocal ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
        const res = await fetch(`${apiBase}/api/contextual-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.question && data.options && data.options.length > 0) {
            setAiStep({
              key: 'aiContext',
              phrase: data.question,
              options: data.options.map((opt: string, i: number) => ({ key: opt, label: opt })),
              isAI: true,
            });
          }
        }
      } catch {}
    };
    fetchAIQuestion();
  }, [prompt]);

  const steps: Step[] = [];

  if (needs.needsTopic) {
    steps.push({
      key: 'topic',
      phrase: "What is the survey about?",
      options: [
        { key: 'customer_feedback', label: 'Customer satisfaction/feedback' },
        { key: 'employee_engagement', label: 'Employee engagement' },
        { key: 'event_feedback', label: 'Event feedback' },
        { key: 'product_research', label: 'Product/market research' },
      ],
    });
  }
  if (needs.needsQuestionCount) {
    steps.push({
      key: 'questionCount',
      phrase: "How many questions do you need?",
      options: [
        { key: '5', label: '5 — Quick survey' },
        { key: '10', label: '10 — Standard' },
        { key: '15', label: '15 — Detailed' },
        { key: '20', label: '20 — Comprehensive' },
      ],
    });
  }
  if (needs.needsAudience) {
    steps.push({
      key: 'audience',
      phrase: "Who will be filling this out?",
      options: [
        { key: 'customers', label: 'Customers' },
        { key: 'employees', label: 'Employees / Team' },
        { key: 'students', label: 'Students' },
        { key: 'users', label: 'Website visitors' },
      ],
    });
  }
  steps.push({
    key: 'dataCollection',
    phrase: "Collect respondent details?",
    options: [
      { key: 'full_details', label: 'Yes (Name, Email, Phone)' },
      { key: 'email_only', label: 'Only Email' },
      { key: 'anonymous', label: 'No (keep anonymous)' },
    ],
  });

  // Tone step removed - now handled via dropdown in prompt box toolbar

  // Add AI contextual question as last step (if fetched)
  if (aiStep) {
    steps.push(aiStep);
  }

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  const handleSelect = (value: string) => {
    setSelectedKey(value);
    const newAnswers = { ...answers, [steps[currentStep].key]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentStep + 1 < steps.length) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          setSelectedKey(null);
          setIsTransitioning(false);
        }, 3000);
      } else {
        finishClarification(newAnswers);
      }
    }, 200);
  };

  const handleCustomSubmit = () => {
    if (!customText.trim()) return;
    handleSelect(customText.trim());
    setCustomText('');
  };

  const finishClarification = (finalAnswers: Record<string, string>) => {
    onSubmit({
      topic: finalAnswers.topic || undefined,
      questionCount: finalAnswers.questionCount ? parseInt(finalAnswers.questionCount) : undefined,
      audience: finalAnswers.audience || undefined,
      dataCollection: finalAnswers.dataCollection || 'anonymous',
      tone: finalAnswers.tone || undefined,
      aiContext: finalAnswers.aiContext || undefined,
    });
  };

  const step = steps[currentStep];

  if (isTransitioning) {
    return (
      <div
        className="clarification-glass rounded-xl overflow-hidden"
        style={{ animation: 'clarDropIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        <div className="flex items-center justify-center px-4 py-6 gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className={`text-[12px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>
            Thinking...
          </span>
        </div>
        <style>{`
          .clarification-glass {
            background: ${isDarkMode
              ? 'rgba(15, 23, 42, 0.7)'
              : 'rgba(255, 255, 255, 0.65)'};
            backdrop-filter: blur(16px) saturate(1.4);
            -webkit-backdrop-filter: blur(16px) saturate(1.4);
            border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
            box-shadow: ${isDarkMode
              ? '0 8px 32px rgba(0,0,0,0.3)'
              : '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'};
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="clarification-glass rounded-xl overflow-hidden"
      style={{ animation: 'clarDropIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <p className={`text-[13px] font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {step.isAI && <Sparkles size={12} className="text-purple-500" />}
          {step.phrase}
        </p>
        <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
          {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Options */}
      <div key={currentStep} style={{ animation: 'clarListIn 0.3s ease-out both' }}>
        {step.options.map((opt, i) => (
          <button
            key={opt.key}
            onClick={() => handleSelect(opt.key)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-t transition-all duration-150 ${
              selectedKey === opt.key
                ? isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50/60 border-red-100'
                : isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-stone-100/80 hover:bg-white/40'
            }`}
          >
            <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-bold flex-shrink-0 transition-colors ${
              selectedKey === opt.key
                ? 'bg-red-500 text-white'
                : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-stone-200/60 text-stone-500'
            }`}>
              {i + 1}
            </span>
            <span className={`text-[12px] sm:text-[13px] font-medium ${
              isDarkMode ? 'text-slate-200' : 'text-slate-700'
            }`}>
              {opt.label}
            </span>
          </button>
        ))}

        {/* Something else row — always present */}
        <div className={`flex items-center gap-3 px-4 py-2.5 border-t ${
          isDarkMode ? 'border-white/5' : 'border-stone-100/80'
        }`}>
          <span className={`w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 ${
            isDarkMode ? 'bg-white/10' : 'bg-stone-200/60'
          }`}>
            <Edit3 size={10} className={isDarkMode ? 'text-slate-400' : 'text-stone-400'} />
          </span>
          <input
            ref={customRef}
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); }}
            placeholder="Something else"
            className={`flex-1 bg-transparent text-[12px] sm:text-[13px] font-medium border-0 outline-none ${
              isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-700 placeholder-stone-400'
            }`}
          />
          {customText.trim() && (
            <button onClick={handleCustomSubmit} className="text-[10px] font-bold text-red-500">
              Enter ↵
            </button>
          )}
        </div>
      </div>

      <style>{`
        .clarification-glass {
          background: ${isDarkMode
            ? 'rgba(15, 23, 42, 0.7)'
            : 'rgba(255, 255, 255, 0.65)'};
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
          box-shadow: ${isDarkMode
            ? '0 8px 32px rgba(0,0,0,0.3)'
            : '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'};
        }
        @keyframes clarDropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clarListIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SurveyClarification;
