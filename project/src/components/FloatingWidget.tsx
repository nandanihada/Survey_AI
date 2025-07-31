import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, MessageCircle, ChevronRight, ArrowRight, Palette, Clock, Brain } from 'lucide-react';
import { Question } from './WidgetCustomizer';
import { saveWidgetResponses } from '../utils/widgetApi';
import { ResponseQualityAnalyzer, ResponseQuality } from '../utils/responseQualityAnalyzer';

interface FloatingWidgetProps {
  isDarkMode?: boolean;
  userBehavior?: {
    timeOnPage: number;
    scrollPercent: number;
    clickCount: number;
    lastInteraction: number;
  };
  onComplete?: (responses: Record<string, string>) => void;
  onDismiss?: () => void;
  customColor?: string;
  glassEffect?: boolean;
  transparency?: number;
  animationSpeed?: number;
  questionDelay?: number;
  customQuestions?: Question[];
  questionAnimation?: string;
  answerAnimation?: string;
  smartDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
  onCreateCard?: (data: {
    question: string;
    answer: string;
    questionAnimation: string;
    answerAnimation: string;
    color: string;
    questionType: 'emoji' | 'scale' | 'choice' | 'short_answer';
    selectedOption: {
      id: string;
      label: string;
      emoji?: string;
    };
  }) => void;
}


// Animation components
const TypewriterText: React.FC<{ text: string; speed?: number; className?: string }> = ({ 
  text, 
  speed = 50, 
  className = '' 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse border-r-2 border-current ml-1" />
      )}
    </span>
  );
};

