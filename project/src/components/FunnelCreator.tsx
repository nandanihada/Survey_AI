/**
 * FunnelCreator — AI-powered funnel survey creation wizard
 * Steps: prompt → clarification (if needed) → plan preview → generation → done
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, ChevronRight, ChevronDown, Check, Loader2,
  BarChart3, Filter, GitBranch, AlertCircle, RefreshCw,
  Layers, Target, Info, Edit3, X, HelpCircle, Anchor, Plus, Trash2
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

// ─── Anchor Question Types ────────────────────────────────

interface AnchorQuestionConfig {
  enabled: boolean;
  /** 'manual' = user typed question+options themselves, 'ai' = user described what they want */
  mode: 'manual' | 'ai';
  question_text: string;
  options: string[];
  /** Which options count as "qualified" — if user's answer matches any of these, flag = true */
  correct_answers: string[];
  redirect_url: string;
  ai_description: string; // only used when mode='ai'
}

interface Props {
  onFunnelCreated?: (funnelId: string) => void;
  onCancel?: () => void;
  isDarkMode?: boolean;
  initialPrompt?: string;
}

// ─── Example prompt ──────────────────────────────────────

const EXAMPLE_PROMPT = `I want to screen job candidates for 4 CSR roles:

1. HDFC Bank — Senior Manager/AVP for CSR Monitoring & Impact. Needs 10+ years, strong MIS/digital platform/Power BI experience, product management, stakeholder management.

2. Give Grants — Senior Associate for CSR Consulting. Needs 3-5 years, CSR/NGO/consulting background, analytical skills, client management.

3. HCL Foundation — Program Officer for Sports. Needs sports program/event experience, working with children, field travel willing.

4. Avaada Foundation — Assistant Manager CSR. Needs B.Ed qualification, teaching/community work experience, field work willing.

Screen candidates on general background first (age, education, experience, sector), then job interests. Terminate anyone under 18. Route to best-fit job survey based on their profile. If they fail that job's survey, try the next best match.`;

// ─── Main Component ───────────────────────────────────────

