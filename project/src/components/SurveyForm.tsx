import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSurvey, parseImage } from '../utils/api';
import { Loader2, Sparkles, ImagePlus, Check, X, ArrowRight, Lightbulb, ChevronDown, Eye, Share2, BarChart2, Zap, Lock, Mail, ChevronRight, Hash, Edit3 } from 'lucide-react';
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
    const needsAnything = needs.needsTopic || needs.needsQuestionCount || needs.needsAudience || needs.needsDataCollection;

    if (!needsAnything) {
      // Everything is clear from the prompt — go straight to generation
      const directAnswers: Record<number, string> = {};
      if (parsed.audience) directAnswers[1] = parsed.audience;
      if (parsed.dataCollection) directAnswers[2] = parsed.dataCollection;
      handleFinalGenerateSurvey(directAnswers, {
        questionCount: parsed.questionCount || questionCount,
        audience: parsed.audience || undefined,
        dataCollection: parsed.dataCollection || 'anonymous',
      });
    } else {
      // Show clarification for what's missing
      setShowClarification(true);
      setClarificationNeeds(needs);
    }
  };

  const handleClarificationSubmit = (answers: ClarificationAnswersType) => {
    setShowClarification(false);
    // Merge answers and generate
    const merged: Record<number, string> = {};
    if (answers.audience) merged[1] = answers.audience;
    if (answers.dataCollection) merged[2] = answers.dataCollection;
    if (answers.questionCount) setQuestionCount(answers.questionCount);
    // If user provided a custom topic, override whatever was there
    if (answers.topic) setSurveyTopic(answers.topic);
    handleFinalGenerateSurvey(merged, answers);
  };

  const handleClarificationCancel = () => {
    setShowClarification(false);
  };

  const handleNextStep = (answer?: string) => {
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
      if (finalAnswers[1] && finalAnswers[1] !== 'Skip') finalPrompt += `\nAudience: ${finalAnswers[1]}`;
      if (finalAnswers[2] && finalAnswers[2] !== 'Skip') finalPrompt += `\nData Collection: ${finalAnswers[2]}`;

      const finalCount = clarificationAnswers?.questionCount || questionCount;

      const result = await generateSurvey({
        prompt: finalPrompt, template_type: 'custom', question_count: finalCount,
        image_context: imageContext || undefined,
        theme: { font: 'DM Sans, sans-serif', intent: 'professional', colors: { primary: '#E8503A', background: '#F7F7FB', text: '#2D3142' } },
        topic: (clarificationAnswers?.topic || surveyTopic).trim() || selectedSuggestion?.label || '',
        wizard_answers: { 
          type: clarificationAnswers?.audience || finalAnswers[0],
          audience: clarificationAnswers?.audience || finalAnswers[1],
          collection: clarificationAnswers?.dataCollection || finalAnswers[2],
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
            text: 'I just created a survey. I would love your feedback!',
            url: link,
          });
        } else {
          await navigator.clipboard.writeText(link);
          setShareLinkCopied(true);
          setTimeout(() => setShareLinkCopied(false), 3000);
        }
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleViewResponses = () => {
    setShowLoginPrompt(true);
    setIsLoginMode(false); // Start with signup mode
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

              {/* Guided Step Area */}
              {wizardStep < WIZARD_STEPS.length && wizardStep !== 99 && (
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
          <div className="absolute inset-0 bg-slate-900/50" onClick={handleCloseResult} />

          <div
            className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col bg-white shadow-xl"
            style={{ animation: 'sfModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
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
            <div className="px-6 py-4 border-t border-stone-100 space-y-3">
              <button
                onClick={() => { handleCloseResult(); navigate(`/dashboard/edit/${generatedSurvey?.survey_id}`); }}
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
                  onClick={handleShareLink}
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



      {/* ── Premium Login Prompt Modal ── */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0" style={{ animation: 'sfOverlayIn 0.35s ease-out' }}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowLoginPrompt(false)} />

          <div
            className="relative w-full max-w-[900px] rounded-[2.5rem] overflow-hidden flex flex-col sm:flex-row shadow-[0_0_80px_rgba(0,0,0,0.2)]"
            style={{
              animation: 'sfModalIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              background: isDarkMode ? '#0f172a' : '#ffffff',
            }}
          >
            {/* Left Side: Abstract Luxury Design */}
            <div className="hidden sm:flex flex-col justify-between w-5/12 p-12 text-white relative overflow-hidden"
              style={{ background: '#0B0F19' }}>
              {/* Abstract glowing orbs */}
              <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-red-500 opacity-20 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-orange-500 opacity-20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md shadow-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-[0.2em] text-slate-300 uppercase">Premium Access</span>
                  </div>

                  <h3 className="text-[2.5rem] font-extrabold mb-6 leading-[1.15] text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Unlock your survey's true potential.
                  </h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed mb-12 font-medium">
                    Create a free account to access our powerful analytics dashboard, track real-time responses, and manage campaigns seamlessly.
                  </p>
                </div>

                <div className="space-y-5 mt-auto">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-colors">
                      <BarChart2 size={18} className="text-red-400" />
                    </div>
                    <span className="text-[15px] font-semibold text-slate-200 group-hover:text-white transition-colors">Real-time Analytics</span>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-colors">
                      <Zap size={18} className="text-orange-400" />
                    </div>
                    <span className="text-[15px] font-semibold text-slate-200 group-hover:text-white transition-colors">AI-Powered Insights</span>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-colors">
                      <Lock size={18} className="text-emerald-400" />
                    </div>
                    <span className="text-[15px] font-semibold text-slate-200 group-hover:text-white transition-colors">Secure Data Storage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className={`w-full sm:w-7/12 p-8 sm:p-14 flex flex-col justify-center relative ${isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white'}`}>
              <button onClick={() => setShowLoginPrompt(false)} className={`absolute top-6 right-6 p-2.5 rounded-full transition-all duration-300 hover:rotate-90 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                <X size={20} className="stroke-[2.5]" />
              </button>

              <div className="max-w-[360px] mx-auto w-full">
                <div className="text-center sm:text-left mb-10">
                  <h3 className={`text-[2rem] font-extrabold mb-3 leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {isLoginMode ? 'Welcome back' : 'Join PepperAds'}
                  </h3>
                  <p className={`text-[15px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isLoginMode ? 'Sign in to access your analytics dashboard' : 'Join thousands of creators building better surveys'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className={`text-[13px] font-bold tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>EMAIL ADDRESS</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-red-500">
                        <Mail size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                      </div>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-[15px] transition-all duration-300 focus:outline-none focus:ring-[3px] focus:ring-red-500/20 ${isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-red-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white'
                          }`}
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={`text-[13px] font-bold tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>PASSWORD</label>
                      {isLoginMode && (
                        <a href="#" className="text-[13px] text-red-500 hover:text-red-600 font-bold transition-colors">Forgot password?</a>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-red-500">
                        <Lock size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-[15px] transition-all duration-300 focus:outline-none focus:ring-[3px] focus:ring-red-500/20 ${isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-red-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white'
                          }`}
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="group relative w-full mt-2 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-white text-[15px] font-bold overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(239,68,68,0.3)] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="relative z-10">{isLoginMode ? 'Sign In Securely' : 'Create Account'}</span>
                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                  <p className={`text-[15px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                    <button
                      type="button"
                      onClick={isLoginMode ? handleSignup : handleLogin}
                      className="ml-2 font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                      {isLoginMode ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
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

