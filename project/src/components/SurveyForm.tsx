import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSurvey, parseImage } from '../utils/api';
import { Loader2, Sparkles, ImagePlus, Check, X, ArrowRight, Lightbulb, ChevronDown, Eye, Share2, BarChart2, Zap, Lock, Mail, ChevronRight, Hash, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateSurveyLink } from '../utils/surveyLinkUtils';

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    { emoji: '⭐', label: 'Customer Feedback', prompt: 'Customer satisfaction survey to understand how happy our customers are with our product quality, support experience, and overall service' },
    { emoji: '👥', label: 'Employee Check-in', prompt: 'Employee engagement and well-being check-in covering job satisfaction, work-life balance, team collaboration, and career growth' },
    { emoji: '🛒', label: 'Product Experience', prompt: 'Product feedback survey about usability, features, pricing satisfaction, and what improvements users would like to see' },
    { emoji: '🎓', label: 'Training Feedback', prompt: 'Post-training feedback survey evaluating content quality, instructor effectiveness, practical applicability, and suggestions for improvement' },
    { emoji: '🌐', label: 'Website Experience', prompt: 'Website user experience survey covering navigation ease, page load speed, content relevance, design appeal, and conversion barriers' },
    { emoji: '🚀', label: 'Onboarding Review', prompt: 'New user onboarding experience survey about setup ease, documentation clarity, time to first value, and support quality' },
    { emoji: '🎪', label: 'Event Feedback', prompt: 'Post-event feedback survey covering event organization, speaker quality, networking opportunities, venue satisfaction, and likelihood to attend again' },
    { emoji: '🤝', label: 'Team Collaboration', prompt: 'Team collaboration and communication survey about meeting effectiveness, tool satisfaction, cross-team coordination, and remote work experience' },
    { emoji: '📱', label: 'App Usability', prompt: 'Mobile app usability survey covering interface design, feature discoverability, performance, crash frequency, and feature requests' },
    { emoji: '🏥', label: 'Service Cancellation', prompt: 'Service cancellation feedback survey to understand reasons for leaving, what could have been done differently, and likelihood of returning' },
  ];

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
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      setIsParsingImage(true);
      setError('');
      try {
        const extracted = await parseImage(base64);
        setImageContext(extracted);
        if (!surveyTopic.trim()) setSurveyTopic('Survey based on uploaded content');
      } catch { setError('Could not parse image. Describe your survey manually.'); }
      finally { setIsParsingImage(false); }
    };
    reader.readAsDataURL(file);
  }, [surveyTopic]);

  const removeImage = () => { setImagePreview(null); setImageContext(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleStartWizard = async () => {
    if (!surveyTopic.trim() && !imageContext && !selectedSuggestion) { 
      setError('Please enter a survey topic or pick a suggestion'); 
      return; 
    }
    setError('');
    setShowMoreOptions(false);
    setWizardStep(0);
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

  const handleFinalGenerateSurvey = useCallback(async (finalAnswers: Record<number, string>) => {
    setIsLoading(true); setError(''); setLoadingPhase(0);
    const phaseInterval = setInterval(() => setLoadingPhase(p => p < 3 ? p + 1 : p), 2000);
    try {
      // Merge user prompt with hidden suggestion context
      let finalPrompt = surveyTopic.trim();
      if (selectedSuggestion) {
        finalPrompt = finalPrompt
          ? `${selectedSuggestion.prompt}. Additionally: ${finalPrompt}`
          : selectedSuggestion.prompt;
      }
      
      // Append gathered context
      if (finalAnswers[0] && finalAnswers[0] !== 'Skip') finalPrompt += `\nPurpose: ${finalAnswers[0]}`;
      if (finalAnswers[1] && finalAnswers[1] !== 'Skip') finalPrompt += `\nAudience: ${finalAnswers[1]}`;
      if (finalAnswers[2] && finalAnswers[2] !== 'Skip') finalPrompt += `\nData Collection: ${finalAnswers[2]}`;
      if (finalAnswers[3] && finalAnswers[3] !== 'Skip') finalPrompt += `\nSurvey Depth: ${finalAnswers[3]}`;

      const result = await generateSurvey({
        prompt: finalPrompt, template_type: 'custom', question_count: questionCount,
        image_context: imageContext || undefined,
        theme: { font: 'DM Sans, sans-serif', intent: 'professional', colors: { primary: '#E8503A', background: '#F7F7FB', text: '#2D3142' } },
        topic: surveyTopic.trim() || selectedSuggestion?.label || '',
        wizard_answers: { 
          type: finalAnswers[0],
          audience: finalAnswers[1]
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-3 sm:px-4">
      <div className="w-full max-w-[85%] sm:max-w-4xl lg:w-[70%]">
        {/* Brand */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex justify-center items-center p-3 mb-5 rounded-[2rem] bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.15)] relative">
            <div className="absolute inset-0 bg-red-400/20 blur-2xl rounded-full -z-10" />
            <img src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png" alt="Mascot" className="w-10 h-10 sm:w-12 sm:h-12 object-contain relative z-10 hover:scale-110 hover:-rotate-6 transition-transform duration-300" />
          </div>
          <h1 className={`text-[2rem] sm:text-[2.5rem] font-extrabold mb-4 tracking-tight leading-tight ${isDarkMode ? 'text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400' : 'text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            Design your ideal survey
          </h1>
          <p className={`text-[15px] sm:text-base font-medium max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>

          </p>
        </div>

        {wizardStep === -1 ? (
        <div className={`relative rounded-[2rem] p-2 sm:p-2.5 transition-all duration-500 overflow-hidden group ${isDarkMode
            ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/60 shadow-[0_16px_40px_rgba(0,0,0,0.4)] focus-within:shadow-[0_16px_60px_rgba(239,68,68,0.15)] focus-within:border-red-500/40'
            : 'bg-white border border-stone-200 shadow-[0_16px_40px_rgba(0,0,0,0.06)] focus-within:shadow-[0_16px_60px_rgba(239,68,68,0.1)] focus-within:border-red-400/40 focus-within:ring-4 focus-within:ring-red-500/5'
          }`}>
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-orange-500/[0.03] opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {imagePreview && (
            <div className="relative mx-3 mt-3 mb-2">
              <div className={`relative rounded-2xl overflow-hidden border ${isDarkMode ? 'border-slate-600' : 'border-stone-200'}`}>
                <img src={imagePreview} alt="Uploaded" className="w-full max-h-24 sm:max-h-32 object-cover" />
                <button onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all"><X size={12} /></button>
                {isParsingImage && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-xs bg-black/60 px-3 py-1.5 rounded-full"><Loader2 className="animate-spin" size={12} /> Extracting concepts...</div>
                  </div>
                )}
                {imageContext && !isParsingImage && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[10px] bg-green-500 shadow-lg text-white px-2.5 py-1 rounded-full"><Check size={10} strokeWidth={3} /> Analyzed successfully</div>
                )}
              </div>
            </div>
          )}
          {selectedSuggestion && (
            <div className="mx-3 mt-3 mb-1">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold shadow-sm ${isDarkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200'
                }`}>
                <Lightbulb size={13} className="text-amber-500" />
                <span>{selectedSuggestion.label}</span>
                <button onClick={() => setSelectedSuggestion(null)} className={`ml-1 p-1 rounded-md transition-colors ${isDarkMode ? 'hover:bg-amber-500/20' : 'hover:bg-amber-200'}`}>
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
          <textarea
            value={surveyTopic} onChange={(e) => setSurveyTopic(e.target.value)}
            placeholder="Type your topic, ask a question, or paste in some notes..."
            className={`relative w-full px-4 sm:px-5 py-4 sm:py-5 text-[15px] sm:text-base rounded-[1.5rem] resize-none border-0 focus:outline-none focus:ring-0 z-10 font-medium ${isDarkMode ? 'bg-transparent text-white placeholder-slate-500' : 'bg-transparent text-slate-800 placeholder-slate-400'
              }`}
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (surveyTopic.trim() || selectedSuggestion)) { e.preventDefault(); handleStartWizard(); } }}
          />
          <div className="relative z-10 flex items-center justify-between px-3 sm:px-4 pb-3 sm:pb-4 pt-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isParsingImage}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-stone-400'} disabled:opacity-40`}>
                <ImagePlus size={15} />
              </button>
              <div className="relative" ref={suggestionsRef}>
                <button
                  onClick={() => { setShowSuggestions(!showSuggestions); setShowAllSuggestions(false); }}
                  className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${showSuggestions
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200 shadow-sm'
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                >
                  <Lightbulb size={12} />
                  <span className="hidden sm:inline">Suggestions</span>
                </button>

                {/* Suggestions Popup */}
                {showSuggestions && (
                  <div
                    className={`absolute bottom-full left-0 mb-2 w-72 sm:w-80 rounded-2xl overflow-hidden z-50 ${isDarkMode
                        ? 'bg-slate-800 border border-slate-600'
                        : 'bg-white border border-stone-200'
                      }`}
                    style={{
                      animation: 'sfSuggestIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isDarkMode
                        ? '0 16px 48px rgba(0,0,0,0.4)'
                        : '0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div className={`px-3.5 py-2.5 border-b ${isDarkMode ? 'border-slate-700' : 'border-stone-100'}`}>
                      <p className={`text-[11px] sm:text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-stone-700'}`}>
                        💡 Quick suggestions
                      </p>
                      <p className={`text-[9px] sm:text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>
                        Pick one to get started instantly
                      </p>
                    </div>
                    <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                      {(showAllSuggestions ? SUGGESTION_PROMPTS : SUGGESTION_PROMPTS.slice(0, 4)).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectSuggestion(s)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all group ${isDarkMode
                              ? 'hover:bg-slate-700/70 active:bg-slate-600'
                              : 'hover:bg-stone-50 active:bg-stone-100'
                            }`}
                          style={{ animation: `sfFadeUp 0.2s ${i * 0.04}s ease-out both` }}
                        >
                          <span className="text-base flex-shrink-0">{s.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-white' : 'text-stone-700'}`}>
                              {s.label}
                            </p>
                            <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>
                              {s.prompt.slice(0, 65)}...
                            </p>
                          </div>
                          <ArrowRight size={12} className={`flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`} />
                        </button>
                      ))}
                    </div>
                    {!showAllSuggestions && (
                      <div className={`px-2 pb-2`}>
                        <button
                          onClick={() => setShowAllSuggestions(true)}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${isDarkMode
                              ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                              : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                            }`}
                        >
                          <span>Show more</span>
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'
                }`}>
                <Hash size={11} />
                <select value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className={`bg-transparent border-0 text-[10px] sm:text-xs font-medium focus:outline-none cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                  {[5, 10, 15, 20, 25, 30, 50].map(n => <option key={n} value={n}>{n} Qs</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleStartWizard} disabled={(!surveyTopic.trim() && !imageContext && !selectedSuggestion)}
              className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-400 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        ) : (
          <div className={`relative rounded-[2rem] p-6 sm:p-8 md:p-10 transition-all duration-500 flex flex-col gap-6 ${
             isDarkMode 
              ? 'bg-slate-900 border border-slate-700/60 shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
              : 'bg-white border border-stone-200 shadow-[0_16px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
          }`}>
              {/* Generation Loading State */}
              {wizardStep === 99 && isLoading && (
                 <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mb-8">
                       <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                       <div className={`w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center relative z-10 bg-transparent`}>
                          <img src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png" alt="AI" className={`w-full h-full object-contain animate-bounce drop-shadow-md ${isDarkMode ? 'brightness-200 contrast-125 mix-blend-screen' : 'mix-blend-multiply'}`} style={{ animationDuration: '2s' }} />
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <Loader2 className="animate-spin text-red-500" size={18} />
                       <span className={`text-[15px] sm:text-base font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {loadingMessages[loadingPhase]}
                       </span>
                    </div>
                 </div>
              )}

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
        <div className="flex items-center justify-center mt-4 sm:mt-6">
          <button onClick={() => navigate('/dashboard/create?mode=scratch')}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}>Start from scratch</button>
        </div>
      </div>

      {/* ── Glassmorphism Result Modal ── */}
      {showResultModal && generatedSurvey && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ animation: 'sfOverlayIn 0.35s ease-out' }}>
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" onClick={() => setShowResultModal(false)} />

          {/* Glass Modal */}
          <div
            className="relative w-full sm:w-[92vw] sm:max-w-[70vw] lg:max-w-4xl max-h-[88vh] sm:max-h-[82vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            style={{
              animation: 'sfModalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.92) 100%)',
              backdropFilter: 'blur(40px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)',
              boxShadow: isDarkMode
                ? '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
                : '0 32px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-stone-300'}`} />
            </div>

            {/* Header */}
            <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center"
                    style={{
                      animation: 'sfIconPop 0.6s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                    }}
                  >
                    <img src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png" alt="Logo" className={`w-full h-full object-contain ${isDarkMode ? 'brightness-200 contrast-125 mix-blend-screen' : 'mix-blend-multiply'}`} />
                  </div>
                  <div style={{ animation: 'sfFadeUp 0.4s 0.2s ease-out both' }}>
                    <h2 className={`text-base sm:text-lg font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-stone-800'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                      Your Survey is Live
                    </h2>
                    <p className={`text-[10px] sm:text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      Successfully generated {generatedSurvey?.questions?.length || 0} tailored questions
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowResultModal(false)}
                  className={`p-1.5 sm:p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-black/5 text-stone-400'}`}>
                  <X size={16} />
                </button>
              </div>

              {/* Topic pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium max-w-full ${isDarkMode ? 'bg-white/5 text-slate-300 border border-white/10' : 'bg-black/[0.03] text-stone-600 border border-black/[0.04]'
                  }`}
                style={{ animation: 'sfFadeUp 0.4s 0.3s ease-out both', backdropFilter: 'blur(8px)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate">{(surveyTopic || selectedSuggestion?.label || '').length > 50 ? (surveyTopic || selectedSuggestion?.label || '').slice(0, 50) + '...' : (surveyTopic || selectedSuggestion?.label || '')}</span>
              </div>
            </div>

            {/* Divider */}
            <div className={`mx-5 sm:mx-6 h-px ${isDarkMode ? 'bg-white/5' : 'bg-black/[0.04]'}`} />

            {/* Questions list */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 sm:py-4 space-y-2 overscroll-contain">
              {(generatedSurvey?.questions || []).map((q, i) => {
                const qType = normalizeType(q.type);
                return (
                  <div
                    key={q.id || i}
                    className={`p-3 sm:p-3.5 rounded-2xl transition-all ${isDarkMode
                        ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
                        : 'bg-white/60 border border-white/80 hover:bg-white/80'
                      }`}
                    style={{
                      animation: `sfQuestionIn 0.35s ${0.15 + i * 0.04}s ease-out both`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center mt-0.5"
                        style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}>
                        <span className="text-white text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                          {getQuestionText(q)}
                        </p>
                        {qType === 'choice' && q.options && q.options.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {q.options.map((opt, oi) => (
                              <span key={oi} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] ${isDarkMode ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-black/[0.03] text-stone-500 border border-black/[0.03]'
                                }`}>
                                <span className="font-bold">{OPTION_KEYS[oi]}</span> {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {qType === 'scale' && <p className={`mt-1 text-[9px] sm:text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Scale 1 — 10</p>}
                        {qType === 'text' && <p className={`mt-1 text-[9px] sm:text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Open text</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-2.5">
                 <button
                  onClick={() => { setShowResultModal(false); navigate(`/dashboard/edit/${generatedSurvey?.survey_id}`); }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl text-white text-xs sm:text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  boxShadow: '0 8px 32px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <Edit3 size={14} /> Open in Editor <ArrowRight size={14} />
              </button>
              <div className="flex gap-2.5">
                <button
                  onClick={handleShareLink}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${isDarkMode
                      ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10'
                      : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Share2 size={13} /> {shareLinkCopied ? 'Copied!' : 'Share Link'}
                </button>
                <button
                  onClick={handleViewResponses}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${isDarkMode
                      ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10'
                      : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Eye size={13} /> Responses
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
        @keyframes sfQuestionIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sfSuggestIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SurveyForm;

