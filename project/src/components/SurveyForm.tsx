import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSurvey, parseImage } from '../utils/api';
import { Loader2, Hash, X, Edit3, ChevronRight, ImagePlus, Sparkles, Check, ArrowRight, Lightbulb, ChevronDown, ExternalLink, FolderOpen } from 'lucide-react';
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

interface SurveyFormProps { isDarkMode?: boolean; onNavigateToSurveys?: () => void; }

const OPTION_KEYS = ['A','B','C','D','E','F','G','H','I','J'];

const SurveyForm: React.FC<SurveyFormProps> = ({ isDarkMode = false, onNavigateToSurveys }) => {
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
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
    'Understanding your requirements...',
    'Crafting intelligent questions...',
    'Optimizing question flow...',
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

  const handleGenerateSurvey = useCallback(async () => {
    if (!surveyTopic.trim() && !imageContext && !selectedSuggestion) { setError('Please enter a survey topic or pick a suggestion'); return; }
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
      const result = await generateSurvey({
        prompt: finalPrompt, template_type: 'custom', question_count: questionCount,
        image_context: imageContext || undefined,
        theme: { font: 'DM Sans, sans-serif', intent: 'professional', colors: { primary: '#E8503A', background: '#F7F7FB', text: '#2D3142' } },
      });
      clearInterval(phaseInterval);
      setGeneratedSurvey(result);
      setShowResultModal(true);
    } catch (err: unknown) {
      clearInterval(phaseInterval);
      setError(err instanceof Error ? err.message : 'Failed to generate survey');
    } finally { setIsLoading(false); }
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-3 sm:px-4">
      <div className="w-full max-w-xl">
        {/* Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src="https://i.postimg.cc/439WS89h/chilllllllli.png" alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
            <span className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>PepperAds</span>
          </div>
          <h1 className={`text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            What would you like to create?
          </h1>
          <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
            Describe your survey and we'll generate it for you
          </p>
        </div>

        {/* Input Card */}
        <div className={`rounded-2xl border-2 p-1 transition-all duration-300 ${
          isDarkMode ? 'bg-slate-800 border-slate-600 focus-within:border-red-500' : 'bg-white border-stone-200 focus-within:border-red-400 shadow-lg'
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
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-medium ${
                isDarkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
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
            value={surveyTopic} onChange={(e) => setSurveyTopic(e.target.value)}
            placeholder="Describe your survey topic, or paste specific questions you want included..."
            className={`w-full px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm rounded-xl resize-none border-0 focus:outline-none focus:ring-0 ${
              isDarkMode ? 'bg-transparent text-white placeholder-slate-500' : 'bg-transparent text-stone-800 placeholder-stone-400'
            }`}
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (surveyTopic.trim() || selectedSuggestion)) { e.preventDefault(); handleGenerateSurvey(); } }}
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
                  className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                    showSuggestions
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
                    className={`absolute bottom-full left-0 mb-2 w-72 sm:w-80 rounded-2xl overflow-hidden z-50 ${
                      isDarkMode
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
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all group ${
                            isDarkMode
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
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${
                            isDarkMode
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
              <div className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium ${
                isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'
              }`}>
                <Hash size={11} />
                <select value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className={`bg-transparent border-0 text-[10px] sm:text-xs font-medium focus:outline-none cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                  {[5,10,15,20,25,30,50].map(n => <option key={n} value={n}>{n} Qs</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleGenerateSurvey} disabled={isLoading || (!surveyTopic.trim() && !imageContext && !selectedSuggestion)}
              className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-400 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all">
              {isLoading ? <Loader2 className="animate-spin" size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="mt-4 sm:mt-6 text-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-100">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 rounded-full border-2 border-red-200" />
                <div className="absolute inset-0 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
              </div>
              <span className="text-xs sm:text-sm text-red-700 font-medium">{loadingMessages[loadingPhase]}</span>
            </div>
          </div>
        )}
        {error && <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm text-center">{error}</div>}
        <div className="flex items-center justify-center mt-4 sm:mt-6">
          <button onClick={() => navigate('/dashboard/create?mode=scratch')}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
              isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'
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
            className="relative w-full sm:w-[92vw] sm:max-w-lg max-h-[88vh] sm:max-h-[82vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
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
                      Survey Ready
                    </h2>
                    <p className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      {generatedSurvey.questions?.length || 0} questions · AI generated
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium max-w-full ${
                  isDarkMode ? 'bg-white/5 text-slate-300 border border-white/10' : 'bg-black/[0.03] text-stone-600 border border-black/[0.04]'
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
              {(generatedSurvey.questions || []).map((q, i) => {
                const qType = normalizeType(q.type);
                return (
                  <div
                    key={q.id || i}
                    className={`p-3 sm:p-3.5 rounded-2xl transition-all ${
                      isDarkMode
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
                              <span key={oi} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] ${
                                isDarkMode ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-black/[0.03] text-stone-500 border border-black/[0.03]'
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
                onClick={() => { setShowResultModal(false); navigate(`/dashboard/edit/${generatedSurvey.survey_id}`); }}
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
                  onClick={() => {
                    const link = generateSurveyLink(generatedSurvey.survey_id);
                    window.open(link, '_blank', 'noopener,noreferrer');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                    isDarkMode
                      ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10'
                      : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <ExternalLink size={13} /> Preview Live
                </button>
                <button
                  onClick={() => { setShowResultModal(false); if (onNavigateToSurveys) onNavigateToSurveys(); else navigate('/dashboard/create?tab=surveys'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                    isDarkMode
                      ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10'
                      : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <FolderOpen size={13} /> All Surveys
                </button>
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

export default SurveyForm;
