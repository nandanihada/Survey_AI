import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OptimizedLoader from './OptimizedLoader';
import TemplateSelector from './TemplateSelector';
import type { Survey, Question, AnimationConfig } from '../types/Survey';
import { generateSurveyLink, type SurveyLinkParams } from '../utils/surveyLinkUtils';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Save, ArrowLeft, Grid3X3, Copy, CheckCircle, Settings, ExternalLink, Share2, Trash2, X, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import './SurveyEditor.css';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☰' },
  { value: 'short_answer', label: 'Short Answer', icon: '✎' },
  { value: 'yes_no', label: 'Yes / No', icon: '◑' },
  { value: 'rating', label: 'Rating', icon: '★' },
  { value: 'range', label: 'Scale', icon: '⊞' },
];

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const QUESTION_ANIMATIONS = [
  { value: 'fadeSlideUp', label: 'Fade & Slide Up', icon: '↑', desc: 'Smooth upward entrance' },
  { value: 'typewriter', label: 'Typewriter', icon: '⌨', desc: 'Text types letter by letter' },
  { value: 'flipIn', label: 'Flip In', icon: '🔄', desc: '3D flip rotation' },
  { value: 'zoomBounce', label: 'Zoom Bounce', icon: '💥', desc: 'Zoom in with bounce' },
  { value: 'slideFromLeft', label: 'Slide from Left', icon: '←', desc: 'Slides in from left' },
  { value: 'blurReveal', label: 'Blur Reveal', icon: '✨', desc: 'Blurs in from nothing' },
] as const;

const ANSWER_ANIMATIONS = [
  { value: 'fadeIn', label: 'Fade In', icon: '◐', desc: 'Simple fade appearance' },
  { value: 'popScale', label: 'Pop Scale', icon: '🫧', desc: 'Pops in with scale' },
  { value: 'slideUp', label: 'Slide Up', icon: '⬆', desc: 'Slides up into place' },
  { value: 'staggerFade', label: 'Stagger Fade', icon: '▦', desc: 'Options appear one by one' },
  { value: 'elastic', label: 'Elastic', icon: '🪀', desc: 'Springy elastic entrance' },
  { value: 'glowReveal', label: 'Glow Reveal', icon: '💡', desc: 'Glows in with highlight' },
] as const;

const DEFAULT_ANIMATION: AnimationConfig = {
  questionAnimation: 'fadeSlideUp',
  answerAnimation: 'fadeIn',
  delayMs: 100,
  speedMs: 400,
  autoAdvance: false,
  autoAdvanceDelay: 1500,
};

// Theme colors per template — applied to the center editor panel
interface EditorTheme {
  bg: string;         // center panel background
  paper: string;      // paper card background
  paperInner: string; // option boxes / inner elements
  border: string;     // borders
  accent: string;     // badge, links, focus
  accentShadow: string;
  pin: string;        // pin color
  text: string;       // primary text
  textLight: string;  // secondary text
  dashed: string;     // dashed underline on question
}

