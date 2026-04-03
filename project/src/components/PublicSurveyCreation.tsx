import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSurvey, parseImage, getWizardSuggestions } from '../utils/api';
import { generateSurveyLink } from '../utils/surveyLinkUtils';
import { Loader2, Hash, X, ChevronRight, ImagePlus, Sparkles, Check, ArrowRight, Lightbulb, ChevronDown, ExternalLink, Share2, Eye, LogIn, Lock, Mail, BarChart2, Zap } from 'lucide-react';

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

const PublicSurveyCreation: React.FC = () => {
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
  const [isDarkMode] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Wizard conversational state
  const [wizardStep, setWizardStep] = useState(-1);
  const [wizardAnswers, setWizardAnswers] = useState<Record<number, string>>({});
  const [wizardSuggestions, setWizardSuggestions] = useState<{ type?: string, collect?: string }>({});
  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [wizardTextInput, setWizardTextInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const WIZARD_STEPS = [
    {
      id: 'type',
      question: wizardSuggestions.type 
         ? `Got it! Most people building this survey choose "${wizardSuggestions.type}". Does this work for you, or do you want something else?`
         : "Got it! Is this an internal team survey or casual feedback?",
      options: ["Internal team survey", "Casual feedback", "Formal assessment", "Customer feedback", "Skip"],
      inputType: 'options'
    },
    {
      id: 'collect',
      question: wizardSuggestions.collect
         ? `To follow standard practices, people usually choose "${wizardSuggestions.collect}". Do you want to do that?`
         : "Do you want to collect respondent details?",
      options: ["Email only", "Full personal details", "Keep it anonymous", "Skip"],
      inputType: 'options'
    },
    {
      id: 'audience',
      question: "Lastly, who is your target audience and what is the primary goal?",
      inputType: 'text'
    }
  ];

  // Auto-scroll chat history
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, wizardStep, loadingPhase]);

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

  const loadingMessages = [
    'Understanding your requirements...',
    'Crafting intelligent questions...',
    'Optimizing question flow...',
    'Finalizing your survey...',
  ];

  // Check if user already created a survey
  useEffect(() => {
    const existingSurvey = localStorage.getItem('anonymous_survey');
    if (existingSurvey) {
      const survey = JSON.parse(existingSurvey);
      setGeneratedSurvey(survey);
      setShowResultModal(true);
    }
  }, []);

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

  const removeImage = () => {
    setImagePreview(null);
    setImageContext('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartWizard = async () => {
    if (!surveyTopic.trim() && !imageContext && !selectedSuggestion) { 
      setError('Please enter a survey topic or pick a suggestion'); 
      return; 
    }
    setError('');
    
    let initialMsg = surveyTopic.trim();
    if (selectedSuggestion) {
      initialMsg = initialMsg ? `${selectedSuggestion.label}: ${initialMsg}` : selectedSuggestion.label;
    } else if (imageContext && !initialMsg) {
      initialMsg = "Base survey on the uploaded image.";
    }
    
    // Initial loading indicator message
    setChatHistory([
      { role: 'user', text: initialMsg },
      { role: 'ai', text: "Analyzing your request..." }
    ]);
    
    try {
      const suggestions = await getWizardSuggestions(initialMsg);
      if (suggestions && (suggestions.suggested_type || suggestions.suggested_collect)) {
         setWizardSuggestions({ type: suggestions.suggested_type, collect: suggestions.suggested_collect });
         
         const matchCount = suggestions.total_matched || 2;
         const newQ = suggestions.suggested_type 
            ? `Got it! Based on ${matchCount} similar surveys past users created, the most common format is "${suggestions.suggested_type}". Does this work for you?`
            : "Got it! Is this an internal team survey or casual feedback?";
            
         setChatHistory([
           { role: 'user', text: initialMsg },
           { role: 'ai', text: newQ }
         ]);
      } else {
         setChatHistory([
           { role: 'user', text: initialMsg },
           { role: 'ai', text: "Got it! Is this an internal team survey or casual feedback?" }
         ]);
      }
    } catch (err) {
       setChatHistory([
         { role: 'user', text: initialMsg },
         { role: 'ai', text: "Got it! Is this an internal team survey or casual feedback?" }
       ]);
    }
    
    setWizardStep(0);
  };

  const handleNextStep = (answer?: string) => {
    let actualAnswer = answer;
    if (!answer && WIZARD_STEPS[wizardStep].inputType === 'text') {
      actualAnswer = wizardTextInput.trim() || 'Skipped';
    } else if (!answer) {
      actualAnswer = 'Skipped';
    }

    const newHistory: { role: 'ai' | 'user'; text: string }[] = [...chatHistory, { role: 'user', text: actualAnswer as string }];
    const newAnswers = { ...wizardAnswers, [wizardStep]: actualAnswer as string };
    
    setWizardAnswers(newAnswers);
    setWizardTextInput('');

    if (wizardStep + 1 < WIZARD_STEPS.length) {
      newHistory.push({ role: 'ai', text: WIZARD_STEPS[wizardStep + 1].question });
      setChatHistory(newHistory);
      setWizardStep(wizardStep + 1);
    } else {
      setChatHistory(newHistory);
      setWizardStep(99); 
      handleFinalGenerateSurvey(newAnswers);
    }
  };

  const handleFinalGenerateSurvey = useCallback(async (finalAnswers: Record<number, string>) => {
    setIsLoading(true); 
    setError(''); 
    setLoadingPhase(0);
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
      if (finalAnswers[0] && finalAnswers[0] !== 'Skip' && finalAnswers[0] !== 'Skipped') finalPrompt += `\nSurvey Type: ${finalAnswers[0]}`;
      if (finalAnswers[1] && finalAnswers[1] !== 'Skip' && finalAnswers[1] !== 'Skipped') finalPrompt += `\nData Collection Details: ${finalAnswers[1]}`;
      if (finalAnswers[2] && finalAnswers[2] !== 'Skip' && finalAnswers[2] !== 'Skipped') finalPrompt += `\nTarget Audience & Goal: ${finalAnswers[2]}`;

      const result = await generateSurvey({
        prompt: finalPrompt, 
        template_type: 'custom', 
        question_count: questionCount,
        image_context: imageContext || undefined,
        theme: { font: 'DM Sans, sans-serif', intent: 'professional', colors: { primary: '#E8503A', background: '#F7F7FB', text: '#2D3142' } },
        topic: surveyTopic.trim() || selectedSuggestion?.label || '',
        wizard_answers: { 
          type: finalAnswers[0],
          collection: finalAnswers[1],
          audience: finalAnswers[2]
        }
      });

      clearInterval(phaseInterval);
      setGeneratedSurvey(result);
      setShowResultModal(true);
      
      localStorage.setItem('anonymous_survey', JSON.stringify(result));
      
    } catch (err: unknown) {
      clearInterval(phaseInterval);
      setError(err instanceof Error ? err.message : 'Failed to generate survey');
      setWizardStep(-1);
      setChatHistory([]);
      setWizardAnswers({});
    } finally { 
      setIsLoading(false); 
    }
  }, [surveyTopic, questionCount, imageContext, selectedSuggestion]);

  const getQuestionText = (q: Question) => q.question || q.text || 'Untitled Question';

  const normalizeType = (type: string): string => {
    switch (type) {
      case 'multiple_choice': case 'yes_no': case 'radio': return 'choice';
      case 'short_answer': case 'text': return 'text';
      case 'rating': case 'opinion_scale': case 'scale': case 'range': return 'scale';
      default: return 'text';
    }
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
  };

  const handleLogin = () => navigate('/login');
  const handleSignup = () => navigate('/login');

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-3 sm:px-4 py-8">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <img src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png" alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              <span className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}></span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
              Create Your Free Survey
            </h1>
            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Generate a professional survey in seconds - no login required
            </p>
          </div>

          {wizardStep === -1 ? (
          /* Input Card */
          <div className={`rounded-2xl border-2 p-1 transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-600 focus-within:border-red-500' : 'bg-white border-stone-200 focus-within:border-red-400 shadow-lg'
            }`}>
            {imagePreview && (
              <div className="relative mx-2 sm:mx-3 mt-2 sm:mt-3 mb-1">
                <div className={`relative rounded-xl overflow-hidden border ${isDarkMode ? 'border-slate-600' : 'border-stone-200'}`}>
                  <img src={imagePreview} alt="Uploaded" className="w-full max-h-24 sm:max-h-32 object-cover" />
                  <button onClick={removeImage} className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"><X size={12} /></button>
                  {isParsingImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white text-[10px] sm:text-xs bg-black/60 px-2.5 py-1 rounded-full"><Loader2 className="animate-spin" size={11} /> Extracting...</div>
                    </div>
                  )}
                  {imageContext && !isParsingImage && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] bg-green-500/90 text-white px-2 py-0.5 rounded-full"><Check size={9} /> Extracted</div>
                  )}
                </div>
              </div>
            )}

            {selectedSuggestion && (
              <div className="mx-2 sm:mx-3 mt-2 sm:mt-3 mb-1">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-medium ${isDarkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                  <Lightbulb size={11} />
                  <span>{selectedSuggestion.label}</span>
                  <button onClick={() => setSelectedSuggestion(null)} className={`ml-0.5 p-0.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-amber-100'}`}>
                    <X size={10} />
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={surveyTopic}
              onChange={(e) => setSurveyTopic(e.target.value)}
              placeholder="Describe your survey topic, or paste specific questions you want included..."
              className={`w-full px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm rounded-xl resize-none border-0 focus:outline-none focus:ring-0 ${isDarkMode ? 'bg-transparent text-white placeholder-slate-500' : 'bg-transparent text-stone-800 placeholder-stone-400'
                }`}
              rows={3}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (surveyTopic.trim() || selectedSuggestion)) { e.preventDefault(); handleStartWizard(); } }}
            />

            <div className="flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3">
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
                      className={`absolute bottom-full left-0 mb-2 w-72 sm:w-80 rounded-2xl overflow-hidden z-50 ${isDarkMode ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-stone-200'
                        }`}
                      style={{
                        animation: 'sfSuggestIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isDarkMode ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div className={`px-3.5 py-2.5 border-b ${isDarkMode ? 'border-slate-700' : 'border-stone-100'}`}>
                        <p className={`text-[11px] sm:text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-stone-700'}`}>💡 Quick suggestions</p>
                        <p className={`text-[9px] sm:text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>Pick one to get started instantly</p>
                      </div>
                      <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                        {(showAllSuggestions ? SUGGESTION_PROMPTS : SUGGESTION_PROMPTS.slice(0, 4)).map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectSuggestion(s)}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all group ${isDarkMode ? 'hover:bg-slate-700/70 active:bg-slate-600' : 'hover:bg-stone-50 active:bg-stone-100'
                              }`}
                            style={{ animation: `sfFadeUp 0.2s ${i * 0.04}s ease-out both` }}
                          >
                            <span className="text-base flex-shrink-0">{s.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] sm:text-xs font-medium ${isDarkMode ? 'text-white' : 'text-stone-700'}`}>{s.label}</p>
                              <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>{s.prompt.slice(0, 65)}...</p>
                            </div>
                            <ArrowRight size={12} className={`flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`} />
                          </button>
                        ))}
                      </div>
                      {!showAllSuggestions && (
                        <div className={`px-2 pb-2`}>
                          <button
                            onClick={() => setShowAllSuggestions(true)}
                            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${isDarkMode ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
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
            <div className={`relative rounded-[2rem] p-4 sm:p-6 transition-all duration-500 overflow-hidden flex flex-col gap-4 ${
               isDarkMode 
                ? 'bg-slate-900 border border-slate-700/60 shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
                : 'bg-white border border-stone-200 shadow-[0_16px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
            }`}>
               {/* Chat History */}
               <div ref={chatScrollRef} className="flex flex-col gap-4 max-h-[45vh] overflow-y-auto pr-2" style={{ scrollBehavior: 'smooth' }}>
                  {chatHistory.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                           <div className={`w-8 h-8 rounded-[0.8rem] flex items-center justify-center shadow-sm flex-shrink-0 mr-3 mt-1 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-1.5`}>
                              <img src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png" alt="AI" className="w-full h-full object-contain drop-shadow-sm" />
                           </div>
                        )}
                        <div className={`max-w-[85%] rounded-[1.25rem] px-4 py-3 ${
                           msg.role === 'user' 
                             ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-tr-sm shadow-md'
                             : isDarkMode 
                                 ? 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm shadow-sm'
                                 : 'bg-stone-50 text-stone-800 border border-stone-200 rounded-tl-sm shadow-sm'
                        }`}>
                           <p className="text-[14px] sm:text-[15px] font-medium leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>{msg.text}</p>
                        </div>
                     </div>
                  ))}
                  
                  {wizardStep === 99 && isLoading && (
                     <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className={`w-8 h-8 rounded-[0.8rem] flex items-center justify-center shadow-sm flex-shrink-0 mr-3 mt-1 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-1.5`}>
                           <img src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png" alt="AI" className="w-full h-full object-contain drop-shadow-sm animate-pulse" />
                        </div>
                        <div className={`rounded-[1.25rem] px-4 py-3.5 rounded-tl-sm flex items-center gap-3 shadow-md border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700/50' : 'bg-white text-stone-800 border-red-500/20'}`}>
                           <Loader2 className="animate-spin text-red-500" size={16} />
                           <span className="text-[14px] sm:text-[15px] font-bold tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              {loadingMessages[loadingPhase]}
                           </span>
                        </div>
                     </div>
                  )}
               </div>

               {wizardStep < WIZARD_STEPS.length && wizardStep !== 99 && (
                   <div className={`pt-4 border-t mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                       {WIZARD_STEPS[wizardStep].inputType === 'text' ? (
                           <div className="flex flex-col gap-3">
                               <input 
                                 type="text"
                                 value={wizardTextInput}
                                 onChange={(e) => setWizardTextInput(e.target.value)}
                                 onKeyDown={(e) => { if (e.key === 'Enter') handleNextStep(); }}
                                 placeholder="Type your answer, or skip..."
                                 className={`w-full px-4 py-3.5 rounded-xl border focus:outline-none focus:ring-[3px] focus:ring-red-500/20 transition-all font-medium text-[15px] ${
                                    isDarkMode ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500' : 'bg-stone-50 border-stone-200 text-stone-800'
                                 }`}
                                 style={{ fontFamily: "'Outfit', sans-serif" }}
                               />
                               <div className="flex justify-end gap-2">
                                   <button onClick={() => handleNextStep('Skip')} className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>Skip</button>
                                   <button onClick={() => handleNextStep()} className="px-5 py-2.5 text-[15px] font-bold rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-[0_4px_20px_rgba(239,68,68,0.3)] transition-all">Send</button>
                               </div>
                           </div>
                       ) : (
                           <div className="flex flex-wrap gap-2 justify-end">
                               {WIZARD_STEPS[wizardStep].options!.map(opt => (
                                   <button 
                                       key={opt}
                                       onClick={() => handleNextStep(opt)}
                                       className={`px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                                          opt === 'Skip'
                                            ? isDarkMode ? 'border border-slate-700 text-slate-400 hover:bg-slate-800' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                                            : isDarkMode ? 'bg-slate-800 border border-slate-700 text-white hover:border-red-500 hover:text-red-400' : 'bg-white border border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-500 shadow-sm hover:shadow-md'
                                       }`}
                                       style={{ fontFamily: "'Outfit', sans-serif" }}
                                   >
                                       {opt}
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>
               )}
            </div>
          )}

          {error && <div className="mt-4 sm:mt-6 bg-red-100/50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[13px] sm:text-[14px] font-medium text-center">{error}</div>}

          <div className="flex items-center justify-center mt-4 sm:mt-6">
            <button onClick={() => navigate('/login')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}>
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>

      {/* Survey Result Modal */}
      {showResultModal && generatedSurvey && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ animation: 'sfOverlayIn 0.35s ease-out' }}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" onClick={() => setShowResultModal(false)} />

          <div
            className="relative w-full sm:w-[92vw] sm:max-w-lg max-h-[88vh] sm:max-h-[82vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            style={{
              animation: 'sfModalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              background: isDarkMode ? 'linear-gradient(135deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.95) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.92) 100%)',
              backdropFilter: 'blur(40px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)',
              boxShadow: isDarkMode ? '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 32px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)',
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
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
                      animation: 'sfIconPop 0.6s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                    }}
                  >
                    <Sparkles size={16} className="text-white" />
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

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 sm:py-4 space-y-2 overscroll-contain">
              {(generatedSurvey?.questions || []).map((q, i) => {
                const qType = normalizeType(q.type);
                return (
                  <div
                    key={q.id || i}
                    className={`p-3 sm:p-3.5 rounded-2xl transition-all ${isDarkMode ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]' : 'bg-white/60 border border-white/80 hover:bg-white/80'
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
                                <span className="font-bold">{String.fromCharCode(65 + oi)}</span> {opt}
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
                onClick={() => {
                  const link = generateSurveyLink(generatedSurvey.survey_id);
                  window.open(link, '_blank', 'noopener,noreferrer');
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl text-white text-xs sm:text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  boxShadow: '0 8px 32px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <ExternalLink size={14} /> Preview Live <ArrowRight size={14} />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleShareLink}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${isDarkMode ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10' : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Share2 size={13} /> {shareLinkCopied ? 'Copied!' : 'Share Link'}
                </button>

                <button
                  onClick={handleViewResponses}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${isDarkMode ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10' : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
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
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className={`w-full sm:w-7/12 p-8 sm:p-14 flex flex-col justify-center relative ${isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white'}`}>
              <button onClick={() => setShowLoginPrompt(false)} className={`absolute top-6 right-6 p-2.5 rounded-full transition-all duration-300 hover:rotate-90 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                <X size={20} className="stroke-[2.5]" />
              </button>

              <div className="max-w-[360px] mx-auto w-full">
                <div className="text-center sm:text-left mb-10">
                  <div className="w-16 h-16 mb-8 rounded-[1.25rem] flex items-center justify-center mx-auto sm:mx-0">
                    <img
                      src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png"
                      alt="PepperAds Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <h3 className={`text-[2rem] font-extrabold mb-3 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Join PepperAds
                  </h3>
                  <p className={`text-[15px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    You've successfully created your survey! Secure your data and unlock full analytics capabilities now.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleSignup}
                    className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-white text-[15px] font-bold overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(239,68,68,0.3)] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', fontFamily: "'Outfit', sans-serif" }}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="relative z-10">Create Free Account</span>
                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="relative flex items-center py-4">
                    <div className={`flex-grow border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div>
                    <span className={`flex-shrink-0 mx-4 text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>or</span>
                    <div className={`flex-grow border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div>
                  </div>

                  <button
                    onClick={handleLogin}
                    className={`group w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[15px] font-bold transition-all duration-300 border-2 ${isDarkMode
                        ? 'border-slate-800 hover:bg-slate-800 text-white'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    Sign in to existing account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes sfOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sfModalIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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

export default PublicSurveyCreation;
