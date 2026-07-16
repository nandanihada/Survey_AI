import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSurvey, parseImage } from '../utils/api';
import { Loader2, Sparkles, ImagePlus, Check, X, ArrowRight, Lightbulb, ChevronDown, Eye, Share2, BarChart2, Zap, Lock, Mail, ChevronRight, Hash, Edit3, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateSurveyLink } from '../utils/surveyLinkUtils';
import { parsePrompt as parsePromptFn, getClarificationNeeds as getClarificationNeedsFn, ClarificationNeeds as ClarificationNeedsType } from '../utils/promptParser';
import SurveyClarification, { ClarificationAnswers as ClarificationAnswersType } from './SurveyClarification';
import SearchLoader from './SearchLoader';

interface Question {
  id: string;
  text: string;
  question?: string;
  type: string;
  options?: string[];
}

interface SurveyData {
  survey_id: string;
  questions: Question[];
  template_type: string;
  theme: { font: string; intent: string; colors: { primary: string; background: string; text: string } };
  prompt: string;
  animationSpeed: number;
}

interface SurveyFormProps {
  isDarkMode?: boolean;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const SurveyForm: React.FC<SurveyFormProps> = ({ isDarkMode = false }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [surveyTopic, setSurveyTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSurvey, setGeneratedSurvey] = useState<SurveyData | null>(null);
  const [error, setError] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [imageContext, setImageContext] = useState('');
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ label: string; prompt: string } | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const toneDropdownRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showQsDropdown, setShowQsDropdown] = useState(false);
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationNeeds, setClarificationNeeds] = useState<ClarificationNeedsType | null>(null);

  const [wizardStep, setWizardStep] = useState(-1);
  const [wizardAnswers, setWizardAnswers] = useState<Record<number, string>>({});
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [contextualQuestion, setContextualQuestion] = useState<{question: string; options: string[]} | null>(null);
  const [isFetchingContextual, setIsFetchingContextual] = useState(false);

  const WIZARD_STEPS = [
    {
      id: 'purpose',
      question: "Let's start with your goal",
      options: ["Customer feedback", "Market research", "Educational / academic", "Personal / casual", "Lead generation"],
      moreOptions: ["Employee check-in", "Product experience", "Training feedback", "Website experience", "Onboarding review", "Event feedback"],
      inputType: 'options'
    },
    {
      id: 'audience',
      question: "Who is this survey for?",
      options: ["Customers", "Friends / personal network", "Students", "Employees / team", "General public"],
      inputType: 'options'
    },
    {
      id: 'tone',
      question: "What tone should your survey have?",
      options: ["Professional", "Friendly", "Casual", "Academic", "Direct"],
      inputType: 'options'
    },
    {
      id: 'collect',
      question: "Do you want to collect respondent details?",
      options: ["Yes (Name, Email, Phone)", "Only Email", "No (keep it anonymous)"],
      inputType: 'options'
    },
    {
      id: 'depth',
      question: "How detailed should the survey be?",
      options: ["Quick (5–7 questions)", "Balanced (8–12 questions)", "Detailed (15+ questions)"],
      inputType: 'options'
    }
  ];



  const SUGGESTION_PROMPTS = [
    { icon: '/icons/star.svg', gradient: 'linear-gradient(135deg, #ff7e5f, #feb47b)', label: 'Customer Feedback', prompt: 'Customer satisfaction survey to understand how happy our customers are with our product quality, support experience, and overall service' },
    { icon: '/icons/users.svg', gradient: 'linear-gradient(135deg, #6a11cb, #2575fc)', label: 'Employee Check-in', prompt: 'Employee engagement and well-being check-in covering job satisfaction, work-life balance, team collaboration, and career growth' },
    { icon: '/icons/cart.svg', gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)', label: 'Product Experience', prompt: 'Product feedback survey about usability, features, pricing satisfaction, and what improvements users would like to see' },
    { icon: '/icons/graduation.svg', gradient: 'linear-gradient(135deg, #f857a6, #ff5858)', label: 'Training Feedback', prompt: 'Post-training feedback survey evaluating content quality, instructor effectiveness, practical applicability, and suggestions for improvement' },
    { icon: '/icons/globe.svg', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)', label: 'Website Experience', prompt: 'Website user experience survey covering navigation ease, page load speed, content relevance, design appeal, and conversion barriers' },
    { icon: '/icons/rocket.svg', gradient: 'linear-gradient(135deg, #fc5c7d, #6a82fb)', label: 'Onboarding Review', prompt: 'New user onboarding experience survey about setup ease, documentation clarity, time to first value, and support quality' },
    { icon: '/icons/calendar.svg', gradient: 'linear-gradient(135deg, #f2994a, #f2c94c)', label: 'Event Feedback', prompt: 'Post-event feedback survey covering event organization, speaker quality, networking opportunities, venue satisfaction, and likelihood to attend again' },
    { icon: '/icons/handshake.svg', gradient: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)', label: 'Team Collaboration', prompt: 'Team collaboration and communication survey about meeting effectiveness, tool satisfaction, cross-team coordination, and remote work experience' },
    { icon: '/icons/phone.svg', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', label: 'App Usability', prompt: 'Mobile app usability survey covering interface design, feature discoverability, performance, crash frequency, and feature requests' },
    { icon: '/icons/heart.svg', gradient: 'linear-gradient(135deg, #ff512f, #dd2476)', label: 'Service Cancellation', prompt: 'Service cancellation feedback survey to understand reasons for leaving, what could have been done differently, and likelihood of returning' },
  ];

  const SUB_PROMPTS: Record<string, string[]> = {
    'Customer Feedback': [
      'Post-purchase satisfaction survey',
      'Customer support experience rating',
      'Product quality & value for money',
      'Net Promoter Score (NPS) survey',
      'Customer loyalty & retention feedback',
    ],
    'Employee Check-in': [
      'Weekly mood & wellness pulse check',
      'Manager effectiveness feedback',
      'Work-life balance assessment',
      'Career growth & development needs',
      'Workplace culture & belonging survey',
    ],
    'Product Experience': [
      'Feature usage & satisfaction survey',
      'Pricing perception & willingness to pay',
      'Competitor comparison feedback',
      'New feature request prioritization',
      'Onboarding & first-use experience',
    ],
    'Training Feedback': [
      'Instructor & content quality rating',
      'Knowledge retention assessment',
      'Training format preference survey',
      'Skill gap identification quiz',
      'Post-workshop action plan check-in',
    ],
    'Website Experience': [
      'Navigation & findability test',
      'Checkout flow friction survey',
      'Content relevance & clarity feedback',
      'Mobile vs desktop experience comparison',
      'Page speed & performance perception',
    ],
    'Onboarding Review': [
      'First-week experience survey',
      'Documentation clarity rating',
      'Setup & integration ease check',
      'Time-to-value measurement',
      'Onboarding support satisfaction',
    ],
    'Event Feedback': [
      'Speaker & session quality rating',
      'Networking opportunity feedback',
      'Venue & logistics satisfaction',
      'Content relevance to my role',
      'Future topic & format preferences',
    ],
    'Team Collaboration': [
      'Meeting effectiveness & frequency review',
      'Communication tools satisfaction',
      'Cross-team coordination & blockers',
      'Remote vs in-office collaboration',
      'Knowledge sharing & documentation quality',
    ],
    'App Usability': [
      'UI navigation & intuitiveness test',
      'Feature discoverability survey',
      'Performance & crash reporting',
      'Accessibility & inclusive design audit',
      'Push notification preference survey',
    ],
    'Service Cancellation': [
      'Primary reason for leaving survey',
      'Price sensitivity & competitor comparison',
      'Feature gap that caused churn',
      'Win-back offer effectiveness test',
      'Last-chance retention feedback',
    ],
  };

  // Close suggestions popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowAllSuggestions(false);
      }
    };
    if (showSuggestions) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Close Qs dropdown on outside click
  const qsDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showQsDropdown) return;
    const handler = (e: MouseEvent) => {
      if (qsDropdownRef.current && !qsDropdownRef.current.contains(e.target as Node)) {
        setShowQsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showQsDropdown]);

  const handleSelectSuggestion = (suggestion: typeof SUGGESTION_PROMPTS[0]) => {
    setSelectedSuggestion({ label: suggestion.label, prompt: suggestion.prompt });
    setShowSuggestions(false);
    setShowAllSuggestions(false);
  };

  const loadingMessages = [
    'Understanding your goal...',
    'Designing relevant questions...',
    'Optimizing for better responses...',
    'Finalizing your survey...',
  ];

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    if (imagePreview.length >= 3) { setError('Maximum 3 images allowed'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(prev => [...prev, base64]);
      setIsParsingImage(true);
      setError('');
      try {
        const extracted = await parseImage(base64);
        setImageContext(prev => prev ? `${prev}\n${extracted}` : extracted);
        if (!surveyTopic.trim()) setSurveyTopic('Survey based on uploaded content');
      } catch { setError('Could not parse image. Describe your survey manually.'); }
      finally { setIsParsingImage(false); }
    };
    reader.readAsDataURL(file);
  }, [surveyTopic, imagePreview.length]);

  const removeImage = (index: number) => {
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    // Re-parse remaining images would be complex, so just clear context if all removed
    if (imagePreview.length <= 1) {
      setImageContext('');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartWizard = async () => {
    if (!surveyTopic.trim() && !imageContext && !selectedSuggestion) { 
      setError('Please enter a survey topic or pick a suggestion'); 
      return; 
    }
    setError('');
    setShowMoreOptions(false);

    // Parse prompt to see what's clear and what needs clarification
    const promptText = selectedSuggestion
      ? (surveyTopic.trim() ? `${selectedSuggestion.prompt}. Additionally: ${surveyTopic.trim()}` : selectedSuggestion.prompt)
      : surveyTopic.trim();

    const parsed = parsePromptFn(promptText, questionCount);
    const needs = getClarificationNeedsFn(parsed, questionCount !== 10);

    // Check if ANYTHING needs clarification
    const needsAnything = needs.needsTopic || needs.needsQuestionCount || needs.needsAudience || needs.needsDataCollection || needs.needsTone;

    if (!needsAnything) {
      // Everything is clear — go straight to generation
      const directAnswers: Record<number, string> = {};
      if (parsed.audience) directAnswers[1] = parsed.audience;
      if (parsed.dataCollection) directAnswers[3] = parsed.dataCollection;
      handleFinalGenerateSurvey(directAnswers, {
        questionCount: parsed.questionCount || questionCount,
        audience: parsed.audience || undefined,
        dataCollection: parsed.dataCollection || 'anonymous',
      });
    } else {
      // Show clarification panel inline (the one inside the prompt area)
      setShowClarification(true);
      setClarificationNeeds(needs);
    }
  };

  const handleClarificationSubmit = async (answers: ClarificationAnswersType) => {
    setShowClarification(false);
    const merged: Record<number, string> = {};
    if (answers.audience) merged[1] = answers.audience;
    if (answers.dataCollection) merged[3] = answers.dataCollection;
    if (answers.questionCount) setQuestionCount(answers.questionCount);
    if (answers.topic) setSurveyTopic(answers.topic);
    handleFinalGenerateSurvey(merged, answers);
  };

  const handleClarificationCancel = () => {
    setShowClarification(false);
  };

  const handleNextStep = async (answer?: string) => {
    let actualAnswer = answer || 'Skipped';

    const newAnswers = { ...wizardAnswers, [wizardStep]: actualAnswer };
    setWizardAnswers(newAnswers);
    setShowMoreOptions(false);

    if (actualAnswer === 'Skip' || actualAnswer === 'Skipped') {
      setWizardStep(99); 
      handleFinalGenerateSurvey({...newAnswers, [wizardStep]: 'Skip'});
      return;
    }

    if (wizardStep + 1 < WIZARD_STEPS.length) {
      setWizardStep(wizardStep + 1);
    } else {
      // All wizard steps done — fetch AI contextual question
      const promptText = surveyTopic || selectedSuggestion?.prompt || '';
      if (promptText.length > 10 && !contextualQuestion) {
        setIsFetchingContextual(true);
        try {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const apiBase = isLocal ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
          const res = await fetch(`${apiBase}/api/contextual-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
          });
          if (res.ok) {
            const cData = await res.json();
            if (cData.question && cData.options) {
              setContextualQuestion(cData);
              setIsFetchingContextual(false);
              setWizardStep(WIZARD_STEPS.length); // Show contextual question step
              return;
            }
          }
        } catch {}
        setIsFetchingContextual(false);
      }
      setWizardStep(99); 
      handleFinalGenerateSurvey(newAnswers);
    }
  };

  const handleFinalGenerateSurvey = useCallback(async (finalAnswers: Record<number, string>, clarificationAnswers?: ClarificationAnswersType) => {
    setIsLoading(true); setError(''); setLoadingPhase(0);
    setWizardStep(99);
    const phaseInterval = setInterval(() => setLoadingPhase(p => p < 3 ? p + 1 : p), 2000);
    try {
      // Merge user prompt with hidden suggestion context
      // Use clarification topic if provided (overrides vague prompt)
      let finalPrompt = (clarificationAnswers?.topic || surveyTopic).trim();
      if (selectedSuggestion) {
        finalPrompt = finalPrompt
          ? `${selectedSuggestion.prompt}. Additionally: ${finalPrompt}`
          : selectedSuggestion.prompt;
      }
      
      // Append gathered context from clarification
      if (clarificationAnswers?.audience) finalPrompt += `\nAudience: ${clarificationAnswers.audience}`;
      if (clarificationAnswers?.dataCollection) finalPrompt += `\nData Collection: ${clarificationAnswers.dataCollection}`;
      if (clarificationAnswers?.tone) finalPrompt += `\nTone: ${clarificationAnswers.tone}`;
      else finalPrompt += `\nTone: ${selectedTone}`;
      if (clarificationAnswers?.aiContext) finalPrompt += `\nContext: ${clarificationAnswers.aiContext}`;
      if (finalAnswers[1] && finalAnswers[1] !== 'Skip') finalPrompt += `\nAudience: ${finalAnswers[1]}`;
      if (finalAnswers[2] && finalAnswers[2] !== 'Skip') finalPrompt += `\nTone: ${finalAnswers[2]}`;
      if (finalAnswers[3] && finalAnswers[3] !== 'Skip') finalPrompt += `\nData Collection: ${finalAnswers[3]}`;

      const finalCount = clarificationAnswers?.questionCount || questionCount;

      const result = await generateSurvey({
        prompt: finalPrompt, template_type: 'custom', question_count: finalCount,
        image_context: imageContext || undefined,
        theme: { font: 'DM Sans, sans-serif', intent: 'professional', colors: { primary: '#E8503A', background: '#F7F7FB', text: '#2D3142' } },
        topic: (clarificationAnswers?.topic || surveyTopic).trim() || selectedSuggestion?.label || '',
        wizard_answers: { 
          type: clarificationAnswers?.audience || finalAnswers[0],
          audience: clarificationAnswers?.audience || finalAnswers[1],
          collection: clarificationAnswers?.dataCollection || finalAnswers[3],
          tone: clarificationAnswers?.tone || selectedTone || finalAnswers[2],
        }
      });
      clearInterval(phaseInterval);
      setGeneratedSurvey(result);
      setShowResultModal(true);
    } catch (err: unknown) {
      clearInterval(phaseInterval);
      setError(err instanceof Error ? err.message : 'Failed to generate survey');
      setWizardStep(-1);
      setWizardAnswers({});
    } finally { setIsLoading(false); }
  }, [surveyTopic, questionCount, imageContext, selectedSuggestion]);

  const getQuestionText = (q: Question) => q.question || q.text || 'Untitled Question';

  const handleCloseResult = () => {
    setShowResultModal(false);
    // Reset all state to fresh
    setSurveyTopic('');
    setSelectedSuggestion(null);
    setExpandedCategory(null);
    setWizardStep(-1);
    setWizardAnswers({});
    setGeneratedSurvey(null);
    setShowClarification(false);
    setClarificationNeeds(null);
    setQuestionCount(10);
    setImagePreview([]);
    setImageContext('');
    setError('');
  };

  const handleShareLink = async () => {
    if (generatedSurvey) {
      const link = generateSurveyLink(generatedSurvey.survey_id);
      
      try {
        if (navigator.share) {
          await navigator.share({
            title: surveyTopic || 'Survey',
            text: 'Hey! Take this quick 2-minute survey. Would love your feedback!',
            url: link,
          });
        } else {
          await navigator.clipboard.writeText(`Hey! Take this quick 2-minute survey 👉 ${link}`);
          setShareLinkCopied(true);
          setTimeout(() => setShareLinkCopied(false), 3000);
        }
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleViewResponses = () => {
    if (generatedSurvey) {
      window.open(`/dashboard/responses/${generatedSurvey.survey_id}`, '_blank');
    }
  };

  const handleLogin = () => {
    setIsLoginMode(true);
  };

  const handleSignup = () => {
    setIsLoginMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      navigate(`/dashboard/responses/${generatedSurvey?.survey_id}`);
      setShowLoginPrompt(false);
    }
  };
  const normalizeType = (type: string): string => {
    switch (type) {
      case 'multiple_choice': case 'yes_no': case 'radio': return 'choice';
      case 'short_answer': case 'text': return 'text';
      case 'rating': case 'opinion_scale': case 'scale': case 'range': return 'scale';
      default: return 'text';
    }
  };

  return (
    <>
    {/* Full-page Gooey Loader */}
    {isLoading && <SearchLoader message={loadingMessages[loadingPhase]} />}

    <div className="flex flex-col items-center justify-center min-h-[70vh] px-3 sm:px-4 pt-6 sm:pt-10">
      <div className="w-full max-w-[90%] sm:max-w-xl lg:max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1
            className={`text-[1.4rem] sm:text-[1.7rem] lg:text-[2rem] font-semibold tracking-[-0.01em] leading-[1.3] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What would you like to <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">create</span> today?
          </h1>
        </div>

        {wizardStep === -1 && (
        <>
        {/* ── Clarification Panel (above prompt box) ── */}
        {showClarification && clarificationNeeds && (
          <div className="mb-4">
            <SurveyClarification
              needs={clarificationNeeds}
              onSubmit={handleClarificationSubmit}
              onCancel={handleClarificationCancel}
              isDarkMode={isDarkMode}
              prompt={surveyTopic || selectedSuggestion?.prompt || ''}
            />
          </div>
        )}

        <div className={`relative rounded-2xl p-1.5 sm:p-2 transition-all duration-500 overflow-visible group ${showClarification ? 'clarification-prompt-down' : ''} ${isDarkMode
            ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/60 shadow-[0_8px_24px_rgba(0,0,0,0.3)] focus-within:shadow-[0_12px_40px_rgba(239,68,68,0.1)] focus-within:border-red-500/40'
            : 'bg-white border border-stone-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] focus-within:shadow-[0_12px_40px_rgba(239,68,68,0.06)] focus-within:border-red-400/40 focus-within:ring-2 focus-within:ring-red-500/[0.04]'
          }`}>

          {imagePreview.length > 0 && (
            <div className="flex gap-2 mx-2 mt-2 mb-1 overflow-x-auto">
              {imagePreview.map((img, idx) => (
                <div key={idx} className={`relative rounded-xl overflow-hidden border flex-shrink-0 ${isDarkMode ? 'border-slate-600' : 'border-stone-200'}`} style={{ width: imagePreview.length === 1 ? '100%' : '120px', height: '64px' }}>
                  <img src={img} alt={`Uploaded ${idx + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80"><X size={8} /></button>
                </div>
              ))}
              {isParsingImage && (
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
                  <Loader2 className="animate-spin text-stone-400" size={14} />
                </div>
              )}
            </div>
          )}
          {selectedSuggestion && (
            <div className="mx-2.5 mt-2 mb-0.5">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold ${isDarkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                <Lightbulb size={11} className="text-amber-500" />
                <span>{selectedSuggestion.label}</span>
                <button onClick={() => { setSelectedSuggestion(null); setExpandedCategory(null); setSurveyTopic(''); }} className={`ml-0.5 p-0.5 rounded transition-colors ${isDarkMode ? 'hover:bg-amber-500/20' : 'hover:bg-amber-200'}`}>
                  <X size={10} />
                </button>
              </div>
            </div>
          )}
          <textarea
            value={surveyTopic} onChange={(e) => setSurveyTopic(e.target.value)}
            placeholder="Describe your survey topic or paste an image..."
            className={`relative w-full px-3.5 sm:px-4 py-3 text-[14px] sm:text-[15px] rounded-xl resize-none border-0 focus:outline-none focus:ring-0 z-10 font-medium ${isDarkMode ? 'bg-transparent text-white placeholder-slate-500' : 'bg-transparent text-slate-800 placeholder-slate-400'
              }`}
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (surveyTopic.trim() || selectedSuggestion)) { e.preventDefault(); handleStartWizard(); } }}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                  e.preventDefault();
                  if (imagePreview.length >= 3) { setError('Maximum 3 images allowed'); return; }
                  const file = items[i].getAsFile();
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const base64 = ev.target?.result as string;
                    setImagePreview(prev => [...prev, base64]);
                    setIsParsingImage(true);
                    setError('');
                    try {
                      const extracted = await parseImage(base64);
                      setImageContext(prev => prev ? `${prev}\n${extracted}` : extracted);
                      if (!surveyTopic.trim()) setSurveyTopic('Survey based on pasted image');
                    } catch { setError('Could not parse image. Describe your survey manually.'); }
                    finally { setIsParsingImage(false); }
                  };
                  reader.readAsDataURL(file);
                  break;
                }
              }
            }}
          />
          <div className="relative z-10 flex items-center justify-between px-2.5 sm:px-3 pb-2.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isParsingImage || imagePreview.length >= 3}
                className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-stone-400'} disabled:opacity-40`}>
                <ImagePlus size={14} />
              </button>
              {/* Microphone button - uses MediaRecorder + Whisper API */}
              <button
                onClick={async () => {
                  if (isListening) {
                    // Stop recording
                    (window as any).__mediaRecorder?.stop();
                    return;
                  }
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    const chunks: Blob[] = [];
                    (window as any).__mediaRecorder = mediaRecorder;
                    setIsListening(true);

                    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                    mediaRecorder.onstop = async () => {
                      stream.getTracks().forEach(t => t.stop());
                      setIsListening(false);
                      if (chunks.length === 0) return;
                      
                      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                      const formData = new FormData();
                      formData.append('file', audioBlob, 'recording.webm');
                      formData.append('model', 'whisper-1');
                      formData.append('language', 'en');
                      
                      setSurveyTopic(prev => prev + (prev ? ' ' : '') + '⏳ Transcribing...');
                      
                      try {
                        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                        const apiBase = isLocal ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
                        const res = await fetch(`${apiBase}/api/transcribe-audio`, {
                          method: 'POST',
                          body: formData,
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setSurveyTopic(prev => prev.replace('⏳ Transcribing...', '').trim() + (prev.replace('⏳ Transcribing...', '').trim() ? ' ' : '') + data.text);
                        } else {
                          setSurveyTopic(prev => prev.replace('⏳ Transcribing...', '').trim());
                          setError('Failed to transcribe audio. Try again.');
                        }
                      } catch {
                        setSurveyTopic(prev => prev.replace('⏳ Transcribing...', '').trim());
                        setError('Failed to transcribe. Check connection.');
                      }
                    };
                    mediaRecorder.start(250); // collect data every 250ms for silence detection
                    
                    // Silence detection using AudioContext
                    const audioCtx = new AudioContext();
                    const source = audioCtx.createMediaStreamSource(stream);
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 512;
                    source.connect(analyser);
                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    let silenceStart = Date.now();
                    let hasSpeech = false;
                    
                    const checkSilence = () => {
                      if (mediaRecorder.state !== 'recording') return;
                      analyser.getByteFrequencyData(dataArray);
                      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                      
                      if (volume > 10) {
                        silenceStart = Date.now();
                        hasSpeech = true;
                      } else if (hasSpeech && Date.now() - silenceStart > 4000) {
                        // 4 seconds of silence after speech — auto-stop
                        mediaRecorder.stop();
                        audioCtx.close();
                        return;
                      }
                      requestAnimationFrame(checkSilence);
                    };
                    checkSilence();
                    
                    // Auto-stop after 30 seconds max
                    setTimeout(() => { if (mediaRecorder.state === 'recording') { mediaRecorder.stop(); audioCtx.close(); } }, 30000);
                  } catch (err: any) {
                    setIsListening(false);
                    setError('Microphone access denied. Allow in browser settings.');
                  }
                }}
                title={isListening ? 'Click to stop recording' : 'Speak your prompt'}
                className={`p-1.5 rounded-lg transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse ring-2 ring-red-300 shadow-lg'
                    : isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-stone-400'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isListening ? (
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  ) : (
                    <>
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </>
                  )}
                </svg>
              </button>
              {/* Custom Question Count Dropdown */}
              <div className="relative" ref={qsDropdownRef}>
                <button
                  onClick={() => setShowQsDropdown(!showQsDropdown)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all ${
                    showQsDropdown
                      ? isDarkMode ? 'bg-slate-600 text-white' : 'bg-stone-200 text-stone-800'
                      : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-150'
                  }`}
                >
                  <Hash size={10} />
                  <span>{questionCount} Qs</span>
                  <ChevronDown size={9} className={`transition-transform ${showQsDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showQsDropdown && (
                  <div
                    className={`absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden z-50 min-w-[90px] ${
                      isDarkMode ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-stone-200'
                    }`}
                    style={{
                      animation: 'sfSuggestIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.1)',
                    }}
                  >
                    {[5, 10, 15, 20, 25, 30, 50].map(n => (
                      <button
                        key={n}
                        onClick={() => { setQuestionCount(n); setShowQsDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          questionCount === n
                            ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'
                            : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {n} Qs
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Tone/Style Selector */}
              <div className="relative" ref={toneDropdownRef}>
                <button
                  onClick={() => setShowToneDropdown(!showToneDropdown)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all ${
                    showToneDropdown
                      ? isDarkMode ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                      : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-150'
                  }`}
                  title="Survey tone"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <span>{selectedTone}</span>
                  <ChevronDown size={9} className={`transition-transform ${showToneDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showToneDropdown && (
                  <div
                    className={`absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden z-50 min-w-[120px] ${
                      isDarkMode ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-stone-200'
                    }`}
                    style={{
                      animation: 'sfSuggestIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.1)',
                    }}
                  >
                    {['Professional', 'Friendly', 'Casual', 'Academic', 'Direct'].map(tone => (
                      <button
                        key={tone}
                        onClick={() => { setSelectedTone(tone); setShowToneDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          selectedTone === tone
                            ? isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'
                            : isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleStartWizard} disabled={(!surveyTopic.trim() && !imageContext && !selectedSuggestion)}
              className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-400 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)] transition-all">
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        </>
        )}

        {wizardStep !== -1 && (
          <div className={`relative rounded-[2rem] p-6 sm:p-8 md:p-10 transition-all duration-500 flex flex-col gap-6 ${
             isDarkMode 
              ? 'bg-slate-900 border border-slate-700/60 shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
              : 'bg-white border border-stone-200 shadow-[0_16px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
          }`}>
              {/* Generation Loading State */}
              {wizardStep === 99 && isLoading && null}

              {/* AI Contextual Question (shows after all wizard steps) */}
              {wizardStep === WIZARD_STEPS.length && contextualQuestion && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[11px] sm:text-xs font-bold tracking-widest text-purple-500 uppercase mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} /> AI Question
                    </span>
                    <h2 className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {contextualQuestion.question}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {contextualQuestion.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          // Append contextual answer to prompt and generate
                          setSurveyTopic(prev => prev + `\nContext: ${contextualQuestion.question} → ${opt}`);
                          setContextualQuestion(null);
                          setWizardStep(99);
                          handleFinalGenerateSurvey({...wizardAnswers, [WIZARD_STEPS.length]: opt});
                        }}
                        className={`px-5 py-4 rounded-2xl text-[15px] font-semibold text-center transition-all flex items-center justify-center min-h-[70px] ${
                          isDarkMode
                            ? 'bg-slate-800 border-2 border-transparent text-white hover:border-purple-500 hover:bg-slate-800/80 shadow-sm'
                            : 'bg-stone-50 border-2 border-transparent text-slate-800 hover:border-purple-500 hover:bg-white shadow-sm hover:shadow-md'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setContextualQuestion(null);
                      setWizardStep(99);
                      handleFinalGenerateSurvey(wizardAnswers);
                    }}
                    className={`text-sm font-bold flex items-center gap-2 transition-colors mx-auto mt-2 ${
                      isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Skip →
                  </button>
                </div>
              )}

              {/* Loading state while fetching contextual question */}
              {isFetchingContextual && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                  <span className="text-sm text-stone-500">Preparing a question for you...</span>
                </div>
              )}

              {/* Guided Step Area */}
              {wizardStep < WIZARD_STEPS.length && wizardStep !== 99 && !contextualQuestion && !isFetchingContextual && (
                 <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="flex flex-col items-center text-center">
                        <span className="text-[11px] sm:text-xs font-bold tracking-widest text-red-500 uppercase mb-2">Step {wizardStep + 1} of {WIZARD_STEPS.length}</span>
                        <h2 className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                           {WIZARD_STEPS[wizardStep].question}
                        </h2>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                         {WIZARD_STEPS[wizardStep].options!.map((opt, idx) => (
                             <button 
                                 key={opt}
                                 onClick={() => handleNextStep(opt)}
                                 className={`px-5 py-4 rounded-2xl text-[15px] font-semibold text-center transition-all flex items-center justify-center min-h-[70px] ${
                                    isDarkMode 
                                      ? 'bg-slate-800 border-2 border-transparent text-white hover:border-red-500 hover:bg-slate-800/80 shadow-sm' 
                                      : 'bg-stone-50 border-2 border-transparent text-slate-800 hover:border-red-500 hover:bg-white shadow-sm hover:shadow-md'
                                 }`}
                                 style={{ fontFamily: "'Outfit', sans-serif", animation: `sfFadeUp 0.3s ${idx * 0.05}s ease-out both` }}
                             >
                                 {opt}
                             </button>
                         ))}
                         {WIZARD_STEPS[wizardStep].moreOptions && showMoreOptions && WIZARD_STEPS[wizardStep].moreOptions!.map((opt, idx) => (
                             <button 
                                 key={opt}
                                 onClick={() => handleNextStep(opt)}
                                 className={`px-5 py-4 rounded-2xl text-[15px] font-semibold text-center transition-all flex items-center justify-center min-h-[70px] ${
                                    isDarkMode 
                                      ? 'bg-slate-800/50 border-2 border-transparent text-slate-300 hover:border-red-500 hover:text-white shadow-sm' 
                                      : 'bg-stone-50/50 border-2 border-transparent text-slate-600 hover:border-red-500 hover:text-slate-900 shadow-sm'
                                 }`}
                                 style={{ fontFamily: "'Outfit', sans-serif", animation: `sfFadeUp 0.3s ${idx * 0.05}s ease-out both` }}
                             >
                                 {opt}
                             </button>
                         ))}
                         
                         {WIZARD_STEPS[wizardStep].moreOptions && !showMoreOptions && (
                            <button 
                                onClick={() => setShowMoreOptions(true)}
                                className={`px-5 py-4 rounded-2xl text-[14px] font-semibold text-center transition-all flex items-center justify-center gap-2 min-h-[70px] ${
                                   isDarkMode 
                                     ? 'bg-transparent border-2 border-slate-700 border-dashed text-slate-400 hover:text-slate-200 hover:border-slate-500' 
                                     : 'bg-transparent border-2 border-stone-200 border-dashed text-stone-500 hover:text-stone-700 hover:border-stone-300'
                                }`}
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            >
                                <ChevronDown size={16} /> Show more
                            </button>
                         )}
                     </div>

                     <div className="flex justify-center mt-6 pt-6 border-t border-slate-200/20">
                        <button 
                          onClick={() => handleNextStep('Skip')} 
                          className={`text-sm font-bold flex items-center gap-2 transition-colors ${
                              isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Skip <ArrowRight size={14} />
                        </button>
                     </div>
                 </div>
              )}
          </div>
        )}

        {error && <div className="mt-4 sm:mt-6 bg-red-100/50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[13px] sm:text-[14px] font-medium text-center">{error}</div>}

        {/* ── Auto-scrolling Prompt Suggestion Slider ── */}
        {wizardStep === -1 && !expandedCategory && !showClarification && (
          <div className="mt-8 sm:mt-10" style={{ animation: 'sfFadeUp 0.6s 0.2s ease-out both' }}>
            <div
              className="prompt-slider"
              style={{ '--card-width': '220px', '--card-height': '120px', '--quantity': SUGGESTION_PROMPTS.length, '--duration': '25s' } as React.CSSProperties}
            >
              <div className="prompt-slider__track">
                {SUGGESTION_PROMPTS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setExpandedCategory(s.label);
                      setSelectedSuggestion({ label: s.label, prompt: s.prompt });
                      setSurveyTopic(s.prompt);
                    }}
                    className="prompt-slider__item"
                    style={{ '--position': i + 1, background: s.gradient } as React.CSSProperties}
                  >
                    <div className="prompt-slider__icon">
                      <img src={s.icon} alt={s.label} />
                    </div>
                    <p className="prompt-slider__title">{s.label}</p>
                    <p className="prompt-slider__desc">{s.prompt.slice(0, 50)}...</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Expanded Sub-Prompts for Selected Category ── */}
        {wizardStep === -1 && expandedCategory && !showClarification && (
          <div className="mt-6 sm:mt-8" style={{ animation: 'sfSubPromptsIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: SUGGESTION_PROMPTS.find(s => s.label === expandedCategory)?.gradient || '#666' }}
                >
                  <img
                    src={SUGGESTION_PROMPTS.find(s => s.label === expandedCategory)?.icon || ''}
                    alt=""
                    className="w-4 h-4 object-contain"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                </div>
                <span className={`text-sm sm:text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {expandedCategory}
                </span>
                <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>— or try a specific angle:</span>
              </div>
              <button
                onClick={() => {
                  setExpandedCategory(null);
                  setSelectedSuggestion(null);
                  setSurveyTopic('');
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'}`}
              >
                ← Back
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(SUB_PROMPTS[expandedCategory] || []).map((subPrompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const fullPrompt = `${expandedCategory}: ${subPrompt}`;
                    setSelectedSuggestion({ label: expandedCategory, prompt: fullPrompt });
                    setSurveyTopic(fullPrompt);
                  }}
                  className={`sub-prompt-card px-4 py-2.5 rounded-full border text-[12px] sm:text-[13px] font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                    isDarkMode
                      ? 'bg-slate-800/70 border-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border-stone-200/80 text-slate-600 hover:border-red-300 hover:text-slate-900 hover:shadow-md hover:shadow-red-500/5'
                  }`}
                  style={{ animation: `sfSubCardIn 0.4s ${i * 0.07}s cubic-bezier(0.34, 1.56, 0.64, 1) both` }}
                >
                  {subPrompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showClarification && (
        <div className="flex items-center justify-center mt-4 sm:mt-6">
          <button onClick={() => navigate('/dashboard/create?mode=scratch')}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}>Start from scratch</button>
        </div>
        )}
      </div>

      {/* ── Survey Result Modal ── */}
      {showResultModal && generatedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'sfOverlayIn 0.3s ease-out' }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseResult} />

          <div
            className="relative w-full max-w-3xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/20"
            style={{ animation: 'sfModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Your survey is ready
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {generatedSurvey?.questions?.length || 0} questions generated
                  </p>
                </div>
                <button onClick={handleCloseResult} className="p-2 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors">
                  <X size={18} />
                </button>
              </div>
              {/* Topic */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200 text-xs text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="truncate max-w-[300px]">{surveyTopic || selectedSuggestion?.label || 'Survey'}</span>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {(generatedSurvey?.questions || []).map((q, i) => {
                const qType = normalizeType(q.type);
                return (
                  <div key={q.id || i} className="py-3 border-b border-stone-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-slate-800 leading-relaxed">
                          {getQuestionText(q)}
                        </p>
                        {/* Options for multiple choice */}
                        {qType === 'choice' && q.options && q.options.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-100">
                                <span className="w-5 h-5 rounded-md bg-white border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500">
                                  {OPTION_KEYS[oi]}
                                </span>
                                <span className="text-[13px] text-stone-700">{opt.replace(/^[A-Z][\:\)\.\-]\s*/i, '')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Type indicator for non-choice */}
                        {qType === 'scale' && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <span key={n} className="w-6 h-6 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] text-stone-400">{n}</span>
                              ))}
                            </div>
                            <span className="text-[10px] text-stone-400 ml-1">Scale</span>
                          </div>
                        )}
                        {qType === 'text' && (
                          <div className="mt-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-100 border-dashed">
                            <span className="text-[11px] text-stone-400 italic">Open text response</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-stone-200/50 space-y-3" style={{ background: 'rgba(255,255,255,0.6)' }}>
              {/* Regenerate with different count and tone */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/60 flex-wrap">
                <span className="text-xs text-stone-500 flex-shrink-0">Regenerate with</span>
                <select
                  defaultValue={generatedSurvey?.questions?.length || 10}
                  id="regenerate-count"
                  className="px-2 py-1 text-xs font-semibold rounded-lg border border-stone-200 bg-white text-slate-800 cursor-pointer"
                >
                  {[3, 5, 7, 10, 12, 15, 20].map(n => (
                    <option key={n} value={n}>{n} Qs</option>
                  ))}
                </select>
                <select
                  defaultValue={selectedTone}
                  id="regenerate-tone"
                  className="px-2 py-1 text-xs font-semibold rounded-lg border border-stone-200 bg-white text-slate-800 cursor-pointer"
                >
                  {['Professional', 'Friendly', 'Casual', 'Academic', 'Direct'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const countEl = document.getElementById('regenerate-count') as HTMLSelectElement;
                    const toneEl = document.getElementById('regenerate-tone') as HTMLSelectElement;
                    const newCount = Number(countEl?.value || 10);
                    const newTone = toneEl?.value || 'Professional';
                    setQuestionCount(newCount);
                    setSelectedTone(newTone);
                    setShowResultModal(false);
                    setIsLoading(true);
                    setLoadingPhase(0);
                    const phaseInterval = setInterval(() => {
                      setLoadingPhase(prev => (prev < 3 ? prev + 1 : prev));
                    }, 2500);
                    try {
                      const prompt = surveyTopic || selectedSuggestion?.prompt || '';
                      const result = await generateSurvey({
                        prompt: prompt + `\nTone: ${newTone}\nIMPORTANT: Generate completely NEW and DIFFERENT questions from the previous set. Explore fresh angles.`,
                        question_count: newCount,
                        response_type: 'multiple_choice',
                        template_type: 'custom',
                        image_context: imageContext || undefined,
                        theme: { font: 'Outfit', intent: 'general', colors: { primary: '#ef4444', background: '#ffffff', text: '#1e293b' } },
                        wizard_answers: { tone: newTone },
                      });
                      clearInterval(phaseInterval);
                      setGeneratedSurvey(result);
                      setShowResultModal(true);
                    } catch (err: any) {
                      clearInterval(phaseInterval);
                      setError(err.message || 'Failed to regenerate');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCcw size={11} /> Regenerate
                </button>
              </div>

              <button
                onClick={() => window.open(`/dashboard/edit/${generatedSurvey?.survey_id}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                <Edit3 size={14} /> Open in Editor <ArrowRight size={14} />
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    if (generatedSurvey) {
                      const link = generateSurveyLink(generatedSurvey.survey_id);
                      window.open(link, '_blank');
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  onClick={async () => {
                    if (generatedSurvey) {
                      const link = generateSurveyLink(generatedSurvey.survey_id);
                      const shareText = `Hey! Take this quick 2-minute survey 👉 ${link}`;
                      
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: '2-Minute Survey | PepperWahl',
                            text: 'Hey! Take this quick 2-minute survey. Would love your feedback!',
                            url: link,
                          });
                        } catch (err: any) {
                          // User cancelled share — fallback to copy
                          if (err.name !== 'AbortError') {
                            await navigator.clipboard.writeText(shareText);
                            setShareLinkCopied(true);
                            setTimeout(() => setShareLinkCopied(false), 3000);
                          }
                        }
                      } else {
                        // No native share — copy to clipboard
                        await navigator.clipboard.writeText(shareText);
                        setShareLinkCopied(true);
                        setTimeout(() => setShareLinkCopied(false), 3000);
                      }
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <Share2 size={12} /> {shareLinkCopied ? 'Copied!' : 'Share'}
                </button>
                <button
                  onClick={handleViewResponses}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <BarChart2 size={12} /> Responses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Keyframes */}
      <style>{`
        @keyframes sfOverlayIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }
        @keyframes sfModalIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes sfIconPop {
          from { opacity: 0; transform: scale(0.4) rotate(-15deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes sfFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .clarification-prompt-down {
          animation: promptSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes promptSlideDown {
          from { opacity: 0.8; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sfQuestionIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sfSuggestIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        /* Prompt Slider */
        .prompt-slider {
          width: 100%;
          height: var(--card-height);
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, #000 8% 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, #000 8% 92%, transparent);
        }
        .prompt-slider__track {
          display: flex;
          width: 100%;
          min-width: calc(var(--card-width) * var(--quantity));
          position: relative;
          height: var(--card-height);
        }
        .prompt-slider__item {
          width: var(--card-width);
          height: var(--card-height);
          position: absolute;
          left: 100%;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 6px;
          border: none;
          cursor: pointer;
          text-align: left;
          animation: promptSlide var(--duration) linear infinite;
          animation-delay: calc((var(--duration) / var(--quantity)) * (var(--position) - 1) - var(--duration)) !important;
          transition: filter 0.3s, transform 0.3s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .prompt-slider__item:hover {
          transform: scale(1.04);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .prompt-slider:hover .prompt-slider__item {
          animation-play-state: paused !important;
          filter: brightness(0.85);
        }
        .prompt-slider:hover .prompt-slider__item:hover {
          filter: brightness(1);
        }
        .prompt-slider__icon {
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.25);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .prompt-slider__icon img {
          width: 16px;
          height: 16px;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }
        .prompt-slider__title {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: white;
          margin: 0;
          line-height: 1.2;
        }
        .prompt-slider__desc {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255,255,255,0.75);
          margin: 0;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        @keyframes promptSlide {
          from { left: 100%; }
          to { left: calc(var(--card-width) * -1); }
        }
        @keyframes sfSubPromptsIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sfSubCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9) rotateX(15deg); }
          to { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
        }
      `}</style>
    </div>
    </>
  );
};

export default SurveyForm;