// Animated text component with different animation styles
const AnimatedText: React.FC<{ text: string; animation: string; speed?: number; className?: string }> = ({ 
  text, 
  animation, 
  speed = 50, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    if (animation === 'typewriter') {
      setDisplayedText('');
      setCurrentIndex(0);
    } else {
      setDisplayedText(text);
    }
  }, [text, animation]);

  useEffect(() => {
    if (animation === 'typewriter' && currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed, animation]);

  const getAnimationClasses = () => {
    switch (animation) {
      case 'sleek':
        return 'animate-[slideBlur_0.6s_ease-out]';
      case 'fun':
        return 'animate-[bounceIn_0.8s_ease-out]';
      case 'party':
        return 'animate-[confetti_1s_ease-out]';
      case 'glitch':
        return 'animate-[glitch_0.5s_ease-out]';
      case 'neon':
        return 'animate-[neonGlow_1s_ease-out]';
      case 'minimal':
        return 'animate-[fadeIn_0.3s_ease-out]';
      case 'fade':
        return 'animate-[fadeIn_0.8s_ease-out]';
      case 'slide':
        return 'animate-[slideIn_0.6s_ease-out]';
      case 'typewriter':
        return '';
      default:
        return 'animate-[fadeIn_0.4s_ease-out]';
    }
  };

  const getTextContent = () => {
    if (animation === 'typewriter') {
      return (
        <span className={className}>
          {displayedText}
          {currentIndex < text.length && (
            <span className="animate-pulse border-r-2 border-current ml-1" />
          )}
        </span>
      );
    }
    return <span className={className}>{displayedText}</span>;
  };

  return (
    <div className={`${getAnimationClasses()} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {getTextContent()}
    </div>
  );
};

// Helper function to get RGB values for colors
const getColorRgb = (color: string) => {
  const colorMap: Record<string, string> = {
    red: '239, 68, 68',
    blue: '59, 130, 246',
    green: '34, 197, 94',
    purple: '139, 92, 246',
    indigo: '99, 102, 241',
    pink: '236, 72, 153',
    orange: '249, 115, 22',
    teal: '20, 184, 166'
  };
  return colorMap[color] || colorMap.red;
};

// Helper function to get CSS classes for colors
const getColorClasses = (color: string, isDarkMode: boolean) => {
  const colorMap: Record<string, { light: string; dark: string; hover: string; hoverDark: string }> = {
    red: {
      light: 'hover:border-red-300 hover:bg-red-50',
      dark: 'hover:border-red-400 hover:bg-red-900/20',
      hover: 'border-red-300',
      hoverDark: 'border-red-400'
    },
    blue: {
      light: 'hover:border-blue-300 hover:bg-blue-50',
      dark: 'hover:border-blue-400 hover:bg-blue-900/20',
      hover: 'border-blue-300',
      hoverDark: 'border-blue-400'
    },
    green: {
      light: 'hover:border-green-300 hover:bg-green-50',
      dark: 'hover:border-green-400 hover:bg-green-900/20',
      hover: 'border-green-300',
      hoverDark: 'border-green-400'
    },
    purple: {
      light: 'hover:border-purple-300 hover:bg-purple-50',
      dark: 'hover:border-purple-400 hover:bg-purple-900/20',
      hover: 'border-purple-300',
      hoverDark: 'border-purple-400'
    },
    indigo: {
      light: 'hover:border-indigo-300 hover:bg-indigo-50',
      dark: 'hover:border-indigo-400 hover:bg-indigo-900/20',
      hover: 'border-indigo-300',
      hoverDark: 'border-indigo-400'
    },
    pink: {
      light: 'hover:border-pink-300 hover:bg-pink-50',
      dark: 'hover:border-pink-400 hover:bg-pink-900/20',
      hover: 'border-pink-300',
      hoverDark: 'border-pink-400'
    },
    orange: {
      light: 'hover:border-orange-300 hover:bg-orange-50',
      dark: 'hover:border-orange-400 hover:bg-orange-900/20',
      hover: 'border-orange-300',
      hoverDark: 'border-orange-400'
    },
    teal: {
      light: 'hover:border-teal-300 hover:bg-teal-50',
      dark: 'hover:border-teal-400 hover:bg-teal-900/20',
      hover: 'border-teal-300',
      hoverDark: 'border-teal-400'
    }
  };
  return colorMap[color] || colorMap.red;
};

const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  isDarkMode = false,
  userBehavior,
  onComplete,
  onDismiss,
  customColor = 'red',
  glassEffect = true,
  transparency = 95,
  animationSpeed = 50,
  questionDelay = 2000,
  customQuestions,
  questionAnimation = 'simple',
  answerAnimation = 'simple',
  smartDelay = true,
  minDelay = 2000,
  maxDelay = 50000,
  onCreateCard
}) => {
  const [isVisible, setIsVisible] = useState(true); // Start visible for manual control
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPersonalizedContent, setShowPersonalizedContent] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef(Date.now());

  // Use custom questions or fallback to defaults
  const getPersonalizedQuestions = (): Question[] => {
    if (customQuestions && customQuestions.length > 0) {
      return customQuestions;
    }

    // Fallback to default questions
    const baseQuestions: Question[] = [
      {
        id: 'mood',
        text: `How are you feeling about your experience so far?`,
        type: 'emoji',
        options: [
          { id: 'amazing', label: 'Amazing', emoji: '🤩' },
          { id: 'good', label: 'Good', emoji: '😊' },
          { id: 'okay', label: 'Okay', emoji: '😐' },
          { id: 'frustrated', label: 'Frustrated', emoji: '😤' }
        ]
      }
    ];

    // Personalize based on user behavior
    if (userBehavior) {
      if (userBehavior.timeOnPage > 60000) { // More than 1 minute
        baseQuestions[0].text = `You've been here for a while! How are you feeling about your experience?`;
      }
      
      if (userBehavior.scrollPercent > 80) { // Scrolled a lot
        baseQuestions[1].text = `You've explored quite a bit! What's keeping you most engaged?`;
      }
      
      if (userBehavior.clickCount > 10) { // Very active
        baseQuestions[2].text = `You're really active here! How likely are you to recommend this to a friend?`;
      }
    }

    return baseQuestions;
  };

  const questions = getPersonalizedQuestions();

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, [idleTimer, autoCloseTimer]);

  // No auto-dismiss for manual control

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isVisible && event.key === 'Escape') {
        handleDismiss();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible]);

  // Questions appear immediately for manual control

  const handleResponse = (questionId: string, value: string) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);
    
    // Create card for Test Lab
    const currentQuestion = questions[currentQuestionIndex];
    const selectedOption = currentQuestion.options.find(option => option.id === value) || { id: value, label: value };
    
    onCreateCard?.({
      question: currentQuestion.text,
      answer: selectedOption.label,
      questionAnimation: questionAnimation || 'simple',
      answerAnimation: answerAnimation || 'simple',
      color: customColor || 'red',
      questionType: currentQuestion.type,
      selectedOption
    });
    
    // Calculate delay based on response quality if smart delay is enabled
    let delay = questionDelay;
    
    if (smartDelay) {
      const quality: ResponseQuality = ResponseQualityAnalyzer.analyzeResponse(
        selectedOption.label,
        currentQuestion.type,
        Date.now() - lastInteractionRef.current
      );
      delay = Math.max(minDelay || 2000, Math.min(maxDelay || 50000, quality.delay));
      
      // Store quality info for debugging/analytics
      console.log('Response Quality Analysis:', {
        response: selectedOption.label,
        quality: quality.category,
        score: quality.score,
        delay: delay / 1000 + 's',
        reason: quality.reason
      });
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      // Fade out widget
      setIsTransitioning(true);
      
      setTimeout(() => {
        // Hide widget completely
        setIsVisible(false);
        
        setTimeout(() => {
          // Move to next question and show widget again
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setIsVisible(true);
          setIsTransitioning(false);
          lastInteractionRef.current = Date.now(); // Reset interaction timer
        }, delay); // Use calculated delay
      }, 300); // Short fade out time
    } else {
      // Complete survey
      setIsCompleted(true);
      
      // Save responses to database
      saveWidgetResponses(newResponses);
      
      setTimeout(() => {
        setShowPersonalizedContent(true);
        onComplete?.(newResponses);
      }, 2000);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const getPersonalizedContent = () => {
    const mood = responses.mood;
    const engagement = responses.engagement;
    const likelihood = responses.likelihood;

    if (mood === 'amazing' && likelihood === '5') {
      return {
        title: "You're awesome! 🌟",
        content: "Since you're loving the experience, check out our premium features!",
        cta: "Explore Premium",
        type: "upgrade"
      };
    } else if (mood === 'frustrated' || likelihood === '1') {
      return {
        title: "We hear you 💙",
        content: "Let's make this better. Here are some helpful resources:",
        cta: "Get Help",
        type: "support"
      };
    } else if (engagement === 'content') {
      return {
        title: "Great taste! 📚",
        content: "You might enjoy our latest content recommendations:",
        cta: "See More Content",
        type: "content"
      };
    } else {
      return {
        title: "Thanks for sharing! 🙏",
        content: "Here's something you might find interesting:",
        cta: "Discover More",
        type: "general"
      };
    }
  };

  const personalizedContent = getPersonalizedContent();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={widgetRef}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="floating-widget-title"
        aria-describedby="floating-widget-description"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleDismiss} />
        
        {/* Widget container */}
        <div className="relative w-full max-w-md mx-auto">
        <div
          className={`relative rounded-3xl border shadow-2xl transition-all duration-300 ${
            glassEffect
              ? isDarkMode
                ? 'border-slate-600/50 shadow-2xl'
                : 'border-white/30 shadow-2xl'
              : isDarkMode
                ? 'border-slate-700'
                : 'border-stone-200'
          } backdrop-blur-xl`}
          style={{
            backdropFilter: glassEffect ? 'blur(20px) saturate(180%)' : 'blur(8px)',
            background: glassEffect 
              ? isDarkMode 
                ? `linear-gradient(135deg, rgba(15, 23, 42, ${transparency / 100 * 0.4}), rgba(30, 41, 59, ${transparency / 100 * 0.3}))` 
                : `linear-gradient(135deg, rgba(255, 255, 255, ${transparency / 100 * 0.25}), rgba(255, 255, 255, ${transparency / 100 * 0.1}))`
              : isDarkMode
                ? `rgba(30, 41, 59, ${transparency / 100})`
                : `rgba(255, 255, 255, ${transparency / 100})`,
            boxShadow: glassEffect 
              ? `0 20px 40px -10px rgba(${getColorRgb(customColor)}, 0.3)` 
              : undefined
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 transition-all duration-200 ${
              isDarkMode
                ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            } flex items-center justify-center shadow-lg hover:shadow-xl`}
            aria-label="Close survey widget"
            title="Close survey widget (Press Escape)"
          >
            <X size={14} />
          </button>

          {/* Widget content */}
          <div className="p-8">
            {!isCompleted ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Question header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-red-400' : 'bg-red-500'} animate-pulse`} />
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                  </div>

                  {/* Question text */}
                  <h3 
                    id="floating-widget-title"
                    className={`text-2xl font-semibold mb-4 leading-relaxed ${isDarkMode ? 'text-white' : 'text-stone-800'}`}
                  >
                    <AnimatedText 
                      text={questions[currentQuestionIndex].text} 
                      animation={questionAnimation}
                      speed={animationSpeed}
                      className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}
                    />
                  </h3>

                  {/* Question options */}
                  <div className="space-y-3">
                    {questions[currentQuestionIndex].type === 'short_answer' ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Type your answer here..."
                          className={`w-full p-4 rounded-xl border-2 transition-all duration-300 resize-none ${
                            isDarkMode
                              ? 'bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 focus:border-slate-400'
                              : 'bg-white/80 border-stone-300 text-stone-800 placeholder-stone-400 focus:border-stone-400'
                          }`}
                          rows={4}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              handleResponse(questions[currentQuestionIndex].id, e.target.value.trim());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const target = e.target as HTMLTextAreaElement;
                              if (target.value.trim()) {
                                handleResponse(questions[currentQuestionIndex].id, target.value.trim());
                              }
                            }
                          }}
                        />
                        <div className={`text-sm text-center ${
                          isDarkMode ? 'text-slate-400' : 'text-stone-500'
                        }`}>
                          Press Enter to submit or click outside to continue
                        </div>
                      </div>
                    ) : (
                      questions[currentQuestionIndex].options.map((option, index) => {
                      const getAnswerAnimation = () => {
                        const delay = index * 0.1;
                        switch (answerAnimation) {
                          case 'sleek':
                            return {
                              initial: { opacity: 0, x: 50, filter: 'blur(10px)' },
                              animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
                              transition: { delay, duration: 0.6, ease: 'easeOut' }
                            };
                          case 'fun':
                            return {
                              initial: { opacity: 0, scale: 0.5, rotate: -10 },
                              animate: { opacity: 1, scale: 1, rotate: 0 },
                              transition: { delay, duration: 0.8, type: 'spring', bounce: 0.4 }
                            };
                          case 'party':
                            return {
                              initial: { opacity: 0, scale: 0, rotate: 180 },
                              animate: { opacity: 1, scale: 1, rotate: 0 },
                              transition: { delay, duration: 1, type: 'spring', bounce: 0.6 }
                            };
                          case 'glitch':
                            return {
                              initial: { opacity: 0, x: -20, skewX: 10 },
                              animate: { opacity: 1, x: 0, skewX: 0 },
                              transition: { delay, duration: 0.5, ease: 'easeOut' }
                            };
                          case 'neon':
                            return {
                              initial: { opacity: 0, scale: 0.8, filter: 'brightness(0)' },
                              animate: { opacity: 1, scale: 1, filter: 'brightness(1)' },
                              transition: { delay, duration: 1, ease: 'easeOut' }
                            };
                          case 'minimal':
                            return {
                              initial: { opacity: 0, y: 10 },
                              animate: { opacity: 1, y: 0 },
                              transition: { delay, duration: 0.3, ease: 'easeOut' }
                            };
                          case 'typewriter':
                            return {
                              initial: { opacity: 0, width: 0 },
                              animate: { opacity: 1, width: 'auto' },
                              transition: { delay, duration: 0.5, ease: 'easeOut' }
                            };
                          case 'fade':
                            return {
                              initial: { opacity: 0 },
                              animate: { opacity: 1 },
                              transition: { delay, duration: 0.8, ease: 'easeOut' }
                            };
                          case 'slide':
                            return {
                              initial: { opacity: 0, x: -30 },
                              animate: { opacity: 1, x: 0 },
                              transition: { delay, duration: 0.6, ease: 'easeOut' }
                            };
                          default:
                            return {
                              initial: { opacity: 0, y: 20 },
                              animate: { opacity: 1, y: 0 },
                              transition: { delay, duration: 0.4, ease: 'easeOut' }
                            };
                        }
                      };

                      const animationProps = getAnswerAnimation();

                      return (
                        <motion.button
                          key={option.id}
                          initial={animationProps.initial}
                          animate={animationProps.animate}
                          transition={animationProps.transition}
                          whileHover={{ 
                            scale: 1.02,
                            boxShadow: glassEffect 
                              ? `0 12px 40px rgba(${getColorRgb(customColor)}, 0.2), 0 2px 0 rgba(255, 255, 255, 0.2) inset`
                              : `0 4px 12px rgba(0, 0, 0, 0.15)`
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleResponse(questions[currentQuestionIndex].id, option.id)}
                          className={`w-full p-4 rounded-xl transition-all duration-300 text-left text-lg font-medium ${
                            isDarkMode
                              ? `${getColorClasses(customColor, isDarkMode).dark} text-white`
                              : `${getColorClasses(customColor, isDarkMode).light} text-stone-800`
                          } flex items-center gap-3 group relative overflow-hidden`}
                          style={{
                            backgroundColor: glassEffect
                              ? isDarkMode 
                                ? `rgba(51, 65, 85, ${transparency / 100 * 0.6})` 
                                : `rgba(255, 255, 255, ${transparency / 100 * 0.4})`
                              : isDarkMode
                                ? `rgba(51, 65, 85, ${transparency / 100 * 0.9})`
                                : `rgba(255, 255, 255, ${transparency / 100 * 0.9})`,
                            backdropFilter: glassEffect ? 'blur(16px) saturate(180%)' : 'blur(4px)',
                            border: glassEffect 
                              ? `1px solid rgba(255, 255, 255, ${transparency / 100 * 0.3})`
                              : `1px solid rgba(0, 0, 0, ${transparency / 100 * 0.1})`,
                            boxShadow: glassEffect 
                              ? `0 8px 32px rgba(${getColorRgb(customColor)}, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1) inset`
                              : `0 2px 8px rgba(0, 0, 0, 0.1)`
                          }}
                        >
                          {/* Glass reflection effect */}
                          {glassEffect && (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                          )}
                          
                          {option.emoji && (
                            <span className="text-2xl relative z-10">{option.emoji}</span>
                          )}
                          <span className="font-medium text-lg relative z-10">{option.label}</span>
                        </motion.button>
                      );
                    })
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className={`mt-6 h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-stone-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        customColor === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        customColor === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        customColor === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        customColor === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                        customColor === 'indigo' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' :
                        customColor === 'pink' ? 'bg-gradient-to-r from-pink-500 to-pink-600' :
                        customColor === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                        customColor === 'teal' ? 'bg-gradient-to-r from-teal-500 to-teal-600' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                {!showPersonalizedContent ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Heart size={32} className="animate-pulse" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      Thank you!
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                      Your feedback helps us improve
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={16} className="text-yellow-500" />
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                        Just for you
                      </span>
                    </div>
                    
                    <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                      {personalizedContent.title}
                    </h3>
                    
                    <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                      {personalizedContent.content}
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleDismiss}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isDarkMode
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        Maybe Later
                      </button>
                      <button
                        onClick={() => {
                          // Handle CTA click
                          console.log('CTA clicked:', personalizedContent.type);
                          handleDismiss();
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                          customColor === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                          customColor === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
                          customColor === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                          customColor === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                          customColor === 'indigo' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700' :
                          customColor === 'pink' ? 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700' :
                          customColor === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' :
                          customColor === 'teal' ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' :
                          'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                        }`}
                      >
                        {personalizedContent.cta}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingWidget;