const TEMPLATE_THEMES: Record<string, EditorTheme> = {
  custom: {
    bg: '#ffffff', paper: '#F5F1E8', paperInner: '#FDFCFA', border: '#EBE8E3',
    accent: '#C4785C', accentShadow: 'rgba(196,120,92,0.25)', pin: '#2D2520',
    text: '#2D2520', textLight: '#9B9189', dashed: 'rgba(196,120,92,0.3)',
  },
  customer_feedback: {
    bg: '#F0F7F7', paper: '#E6F2F0', paperInner: '#F5FAF9', border: '#C8DDD9',
    accent: '#0D9488', accentShadow: 'rgba(13,148,136,0.25)', pin: '#2D2520',
    text: '#1A3A36', textLight: '#6B8F8A', dashed: 'rgba(13,148,136,0.3)',
  },
  employee_checkin: {
    bg: '#F5F3FF', paper: '#EDE9FE', paperInner: '#F8F7FF', border: '#D4CCF0',
    accent: '#7C3AED', accentShadow: 'rgba(124,58,237,0.25)', pin: '#2D2520',
    text: '#2E1A5E', textLight: '#8B7AAF', dashed: 'rgba(124,58,237,0.3)',
  },
  event_feedback: {
    bg: '#FFF7ED', paper: '#FEF0E0', paperInner: '#FFFAF5', border: '#F0D9BE',
    accent: '#EA580C', accentShadow: 'rgba(234,88,12,0.25)', pin: '#2D2520',
    text: '#431407', textLight: '#A0764E', dashed: 'rgba(234,88,12,0.3)',
  },
  product_feedback: {
    bg: '#EFF6FF', paper: '#DBEAFE', paperInner: '#F0F7FF', border: '#BFDBFE',
    accent: '#2563EB', accentShadow: 'rgba(37,99,235,0.25)', pin: '#2D2520',
    text: '#1E3A5F', textLight: '#6B8DB5', dashed: 'rgba(37,99,235,0.3)',
  },
  team_collaboration: {
    bg: '#FEFCE8', paper: '#FEF9C3', paperInner: '#FFFDE8', border: '#E5DFA0',
    accent: '#CA8A04', accentShadow: 'rgba(202,138,4,0.25)', pin: '#2D2520',
    text: '#3D3510', textLight: '#92860E', dashed: 'rgba(202,138,4,0.3)',
  },
  onboarding_review: {
    bg: '#FDF2F8', paper: '#FCE7F3', paperInner: '#FFF5FA', border: '#F0C6DB',
    accent: '#DB2777', accentShadow: 'rgba(219,39,119,0.25)', pin: '#2D2520',
    text: '#4A0D2E', textLight: '#A85A82', dashed: 'rgba(219,39,119,0.3)',
  },
  website_experience: {
    bg: '#F0FDF4', paper: '#DCFCE7', paperInner: '#F5FFF8', border: '#BBF7D0',
    accent: '#16A34A', accentShadow: 'rgba(22,163,74,0.25)', pin: '#2D2520',
    text: '#14532D', textLight: '#5E9B72', dashed: 'rgba(22,163,74,0.3)',
  },
  training_feedback: {
    bg: '#FFF1F2', paper: '#FFE4E6', paperInner: '#FFF8F8', border: '#FECDD3',
    accent: '#E11D48', accentShadow: 'rgba(225,29,72,0.25)', pin: '#2D2520',
    text: '#4C0519', textLight: '#A8546A', dashed: 'rgba(225,29,72,0.3)',
  },
  service_cancellation: {
    bg: '#F8FAFC', paper: '#F1F5F9', paperInner: '#F8FAFC', border: '#CBD5E1',
    accent: '#475569', accentShadow: 'rgba(71,85,105,0.25)', pin: '#2D2520',
    text: '#1E293B', textLight: '#94A3B8', dashed: 'rgba(71,85,105,0.3)',
  },
};

