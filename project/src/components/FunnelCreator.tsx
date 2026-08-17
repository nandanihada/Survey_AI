/**
 * FunnelCreator — AI-powered funnel survey creation wizard
 * Steps: prompt → clarification (if needed) → plan preview → generation → done
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, ChevronRight, ChevronDown, Check, Loader2,
  BarChart3, Filter, GitBranch, AlertCircle, RefreshCw,
  Layers, Target, Info, Edit3, X, HelpCircle
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────

interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
}

interface ScreeningSurveyMeta {
  index: number;
  name: string;
  purpose: string;
  estimated_questions: number;
  key_topics: string[];
  has_termination: boolean;
  termination_condition: string | null;
}

interface JobProfileMeta {
  id: string;
  display_name: string;
  match_criteria: string;
  estimated_survey_questions: number;
  key_topics: string[];
  qualification_flag: string | null;
}

interface FunnelPlan {
  funnel_name: string;
  goal: string;
  screening_surveys: ScreeningSurveyMeta[];
  job_profiles: JobProfileMeta[];
  scoring_logic: string;
  termination_conditions: string[];
  estimated_total_surveys: number;
  estimated_total_questions: number;
  tiebreaker: string;
}

interface GeneratedSurvey {
  type: 'screening' | 'job';
  index?: number;
  job_id?: string;
  survey_id: string;
  name: string;
  question_count: number;
}

type Step = 'prompt' | 'clarifying' | 'plan' | 'generating' | 'done';

interface Props {
  onFunnelCreated?: (funnelId: string) => void;
  onCancel?: () => void;
  isDarkMode?: boolean;
}

// ─── Example prompt ──────────────────────────────────────

const EXAMPLE_PROMPT = `I want to screen job candidates for 4 CSR roles:

1. HDFC Bank — Senior Manager/AVP for CSR Monitoring & Impact. Needs 10+ years, strong MIS/digital platform/Power BI experience, product management, stakeholder management.

2. Give Grants — Senior Associate for CSR Consulting. Needs 3-5 years, CSR/NGO/consulting background, analytical skills, client management.

3. HCL Foundation — Program Officer for Sports. Needs sports program/event experience, working with children, field travel willing.

4. Avaada Foundation — Assistant Manager CSR. Needs B.Ed qualification, teaching/community work experience, field work willing.

Screen candidates on general background first (age, education, experience, sector), then job interests. Terminate anyone under 18. Route to best-fit job survey based on their profile. If they fail that job's survey, try the next best match.`;

// ─── Main Component ───────────────────────────────────────

const FunnelCreator: React.FC<Props> = ({ onFunnelCreated, onCancel, isDarkMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiBase = getApiBaseUrl();

  const [step, setStep] = useState<Step>('prompt');
  const [prompt, setPrompt] = useState('');
  const [showExample, setShowExample] = useState(false);

  // Clarification
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({});

  // Plan
  const [funnelPlan, setFunnelPlan] = useState<FunnelPlan | null>(null);

  // Generation
  const [generatingStep, setGeneratingStep] = useState('');
  const [generatedSurveys, setGeneratedSurveys] = useState<GeneratedSurvey[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [funnelId, setFunnelId] = useState('');

  // Error
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 'prompt' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [step]);

  // ── Helpers ──────────────────────────────────────────────

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // ── Step 1: Analyze prompt ────────────────────────────────

  const handleAnalyze = async () => {
    if (!prompt.trim() || prompt.trim().length < 30) {
      setError('Please provide a more detailed description of your funnel (at least 30 characters).');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/funnels/analyze-prompt`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const data = await res.json();

      if (data.type === 'clarification') {
        setClarifyQuestions(data.questions || []);
        setStep('clarifying');
      } else if (data.type === 'funnel_plan') {
        setFunnelPlan(data);
        setStep('plan');
      } else {
        throw new Error('Unexpected response from AI');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Submit clarification answers ─────────────────

  const handleClarificationSubmit = async () => {
    const unanswered = clarifyQuestions.filter(q => !clarifyAnswers[q.id]);
    if (unanswered.length > 0) {
      setError('Please answer all questions before continuing.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/funnels/analyze-prompt`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          prompt: prompt.trim(),
          clarification_answers: clarifyAnswers
        })
      });

      if (!res.ok) throw new Error('Analysis failed after clarification');
      const data = await res.json();

      if (data.type === 'funnel_plan') {
        setFunnelPlan(data);
        setStep('plan');
      } else {
        throw new Error('Still unclear — try adding more detail to your prompt.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Generate ──────────────────────────────────────

  const handleGenerate = async () => {
    if (!funnelPlan) return;
    setStep('generating');
    setError('');
    setGenerationProgress(0);
    setGeneratedSurveys([]);

    const totalSurveys =
      (funnelPlan.screening_surveys?.length || 0) +
      (funnelPlan.job_profiles?.length || 0);

    let progress = 0;
    const tick = () => {
      progress += Math.floor(Math.random() * 8) + 3;
      setGenerationProgress(Math.min(progress, 90));
    };
    const progressTimer = setInterval(tick, 1200);

    setGeneratingStep('Analyzing funnel requirements...');

    try {
      const res = await fetch(`${apiBase}/api/funnels/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          funnel_plan: funnelPlan,
          original_prompt: prompt.trim()
        })
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();

      setGeneratedSurveys(data.generated_surveys || []);
      setFunnelId(data.funnel_id);
      setGenerationProgress(100);
      setGeneratingStep('Done!');
      setStep('done');

    } catch (e: any) {
      clearInterval(progressTimer);
      setError(e.message || 'Generation failed');
      setStep('plan'); // go back to plan so user can retry
    }
  };

  // ─── Render: Prompt step ─────────────────────────────────

  const renderPromptStep = () => (
    <div className="space-y-6">
      {/* What is a Funnel Survey — behind ? icon */}
      <div className="flex items-center gap-2">
        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Describe your funnel
        </p>
        <div className="relative group">
          <button className={`w-5 h-5 rounded-full flex items-center justify-center border text-xs font-bold transition ${isDarkMode ? 'border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-400' : 'border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500'}`}>
            ?
          </button>
          <div className={`absolute left-0 top-7 z-50 w-72 rounded-xl border p-3 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <p className={`font-semibold text-xs mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>What is a Funnel Survey?</p>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              A series of connected surveys that screen, score, and route respondents automatically. You describe the goal — AI builds all surveys, scoring logic, and routing rules.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { icon: <Filter size={10} />, text: 'Auto screening' },
                { icon: <BarChart3 size={10} />, text: 'Job scoring' },
                { icon: <GitBranch size={10} />, text: 'Smart routing' },
                { icon: <Target size={10} />, text: 'Cascade on fail' }
              ].map((item, i) => (
                <span key={i} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                  {item.icon} {item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={8}
          placeholder="E.g. I want to screen candidates for 4 CSR job roles. First collect general background (age, education, experience, sector). Then check job interests. Route each person to the best-fit job survey based on their answers. HDFC needs senior M&E experience, Give Grants needs consulting background, HCL needs sports program experience, Avaada needs B.Ed + teaching..."
          className={`w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
        />
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Be specific: mention job roles, qualification criteria, number of surveys, any hard disqualifiers.
        </p>
      </div>

      {/* Example prompt toggle */}
      <div>
        <button
          onClick={() => setShowExample(!showExample)}
          className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
        >
          <Sparkles size={14} />
          {showExample ? 'Hide' : 'Show'} example prompt
          <ChevronDown size={14} className={`transition-transform ${showExample ? 'rotate-180' : ''}`} />
        </button>
        {showExample && (
          <div className={`mt-3 rounded-xl border p-4 text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
            <pre className="whitespace-pre-wrap font-sans">{EXAMPLE_PROMPT}</pre>
            <button
              onClick={() => { setPrompt(EXAMPLE_PROMPT); setShowExample(false); }}
              className="mt-3 text-xs text-blue-500 hover:text-blue-600 underline"
            >
              Use this example
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleAnalyze}
          disabled={loading || prompt.trim().length < 30}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Analyzing...' : 'Analyze & Plan Funnel'}
          {!loading && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );

  // ─── Render: Clarification step ──────────────────────────

  const renderClarifyStep = () => (
    <div className="space-y-6">
      <div className={`flex items-start gap-3 rounded-xl p-4 ${isDarkMode ? 'bg-yellow-950/30 border border-yellow-800/40' : 'bg-yellow-50 border border-yellow-200'}`}>
        <Info size={18} className="text-yellow-500 shrink-0 mt-0.5" />
        <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
          I have a few quick questions before I build your funnel plan. This helps me get it right.
        </p>
      </div>

      <div className="space-y-5">
        {clarifyQuestions.map(q => (
          <div key={q.id}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{q.question}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setClarifyAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                    clarifyAnswers[q.id] === opt
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  {clarifyAnswers[q.id] === opt && <Check size={12} className="inline mr-1" />}
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={14} />{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => { setStep('prompt'); setError(''); }}
          className={`px-4 py-2 rounded-xl text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
        >
          ← Back
        </button>
        <button
          onClick={handleClarificationSubmit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
          {loading ? 'Building plan...' : 'Continue →'}
        </button>
      </div>
    </div>
  );

  // ─── Render: Plan preview step ───────────────────────────

  const renderPlanStep = () => {
    if (!funnelPlan) return null;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {funnelPlan.funnel_name}
          </h3>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{funnelPlan.goal}</p>
          <div className="flex gap-4 mt-2">
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {funnelPlan.estimated_total_surveys} surveys
            </span>
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              ~{funnelPlan.estimated_total_questions} total questions
            </span>
          </div>
        </div>

        {/* Screening surveys */}
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Phase 1 — Screening Surveys
          </p>
          <div className="space-y-2">
            {funnelPlan.screening_surveys.map(s => (
              <div key={s.index} className={`rounded-xl border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Survey {s.index + 1} — {s.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.purpose}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.key_topics.slice(0, 5).map(t => (
                        <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`text-xs shrink-0 ml-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    ~{s.estimated_questions} Qs
                  </span>
                </div>
                {s.has_termination && s.termination_condition && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                    <X size={12} /> Hard stop: {s.termination_condition}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Job profiles */}
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Phase 2 — Job Surveys (cascade on fail)
          </p>
          <div className="space-y-2">
            {funnelPlan.job_profiles.map((j, i) => (
              <div key={j.id} className={`rounded-xl border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        #{i + 1}
                      </span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{j.display_name}</p>
                    </div>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{j.match_criteria}</p>
                    {j.qualification_flag && (
                      <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        ⚑ {j.qualification_flag}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs shrink-0 ml-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    ~{j.estimated_survey_questions} Qs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring & routing logic */}
        <div className={`rounded-xl border p-3 text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Scoring & Routing</p>
          <p>{funnelPlan.scoring_logic}</p>
          {funnelPlan.termination_conditions.length > 0 && (
            <p className="text-red-500 text-xs mt-2">
              Hard stops: {funnelPlan.termination_conditions.join(' · ')}
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={14} />{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('prompt'); setFunnelPlan(null); setError(''); }}
            className={`px-4 py-2 rounded-xl text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
          >
            ← Edit prompt
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold"
          >
            <Sparkles size={16} />
            Confirm & Generate All Surveys →
          </button>
        </div>
      </div>
    );
  };

  // ─── Render: Generating step ─────────────────────────────

  const renderGeneratingStep = () => {
    const total = (funnelPlan?.screening_surveys?.length || 0) + (funnelPlan?.job_profiles?.length || 0) + 2; // +2 for scoring + config
    const done = generatedSurveys.length;
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={32} />
          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Building your funnel...
          </p>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {generatingStep || 'Generating surveys and scoring logic...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className={`rounded-full h-2 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-2 bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
        <p className={`text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {generationProgress}% complete
        </p>

        {/* Live survey list */}
        {generatedSurveys.length > 0 && (
          <div className="space-y-2">
            {generatedSurveys.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <Check size={14} className="text-green-500 shrink-0" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {s.name} — {s.question_count} questions
                </span>
                <span className={`ml-auto text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {s.type === 'screening' ? 'Screening' : 'Job Survey'}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className={`text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          This may take 30–60 seconds. Please don't close this window.
        </p>
      </div>
    );
  };

  // ─── Render: Done step ───────────────────────────────────

  const renderDoneStep = () => (
    <div className="space-y-6 text-center py-4">
      <div>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Funnel Created!
        </h3>
        <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {generatedSurveys.length} surveys generated with AI scoring and routing logic.
        </p>
      </div>

      <div className="space-y-2 text-left">
        {generatedSurveys.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              s.type === 'screening'
                ? isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                : isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
            }`}>
              {s.type === 'screening' ? 'S' : 'J'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{s.name}</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.question_count} questions</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border p-3 text-left text-sm ${isDarkMode ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        <p className="font-medium mb-1">Next steps:</p>
        <ul className="space-y-1 text-xs">
          <li>• Open the funnel to add redirect URLs for each job profile</li>
          <li>• Review and adjust scoring points per answer if needed</li>
          <li>• Set the fallback URL for users who don't qualify for any role</li>
          <li>• Copy the funnel link to share with respondents</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            if (onFunnelCreated) {
              onFunnelCreated(funnelId);
            } else {
              navigate(`/?tab=surveys&subtab=funnels&open=${funnelId}`);
            }
          }}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
        >
          Open Funnel →
        </button>
      </div>    </div>
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className={`max-w-2xl mx-auto ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      {/* Step indicator */}
      {step !== 'generating' && step !== 'done' && (
        <div className="flex items-center gap-2 mb-6">
          {(['prompt', 'clarifying', 'plan'] as Step[]).map((s, i) => {
            const steps: Step[] = ['prompt', 'clarifying', 'plan'];
            const currentIdx = steps.indexOf(step);
            const thisIdx = steps.indexOf(s);
            const isActive = s === step;
            const isDone = thisIdx < currentIdx;
            return (
              <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  isDone ? 'bg-green-500 text-white' :
                  isActive ? 'bg-blue-600 text-white' :
                  isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                }`}>
                  {isDone ? <Check size={12} /> : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 ${isDone || isActive ? 'bg-blue-400' : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {step === 'prompt' && renderPromptStep()}
      {step === 'clarifying' && renderClarifyStep()}
      {step === 'plan' && renderPlanStep()}
      {step === 'generating' && renderGeneratingStep()}
      {step === 'done' && renderDoneStep()}
    </div>
  );
};

export default FunnelCreator;
