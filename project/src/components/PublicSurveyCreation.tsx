import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSurvey, parseImage } from '../utils/api';
import { generateSurveyLink } from '../utils/surveyLinkUtils';
import { Loader2, Hash, X, ChevronRight, ImagePlus, Check, ArrowRight, Lightbulb, ChevronDown, Share2, Eye, BarChart2, Zap, Edit3 } from 'lucide-react';
import { parsePrompt, getClarificationNeeds } from '../utils/promptParser';
import SurveyClarification, { ClarificationAnswers } from './SurveyClarification';
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

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

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
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationNeeds, setClarificationNeeds] = useState<ReturnType<typeof getClarificationNeeds> | null>(null);
  const [isListening, setIsListening] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Voice recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSurveyTopic(prev => prev ? prev + ' ' + transcript : transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

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
    
    // Parse the prompt to check what's clear
    const promptText = selectedSuggestion
      ? (surveyTopic.trim() ? `${selectedSuggestion.prompt}. Additionally: ${surveyTopic.trim()}` : selectedSuggestion.prompt)
      : surveyTopic.trim();

    const parsed = parsePrompt(promptText, questionCount);
    const needs = getClarificationNeeds(parsed, questionCount !== 10);

    // Show clarification (handles both clear and unclear topics)
    setShowClarification(true);
    setClarificationNeeds(needs);
  };

  const handleClarificationSubmit = (answers: ClarificationAnswers) => {
    setShowClarification(false);
    // Go straight to generation
    const finalAnswers: Record<number, string> = {};
    if (answers.audience) finalAnswers[0] = answers.audience;
    if (answers.dataCollection) finalAnswers[1] = answers.dataCollection;
    if (answers.questionCount) setQuestionCount(answers.questionCount);
    if (answers.topic) setSurveyTopic(prev => prev || answers.topic!);
    handleFinalGenerateSurvey(finalAnswers);
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
      if (finalAnswers[0] && finalAnswers[0] !== 'Skip' && finalAnswers[0] !== 'Skipped') finalPrompt += `\nAudience: ${finalAnswers[0]}`;
      if (finalAnswers[1] && finalAnswers[1] !== 'Skip' && finalAnswers[1] !== 'Skipped') finalPrompt += `\nData Collection: ${finalAnswers[1]}`;
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

  const handleCloseResult = () => {
    setShowResultModal(false);
    setSurveyTopic('');
    setSelectedSuggestion(null);
    setGeneratedSurvey(null);
    setShowClarification(false);
    setClarificationNeeds(null);
    setQuestionCount(10);
    setImagePreview(null);
    setImageContext('');
    setError('');
  };

  const handleShareLink = async () => {
    if (generatedSurvey) {
      const link = generateSurveyLink(generatedSurvey.survey_id);
      
      try {
        if (navigator.share) {
          await navigator.share({
            title: '2-Minute Survey | PepperWahl',
            text: `Hey! I created a quick 2-minute survey${surveyTopic ? ' about ' + surveyTopic : ''}. Would love your feedback!`,
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
    navigate('/pricing');
  };

  const handleLogin = () => navigate('/login');
  const handleSignup = () => navigate('/login');

  return (
    <>
    {/* Full-page Gooey Loader */}
    {isLoading && <SearchLoader message={loadingMessages[loadingPhase]} />}

    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-3 sm:px-4 py-8">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              <span className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}></span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
              Create Your Free Survey
            </h1>
            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Generate a professional survey in seconds - no login required
            </p>
          </div>

          {/* Input Card */}
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

                {/* Microphone button */}
                <button
                  onClick={startListening}
                  disabled={isListening}
                  title={isListening ? 'Listening...' : 'Speak your prompt'}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-red-100 text-red-500 animate-pulse'
                      : isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-stone-400'
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
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
                            <span className="text-base flex-shrink-0"><img src={s.icon} alt="" className="w-5 h-5 object-contain" /></span>
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

          {/* Clarification Panel */}
          {showClarification && clarificationNeeds && (
            <div className="mt-4">
              <SurveyClarification
                needs={clarificationNeeds}
                onSubmit={handleClarificationSubmit}
                onCancel={() => setShowClarification(false)}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {error && <div className="mt-4 sm:mt-6 bg-red-100/50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[13px] sm:text-[14px] font-medium text-center">{error}</div>}

          {/* Auto-scrolling Prompt Suggestion Slider */}
          {!selectedSuggestion && !showClarification && (
            <div className="mt-6 sm:mt-8" style={{ animation: 'sfFadeUp 0.5s 0.2s ease-out both' }}>
              <div
                className="prompt-slider"
                style={{ '--card-width': '200px', '--card-height': '110px', '--quantity': SUGGESTION_PROMPTS.length, '--duration': '25s' } as React.CSSProperties}
              >
                <div className="prompt-slider__track">
                  {SUGGESTION_PROMPTS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
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

          <div className="flex items-center justify-center mt-4 sm:mt-6">
            <button onClick={() => navigate('/login')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}>
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>

      {/* ── Survey Result Modal (clean design from SurveyForm) ── */}
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
                        {/* Scale indicator */}
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
                        {/* Open text indicator */}
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
                onClick={() => { handleCloseResult(); navigate('/pricing'); }}
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

      {/* ── Login Prompt Modal ── */}
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
                      src="/logo.png"
                      alt="Pepperwahl Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <h3 className={`text-[2rem] font-extrabold mb-3 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Join Pepperwahl
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
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 5px;
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
          width: 26px;
          height: 26px;
          background: rgba(255,255,255,0.25);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .prompt-slider__icon img {
          width: 14px;
          height: 14px;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }
        .prompt-slider__title {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: white;
          margin: 0;
          line-height: 1.2;
        }
        .prompt-slider__desc {
          font-size: 10px;
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
      `}</style>
    </div>
    </>
  );
};

export default PublicSurveyCreation;