const getTheme = (templateType: string): EditorTheme =>
  TEMPLATE_THEMES[templateType] || TEMPLATE_THEMES.custom;

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [urlParams] = useState<SurveyLinkParams>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [shareLinkRevealed, setShareLinkRevealed] = useState(false);
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);

  const animConfig = survey?.animation || DEFAULT_ANIMATION;
  const updateAnimation = (field: keyof AnimationConfig, value: AnimationConfig[keyof AnimationConfig]) => {
    if (!survey) return;
    setSurvey({ ...survey, animation: { ...animConfig, [field]: value } });
  };

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';

  const shareLink = id
    ? generateSurveyLink(id, user?.simpleUserId?.toString(), urlParams, user?.name || user?.email?.split('@')[0] || `user_${user?.simpleUserId}`)
    : '';

  useEffect(() => {
    if (!id) return;
    const fetchSurvey = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBaseUrl}/survey/${id}/view`);
        if (!res.ok) throw new Error(`Failed to fetch survey: ${res.status}`);
        const data = await res.json();
        const surveyData = data.survey || data;
        if (!surveyData || !surveyData.questions) throw new Error('Invalid survey data received');
        setSurvey(surveyData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load survey';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSurvey();
  }, [id, apiBaseUrl]);

  const handleSave = useCallback(async () => {
    if (!survey) return;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch(`${apiBaseUrl}/survey/${survey.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });
      if (!res.ok) throw new Error(`Failed to save survey: ${res.status}`);
      setSaveStatus('saved');
      setSaveMessage('Saved!');
      setTimeout(() => { setSaveStatus('idle'); setSaveMessage(''); }, 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      const message = err instanceof Error ? err.message : 'Save failed';
      setSaveMessage(message);
      setTimeout(() => { setSaveStatus('idle'); setSaveMessage(''); }, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [survey, apiBaseUrl]);

  const addNewQuestion = useCallback(() => {
    if (!survey) return;
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      question: 'New Question',
      type: 'short_answer',
      required: false,
    };
    const updated = { ...survey, questions: [...survey.questions, newQuestion] };
    setSurvey(updated);
    setActiveQuestionIndex(updated.questions.length - 1);
  }, [survey]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    updated.questions[index] = { ...updated.questions[index], [field]: value };
    setSurvey(updated);
  };

  const updateQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[qIndex] };
    q.options = [...(q.options || [])];
    q.options[optIndex] = value;
    updated.questions[qIndex] = q;
    setSurvey(updated);
  };

  const addOption = (qIndex: number) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[qIndex] };
    q.options = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
    updated.questions[qIndex] = q;
    setSurvey(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[qIndex] };
    q.options = [...(q.options || [])];
    q.options.splice(optIndex, 1);
    updated.questions[qIndex] = q;
    setSurvey(updated);
  };

  const deleteQuestion = (index: number) => {
    if (!survey || survey.questions.length <= 1) return;
    const updated = { ...survey };
    updated.questions = updated.questions.filter((_, i) => i !== index);
    setSurvey(updated);
    if (activeQuestionIndex >= updated.questions.length) {
      setActiveQuestionIndex(Math.max(0, updated.questions.length - 1));
    }
  };

  const changeQuestionType = (index: number, newType: string) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[index], type: newType as Question['type'] };
    if ((newType === 'multiple_choice' || newType === 'yes_no' || newType === 'radio') && (!q.options || q.options.length === 0)) {
      q.options = newType === 'yes_no' ? ['Yes', 'No'] : ['Option 1', 'Option 2'];
    }
    updated.questions[index] = q;
    setSurvey(updated);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!survey) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= survey.questions.length) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    [updated.questions[index], updated.questions[newIndex]] = [updated.questions[newIndex], updated.questions[index]];
    setSurvey(updated);
    setActiveQuestionIndex(newIndex);
  };

  if (isLoading) return <OptimizedLoader type="page" message="Loading survey editor..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Survey not found</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  const activeQ = survey.questions[activeQuestionIndex];
  const typeIcon = QUESTION_TYPES.find(t => t.value === activeQ?.type)?.icon || '✎';
  const hasOptions = activeQ && (activeQ.type === 'multiple_choice' || activeQ.type === 'yes_no' || activeQ.type === 'radio');
  const theme = getTheme(survey.template_type || 'custom');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0">
        <div className="px-3 sm:px-6 flex items-center justify-between h-12 sm:h-14 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs sm:text-sm transition-colors flex-shrink-0">
              <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <input
              type="text"
              value={survey.title || ''}
              onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
              className="text-xs sm:text-sm font-semibold text-gray-900 bg-transparent border-none outline-none min-w-0 flex-1 max-w-[140px] sm:max-w-[220px] hover:bg-gray-50 focus:bg-gray-50 rounded px-1 sm:px-2 py-1 transition-colors"
              placeholder="Untitled Survey"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings size={12} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={() => { setShareLinkRevealed(false); setShowSharePopup(true); setTimeout(() => setShareLinkRevealed(true), 1800); }}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 size={12} /> <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors text-[10px] sm:text-xs font-medium"
            >
              <Save size={12} /> {isSaving ? '...' : 'Save'}
            </button>
          </div>
        </div>
        {/* Inline description below title */}
        <div className="px-4 sm:px-6 pb-2">
          <input
            type="text"
            value={survey.subtitle || ''}
            onChange={(e) => setSurvey({ ...survey, subtitle: e.target.value })}
            className="text-xs text-gray-400 bg-transparent border-none outline-none w-full max-w-md hover:bg-gray-50 focus:bg-gray-50 rounded px-2 py-1 transition-colors"
            placeholder="Add a description..."
          />
        </div>
      </div>

      {/* ── Settings Modal (floating) ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'editorModalIn 0.25s ease-out' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Settings size={15} /> Survey Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <Grid3X3 size={12} /> Choose a Template
              </label>
              <TemplateSelector
                selectedTemplate={survey.template_type || 'custom'}
                onSelectTemplate={(newTemplate) => setSurvey({ ...survey, template_type: newTemplate })}
                isDarkMode={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Share Popup (floating, animated with celebration) ── */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowSharePopup(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'editorModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* Celebration phase */}
            {!shareLinkRevealed && (
              <div className="px-6 py-12 text-center relative overflow-hidden">
                {/* Floating particles */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        width: i % 3 === 0 ? 8 : 6,
                        height: i % 3 === 0 ? 8 : 6,
                        borderRadius: i % 2 === 0 ? '50%' : '2px',
                        background: ['#C4785C', '#E8B4A0', '#2D2520', '#D4C5B3', '#9B9189', '#F5F1E8'][i % 6],
                        left: `${10 + (i * 7.5)}%`,
                        top: '-10px',
                        opacity: 0,
                        animation: `shareConfetti 1.8s ${i * 0.1}s ease-out forwards`,
                      }}
                    />
                  ))}
                </div>
                {/* Chilli icon pulse */}
                <div style={{ animation: 'sharePulse 0.6s ease-out' }}>
                  <img
                    src="https://i.postimg.cc/439WS89h/chilllllllli.png"
                    alt=""
                    style={{ width: 48, height: 48, margin: '0 auto 16px', objectFit: 'contain' }}
                  />
                </div>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700,
                  color: '#2D2520', marginBottom: 6,
                  animation: 'shareTextIn 0.5s 0.2s ease-out both',
                }}>
                  Your survey is ready!
                </h3>
                <p style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#9B9189',
                  animation: 'shareTextIn 0.5s 0.4s ease-out both',
                }}>
                  Generating your share link...
                </p>
                {/* Loading dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#C4785C',
                      animation: `shareDot 1s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Link revealed phase */}
            {shareLinkRevealed && (
              <div style={{ animation: 'shareReveal 0.4s ease-out' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Share2 size={15} /> Share Survey
                  </h3>
                  <button onClick={() => setShowSharePopup(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Survey Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-xs bg-gray-50 truncate font-mono"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                      >
                        {copied ? <><CheckCircle size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                  </div>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={13} /> Open in New Tab
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Animation Settings Modal ── */}
      {showAnimationPanel && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowAnimationPanel(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'editorModalIn 0.25s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Zap size={15} className="text-purple-500" /> Animation Settings
              </h3>
              <button onClick={() => setShowAnimationPanel(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
              {/* Two-column: Question & Answer animations */}
              <div className="grid grid-cols-2 gap-5">
                {/* Question Animation */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Question Animation</label>
                  <div className="space-y-1">
                    {QUESTION_ANIMATIONS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => updateAnimation('questionAnimation', a.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                          animConfig.questionAnimation === a.value
                            ? 'bg-purple-100 text-purple-700 font-medium ring-1 ring-purple-200'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base w-5 text-center">{a.icon}</span>
                        <div className="text-left">
                          <div>{a.label}</div>
                          <div className="text-[9px] text-gray-400">{a.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Answer Animation */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Answer Animation</label>
                  <div className="space-y-1">
                    {ANSWER_ANIMATIONS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => updateAnimation('answerAnimation', a.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                          animConfig.answerAnimation === a.value
                            ? 'bg-purple-100 text-purple-700 font-medium ring-1 ring-purple-200'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base w-5 text-center">{a.icon}</span>
                        <div className="text-left">
                          <div>{a.label}</div>
                          <div className="text-[9px] text-gray-400">{a.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliders row */}
              <div className="grid grid-cols-2 gap-5">
                {/* Delay */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Delay <span className="text-gray-400 normal-case font-normal">({animConfig.delayMs}ms)</span>
                  </label>
                  <input
                    type="range" min={0} max={2000} step={50}
                    value={animConfig.delayMs}
                    onChange={e => updateAnimation('delayMs', parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>None</span><span>2s</span>
                  </div>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Speed <span className="text-gray-400 normal-case font-normal">({animConfig.speedMs}ms)</span>
                  </label>
                  <input
                    type="range" min={200} max={1500} step={50}
                    value={animConfig.speedMs}
                    onChange={e => updateAnimation('speedMs', parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Fast</span><span>Slow</span>
                  </div>
                </div>
              </div>

              {/* Auto Advance */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Auto-advance</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Automatically move to next question after answering</p>
                  </div>
                  <div
                    onClick={() => updateAnimation('autoAdvance', !animConfig.autoAdvance)}
                    className={`w-10 h-[22px] rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      animConfig.autoAdvance ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      animConfig.autoAdvance ? 'translate-x-[22px]' : 'translate-x-[3px]'
                    }`} />
                  </div>
                </label>

                {animConfig.autoAdvance && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Advance Delay <span className="text-gray-400 normal-case font-normal">({(animConfig.autoAdvanceDelay / 1000).toFixed(1)}s)</span>
                    </label>
                    <input
                      type="range" min={500} max={5000} step={250}
                      value={animConfig.autoAdvanceDelay}
                      onChange={e => updateAnimation('autoAdvanceDelay', parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0.5s</span><span>5s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
              <button
                onClick={() => setShowAnimationPanel(false)}
                className="px-5 py-2 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main 3-Panel Layout ── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* ── Left Panel: Question List ── */}
        <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0 max-h-[35vh] md:max-h-none">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</span>
            <button
              onClick={addNewQuestion}
              className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1 flex md:flex-col flex-row md:overflow-x-hidden overflow-x-auto">
            {(survey.questions || []).map((q, index) => {
              const qTypeIcon = QUESTION_TYPES.find(t => t.value === q.type)?.icon || '✎';
              return (
                <button
                  key={q.id || index}
                  onClick={() => setActiveQuestionIndex(index)}
                  className={`text-left px-3 md:px-4 py-2.5 md:py-3 flex items-start gap-2 md:gap-3 transition-colors border-l-3 min-w-[120px] md:min-w-0 flex-shrink-0 md:flex-shrink md:w-full ${
                    index === activeQuestionIndex
                      ? 'bg-red-50 border-l-[3px] border-l-red-500'
                      : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                    index === activeQuestionIndex ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${index === activeQuestionIndex ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {q.question || 'Untitled'}
                    </p>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      {qTypeIcon} {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Center Panel: Paper & Pin Editor ── */}
        <div className="flex-1 flex items-center justify-center overflow-y-auto" style={{
          background: theme.bg,
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
          transition: 'background 0.4s ease',
        }}>
          {activeQ ? (
            <div style={{ position: 'relative', maxWidth: 560, width: '100%', margin: '40px 20px' }}>
              {/* Pin icon */}
              <div style={{
                position: 'absolute', top: -22, left: 28, width: 44, height: 44, zIndex: 20,
                transform: 'rotate(-25deg)',
                filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2))',
                pointerEvents: 'none',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="44" height="44">
                  <path fill={theme.pin} d="M288.6 76.8C344.8 20.6 436 20.6 492.2 76.8C548.4 133 548.4 224.2 492.2 280.4L328.2 444.4C293.8 478.8 238.1 478.8 203.7 444.4C169.3 410 169.3 354.3 203.7 319.9L356.5 167.3C369 154.8 389.3 154.8 401.8 167.3C414.3 179.8 414.3 200.1 401.8 212.6L249 365.3C239.6 374.7 239.6 389.9 249 399.2C258.4 408.5 273.6 408.6 282.9 399.2L446.9 235.2C478.1 204 478.1 153.3 446.9 122.1C415.7 90.9 365 90.9 333.8 122.1L169.8 286.1C116.7 339.2 116.7 425.3 169.8 478.4C222.9 531.5 309 531.5 362.1 478.4L492.3 348.3C504.8 335.8 525.1 335.8 537.6 348.3C550.1 360.8 550.1 381.1 537.6 393.6L407.4 523.6C329.3 601.7 202.7 601.7 124.6 523.6C46.5 445.5 46.5 318.9 124.6 240.8L288.6 76.8z"/>
                </svg>
              </div>

              {/* Paper card with rough edges */}
              <div style={{
                background: theme.paper,
                position: 'relative',
                clipPath: 'polygon(0.5% 0.8%, 3% 0.2%, 6% 1%, 9% 0.3%, 12% 0.9%, 16% 0.1%, 20% 0.7%, 24% 0.2%, 28% 1%, 32% 0.4%, 36% 0.8%, 40% 0.1%, 44% 0.6%, 48% 0.3%, 52% 0.9%, 56% 0.2%, 60% 0.7%, 64% 0.1%, 68% 0.8%, 72% 0.3%, 76% 1%, 80% 0.2%, 84% 0.6%, 88% 0.1%, 92% 0.9%, 95% 0.4%, 98% 0.8%, 100% 0.5%, 99.5% 4%, 100% 8%, 99.2% 12%, 99.8% 16%, 99.1% 20%, 99.6% 24%, 99.3% 28%, 99.9% 32%, 99.2% 36%, 99.7% 40%, 99.1% 44%, 99.5% 48%, 99.8% 52%, 99.2% 56%, 99.6% 60%, 99.1% 64%, 99.8% 68%, 99.3% 72%, 99.7% 76%, 99.1% 80%, 99.5% 84%, 99.8% 88%, 99.2% 92%, 99.6% 96%, 99.3% 100%, 96% 99.5%, 92% 99.9%, 88% 99.2%, 84% 99.7%, 80% 99.1%, 76% 99.6%, 72% 99.3%, 68% 99.8%, 64% 99.1%, 60% 99.5%, 56% 99.9%, 52% 99.2%, 48% 99.7%, 44% 99.1%, 40% 99.6%, 36% 99.3%, 32% 99.8%, 28% 99.1%, 24% 99.5%, 20% 99.9%, 16% 99.2%, 12% 99.7%, 8% 99.1%, 4% 99.6%, 1% 99.3%, 0% 99.5%, 0.5% 96%, 0% 92%, 0.8% 88%, 0.2% 84%, 0.9% 80%, 0.3% 76%, 0.7% 72%, 0.1% 68%, 0.8% 64%, 0.3% 60%, 0.6% 56%, 0.1% 52%, 0.9% 48%, 0.4% 44%, 0.7% 40%, 0.2% 36%, 0.8% 32%, 0.3% 28%, 0.6% 24%, 0.1% 20%, 0.9% 16%, 0.4% 12%, 0.7% 8%, 0.2% 4%)',
                boxShadow: '2px 3px 8px rgba(0,0,0,0.12), 4px 6px 20px rgba(0,0,0,0.08)',
                padding: '48px 44px 40px',
                transition: 'background 0.4s ease',
              }}>
                {/* Paper texture overlay */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.7,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,90,43,0.02) 31px, rgba(139,90,43,0.02) 32px), repeating-linear-gradient(90deg, transparent, transparent 47px, rgba(139,90,43,0.01) 47px, rgba(139,90,43,0.01) 48px)',
                }} />

                {/* Chilli logo + question counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                  <img
                    src="https://i.postimg.cc/439WS89h/chilllllllli.png"
                    alt="PepperAds"
                    style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 28, height: 28, background: theme.accent, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 700,
                      boxShadow: `0 2px 6px ${theme.accentShadow}`,
                      transition: 'background 0.4s ease',
                    }}>
                      {activeQuestionIndex + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.textLight, textTransform: 'uppercase', letterSpacing: 1 }}>
                      of {survey.questions.length} · {typeIcon} {QUESTION_TYPES.find(t => t.value === activeQ.type)?.label}
                    </span>
                  </div>
                </div>

                {/* Editable question text */}
                <input
                  type="text"
                  value={activeQ.question}
                  onChange={(e) => updateQuestion(activeQuestionIndex, 'question', e.target.value)}
                  placeholder="Type your question here..."
                  style={{
                    width: '100%', fontSize: 22, fontWeight: 600, color: theme.text,
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Outfit', sans-serif", marginBottom: 6,
                    borderBottom: `2px dashed ${theme.dashed}`, paddingBottom: 6,
                    position: 'relative', zIndex: 1,
                  }}
                />

                {/* Description */}
                <input
                  type="text"
                  value={activeQ.questionDescription || ''}
                  onChange={(e) => updateQuestion(activeQuestionIndex, 'questionDescription', e.target.value)}
                  placeholder="Description (optional)"
                  style={{
                    width: '100%', fontSize: 14, color: theme.textLight, fontStyle: 'italic',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Outfit', sans-serif", marginBottom: 28,
                    position: 'relative', zIndex: 1,
                  }}
                />

                {/* ── Inline answer editing ── */}
                <div style={{ position: 'relative', zIndex: 1 }}>

                  {/* Multiple Choice / Yes-No / Radio */}
                  {hasOptions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(activeQ.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            width: 34, height: 34, borderRadius: 8,
                            border: `1px solid ${theme.border}`, background: theme.paperInner,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: theme.textLight, flexShrink: 0,
                            fontFamily: "'Outfit', sans-serif",
                          }}>
                            {OPTION_KEYS[optIdx] || optIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateQuestionOption(activeQuestionIndex, optIdx, e.target.value)}
                            placeholder={`Choice ${optIdx + 1}`}
                            style={{
                              flex: 1, padding: '10px 14px',
                              border: `1px solid ${theme.border}`, borderRadius: 8,
                              fontSize: 14, color: theme.text, background: theme.paperInner,
                              fontFamily: "'Outfit', sans-serif", outline: 'none',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accentShadow}`; }}
                            onBlur={(e) => { e.target.style.borderColor = theme.border; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                          />
                          <button
                            onClick={() => removeOption(activeQuestionIndex, optIdx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ padding: 4, color: theme.textLight, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(activeQuestionIndex)}
                        style={{
                          marginLeft: 46, marginTop: 4, fontSize: 13, fontWeight: 600,
                          color: theme.accent, background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        <Plus size={13} /> Add choice
                      </button>
                    </div>
                  )}

                  {/* Short Answer */}
                  {activeQ.type === 'short_answer' && (
                    <div style={{
                      borderBottom: `2px solid ${theme.border}`, paddingBottom: 8, maxWidth: 380,
                    }}>
                      <span style={{ fontSize: 14, color: theme.textLight, fontStyle: 'italic', fontFamily: "'Outfit', sans-serif" }}>
                        Respondent's answer will appear here...
                      </span>
                    </div>
                  )}

                  {/* Rating */}
                  {activeQ.type === 'rating' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} style={{
                          width: 48, height: 48, borderRadius: '50%',
                          border: `2px solid ${theme.border}`, background: theme.paperInner,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700, color: theme.textLight,
                          fontFamily: "'Outfit', sans-serif",
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}>
                          {n}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Scale */}
                  {activeQ.type === 'range' && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: theme.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, fontFamily: "'Outfit', sans-serif" }}>
                        <span>Not at all</span>
                        <span>Extremely</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                          <div key={n} style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: `2px solid ${theme.border}`, background: theme.paperInner,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: theme.textLight,
                            fontFamily: "'Outfit', sans-serif",
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          }}>
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Powered by - below the paper */}
              <div style={{
                textAlign: 'center', fontSize: 12, color: theme.textLight,
                fontFamily: "'Outfit', sans-serif", marginTop: 16, paddingBottom: 8,
              }}>
                Powered by <span style={{ color: theme.accent, fontWeight: 600 }}>PepperAds</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: theme.textLight, fontFamily: "'Outfit', sans-serif" }}>
              <p style={{ fontSize: 18, marginBottom: 12 }}>No questions yet</p>
              <button
                onClick={addNewQuestion}
                style={{
                  fontSize: 14, color: theme.accent, fontWeight: 600, background: 'none',
                  border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <Plus size={14} /> Add your first question
              </button>
            </div>
          )}
        </div>

        {/* ── Right Panel: Question Settings ── */}
        {activeQ && (
          <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto max-h-[40vh] md:max-h-none">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question Settings</h3>
            </div>
            <div className="px-4 md:px-5 py-3 md:py-4 space-y-4 md:space-y-5 flex-1">
              {/* Question Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Type</label>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
                  {QUESTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => changeQuestionType(activeQuestionIndex, t.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeQ.type === t.value
                          ? 'bg-red-50 text-red-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reorder */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Reorder</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => moveQuestion(activeQuestionIndex, 'up')}
                    disabled={activeQuestionIndex === 0}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp size={14} /> Move Up
                  </button>
                  <button
                    onClick={() => moveQuestion(activeQuestionIndex, 'down')}
                    disabled={activeQuestionIndex === survey.questions.length - 1}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown size={14} /> Move Down
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <button
                  onClick={() => setShowAnimationPanel(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100"
                >
                  <Zap size={13} /> Animation Settings
                </button>

                <button
                  onClick={() => deleteQuestion(activeQuestionIndex)}
                  disabled={survey.questions.length <= 1}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={13} /> Delete Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Save Status Toast ── */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto px-4 py-2.5 rounded-lg shadow-lg z-50 flex items-center justify-center sm:justify-start gap-2 text-sm ${
          saveStatus === 'saved' ? 'bg-green-500 text-white' : saveStatus === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {saveStatus === 'saving' && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />}
          <span className="font-medium">{saveMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SurveyEditor;