const FunnelCreator: React.FC<Props> = ({ onFunnelCreated, onCancel, isDarkMode = false, initialPrompt = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiBase = getApiBaseUrl();

  const [step, setStep] = useState<Step>('prompt');
  const [prompt, setPrompt] = useState(initialPrompt);
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

  // Anchor question
  const [anchorConfig, setAnchorConfig] = useState<AnchorQuestionConfig>({
    enabled: false,
    mode: 'manual',
    question_text: '',
    options: [''],
    correct_answers: [],
    redirect_url: '',
    ai_description: '',
  });
  const [anchorSectionOpen, setAnchorSectionOpen] = useState(false);
  const [anchorOptionInput, setAnchorOptionInput] = useState('');
  const [generatingAnchorQuestion, setGeneratingAnchorQuestion] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 'prompt' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [step]);

  // Update prompt if initialPrompt changes (e.g. user types more after flip)
  useEffect(() => {
    if (initialPrompt && !prompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

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
    setGeneratingStep('Starting generation...');

    try {
      // Kick off background generation — returns immediately with job_id
      const res = await fetch(`${apiBase}/api/funnels/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          funnel_plan: funnelPlan,
          original_prompt: prompt.trim(),
          anchor_config: anchorConfig.enabled ? anchorConfig : null,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start generation');
      }

      const { job_id } = await res.json();

      // Poll for status every 3 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${apiBase}/api/funnels/generate-status/${job_id}`, {
            headers: authHeaders()
          });
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          setGenerationProgress(statusData.progress || 0);
          setGeneratingStep(statusData.current_step || 'Generating...');
          setGeneratedSurveys(statusData.generated_surveys || []);

          if (statusData.status === 'done') {
            clearInterval(pollInterval);
            setFunnelId(statusData.funnel_id);
            setGenerationProgress(100);
            setGeneratingStep('Done!');
            setStep('done');
          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            setError(statusData.error || 'Generation failed');
            setStep('plan');
          }
        } catch (pollErr) {
          console.error('Poll error:', pollErr);
        }
      }, 3000);

      // Safety: stop polling after 10 minutes
      setTimeout(() => clearInterval(pollInterval), 600000);

    } catch (e: any) {
      setError(e.message || 'Generation failed');
      setStep('plan');
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

  // ─── AI: Generate anchor question from description ────────

  const generateAnchorQuestionFromAI = async () => {
    if (!anchorConfig.ai_description.trim()) return;
    setGeneratingAnchorQuestion(true);
    try {
      const apiKey = ''; // not exposed to frontend — call our own backend endpoint
      const res = await fetch(`${apiBase}/api/funnels/generate-anchor-question`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          description: anchorConfig.ai_description.trim(),
          funnel_goal: funnelPlan?.goal || '',
        })
      });
      if (!res.ok) throw new Error('Failed to generate anchor question');
      const data = await res.json();
      setAnchorConfig(prev => ({
        ...prev,
        question_text: data.question_text || '',
        options: data.options || [],
        correct_answers: data.suggested_correct_answers || [],
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to generate anchor question');
    } finally {
      setGeneratingAnchorQuestion(false);
    }
  };

  // ─── Render: Anchor question section (inside plan step) ──

  const renderAnchorSection = () => {
    const ac = anchorConfig;
    const setAc = (patch: Partial<AnchorQuestionConfig>) =>
      setAnchorConfig(prev => ({ ...prev, ...patch }));

    return (
      <div className={`rounded-xl border ${anchorConfig.enabled ? (isDarkMode ? 'border-amber-700/60 bg-amber-950/20' : 'border-amber-300 bg-amber-50') : (isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white')}`}>
        {/* Header toggle */}
        <button
          type="button"
          onClick={() => {
            if (!anchorConfig.enabled) { setAc({ enabled: true }); setAnchorSectionOpen(true); }
            else { setAnchorSectionOpen(o => !o); }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <Anchor size={16} className={anchorConfig.enabled ? 'text-amber-500' : (isDarkMode ? 'text-gray-500' : 'text-gray-400')} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${anchorConfig.enabled ? (isDarkMode ? 'text-amber-300' : 'text-amber-800') : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
              Anchor Question
              {anchorConfig.enabled && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-amber-800/50 text-amber-300' : 'bg-amber-200 text-amber-800'}`}>Enabled</span>}
            </p>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              If a user fails all surveys in the funnel, check this question and redirect qualified users to a special link
            </p>
          </div>
          {anchorConfig.enabled ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setAc({ enabled: false }); setAnchorSectionOpen(false); }}
                className={`text-xs px-2 py-1 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                Disable
              </button>
              <ChevronDown size={14} className={`transition-transform ${anchorSectionOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Click to enable</span>
          )}
        </button>

        {anchorConfig.enabled && anchorSectionOpen && (
          <div className={`px-4 pb-4 space-y-4 border-t ${isDarkMode ? 'border-amber-800/40' : 'border-amber-200'}`}>

            {/* Mode selector */}
            <div className="pt-3">
              <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>How do you want to define the anchor question?</p>
              <div className="flex gap-2">
                {(['manual', 'ai'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAc({ mode: m })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                      ac.mode === m
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-amber-600' : 'bg-white border-gray-300 text-gray-600 hover:border-amber-400'
                    }`}
                  >
                    {m === 'manual' ? '✏️ Write manually' : '✨ Describe to AI'}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual mode */}
            {ac.mode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Question text</p>
                  <input
                    value={ac.question_text}
                    onChange={e => setAc({ question_text: e.target.value })}
                    placeholder="e.g. Do you own a car?"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>

                <div>
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Answer options</p>
                  <div className="space-y-2">
                    {ac.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={opt}
                          onChange={e => {
                            const newOpts = [...ac.options];
                            const oldVal = newOpts[i];
                            newOpts[i] = e.target.value;
                            // Keep correct_answers in sync if renamed
                            const newCorrect = ac.correct_answers.map(ca => ca === oldVal ? e.target.value : ca);
                            setAc({ options: newOpts, correct_answers: newCorrect });
                          }}
                          placeholder={`Option ${i + 1}`}
                          className={`flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = ac.options.filter((_, idx) => idx !== i);
                            setAc({ options: newOpts, correct_answers: ac.correct_answers.filter(ca => ca !== opt) });
                          }}
                          className={`p-1.5 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAc({ options: [...ac.options, ''] })}
                      className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}
                    >
                      <Plus size={12} /> Add option
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI mode */}
            {ac.mode === 'ai' && (
              <div className="space-y-3">
                <div>
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Describe the anchor question you want</p>
                  <textarea
                    rows={3}
                    value={ac.ai_description}
                    onChange={e => setAc({ ai_description: e.target.value })}
                    placeholder="e.g. A yes/no question about whether the user owns a vehicle"
                    className={`w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateAnchorQuestionFromAI}
                  disabled={generatingAnchorQuestion || !ac.ai_description.trim()}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                >
                  {generatingAnchorQuestion ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {generatingAnchorQuestion ? 'Generating...' : 'Generate question'}
                </button>

                {/* Show generated result (same fields as manual) */}
                {ac.question_text && (
                  <div className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{ac.question_text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ac.options.map(o => (
                        <span key={o} className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{o}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAc({ question_text: '', options: [''], correct_answers: [] })}
                      className={`text-xs ${isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      Clear & re-generate
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Correct answers selector — shown when options are available */}
            {ac.options.filter(o => o.trim()).length > 0 && (
              <div>
                <p className={`text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Which answer(s) qualify the user? <span className={`font-normal ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>(select all that apply)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {ac.options.filter(o => o.trim()).map(opt => {
                    const selected = ac.correct_answers.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? ac.correct_answers.filter(ca => ca !== opt)
                            : [...ac.correct_answers, opt];
                          setAc({ correct_answers: next });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition ${
                          selected
                            ? 'bg-green-500 border-green-500 text-white'
                            : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-green-500' : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                        }`}
                      >
                        {selected && <Check size={11} />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {ac.correct_answers.length > 0 && (
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                    ✓ {ac.correct_answers.length} qualifying answer{ac.correct_answers.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Redirect URL */}
            <div>
              <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Redirect URL for qualified users</p>
              <input
                value={ac.redirect_url}
                onChange={e => setAc({ redirect_url: e.target.value })}
                placeholder="https://yoursite.com/special-offer"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Users who fail all surveys but answered this question correctly will be sent here instead of the fallback.
              </p>
            </div>

            {/* Validation summary */}
            {ac.enabled && (
              <div className={`rounded-lg p-2.5 text-xs space-y-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Anchor question summary:</p>
                <p className={ac.question_text ? (isDarkMode ? 'text-green-400' : 'text-green-700') : (isDarkMode ? 'text-red-400' : 'text-red-600')}>
                  {ac.question_text ? `✓ Question: "${ac.question_text.slice(0, 60)}${ac.question_text.length > 60 ? '...' : ''}"` : '✗ Question not set'}
                </p>
                <p className={ac.correct_answers.length > 0 ? (isDarkMode ? 'text-green-400' : 'text-green-700') : (isDarkMode ? 'text-red-400' : 'text-red-600')}>
                  {ac.correct_answers.length > 0 ? `✓ Qualifying answers: ${ac.correct_answers.join(', ')}` : '✗ No qualifying answers selected'}
                </p>
                <p className={ac.redirect_url ? (isDarkMode ? 'text-green-400' : 'text-green-700') : (isDarkMode ? 'text-amber-400' : 'text-amber-600')}>
                  {ac.redirect_url ? `✓ Redirect: ${ac.redirect_url.slice(0, 50)}${ac.redirect_url.length > 50 ? '...' : ''}` : '⚠ Redirect URL not set (will use funnel fallback)'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };



  const renderPlanStep = () => {
    if (!funnelPlan) return null;

    // Guard against malformed AI response
    if (!funnelPlan.screening_surveys || !funnelPlan.job_profiles) {
      return (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'bg-red-950/30 border-red-800/40' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
              The AI returned an incomplete plan. Please go back and try a more detailed prompt.
            </p>
            {funnelPlan.goal && (
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                AI understood: {funnelPlan.goal}
              </p>
            )}
          </div>
          <button
            onClick={() => { setStep('prompt'); setFunnelPlan(null); setError(''); }}
            className={`px-4 py-2 rounded-xl text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
          >
            ← Edit prompt
          </button>
        </div>
      );
    }
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
            {(funnelPlan.screening_surveys || []).map(s => (
              <div key={s.index} className={`rounded-xl border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Survey {s.index + 1} — {s.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.purpose}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(s.key_topics || []).slice(0, 5).map(t => (
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
            Phase 2 — Destination Surveys (cascade on fail)
          </p>
          <div className="space-y-2">
            {(funnelPlan.job_profiles || []).map((j, i) => (
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
          {(funnelPlan.termination_conditions || []).length > 0 && (
            <p className="text-red-500 text-xs mt-2">
              Hard stops: {(funnelPlan.termination_conditions || []).join(' · ')}
            </p>
          )}
        </div>

        {/* ── Anchor Question ── */}
        {renderAnchorSection()}

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
                  {s.type === 'screening' ? 'Screening' : 'Destination Survey'}
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
              navigate(`/dashboard?tab=surveys&subtab=funnels&open=${funnelId}`);
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
