import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Palette, Play, RotateCcw, Trash2 } from 'lucide-react';

export interface TestLabCardData {
  id: string;
  question: string;
  answer: string;
  questionAnimation: string;
  answerAnimation: string;
  timestamp: number;
  color: string;
  questionType: 'emoji' | 'scale' | 'choice';
  selectedOption: {
    id: string;
    label: string;
    emoji?: string;
  };
}

interface TestLabCardProps {
  card: TestLabCardData;
  isDarkMode: boolean;
  onReplay: (card: TestLabCardData) => void;
  onDelete: (cardId: string) => void;
  index: number;
}

const TestLabCard: React.FC<TestLabCardProps> = ({ 
  card, 
  isDarkMode, 
  onReplay, 
  onDelete,
  index 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const getAnimationName = (animation: string) => {
    const animationMap: Record<string, string> = {
      'simple': 'Simple',
      'sleek': 'Sleek',
      'fun': 'Fun',
      'party': 'Party',
      'typewriter': 'Letter-by-Letter',
      'glitch': 'Glitch',
      'neon': 'Neon',
      'minimal': 'Minimal',
      'fade': 'Fade',
      'slide': 'Slide'
    };
    return animationMap[animation] || animation;
  };

  const getAnimationIcon = (animation: string) => {
    const iconMap: Record<string, string> = {
      'simple': '→',
      'sleek': '✨',
      'fun': '🎉',
      'party': '🎊',
      'typewriter': '✍️',
      'glitch': '⚡',
      'neon': '💫',
      'minimal': '—',
      'fade': '🌫️',
      'slide': '📱'
    };
    return iconMap[animation] || '→';
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      red: 'border-red-500 bg-red-500/10',
      blue: 'border-blue-500 bg-blue-500/10',
      green: 'border-green-500 bg-green-500/10',
      purple: 'border-purple-500 bg-purple-500/10',
      indigo: 'border-indigo-500 bg-indigo-500/10',
      pink: 'border-pink-500 bg-pink-500/10',
      orange: 'border-orange-500 bg-orange-500/10',
      teal: 'border-teal-500 bg-teal-500/10'
    };
    return colorMap[color] || colorMap.red;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const replayAnimation = () => {
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`relative rounded-xl border-2 p-4 transition-all duration-300 hover:shadow-lg ${
        isDarkMode
          ? `${getColorClass(card.color)} hover:shadow-${card.color}-500/20`
          : `${getColorClass(card.color)} hover:shadow-${card.color}-500/20`
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-${card.color}-500 animate-pulse`} />
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-slate-300' : 'text-stone-600'
          }`}>
            Question #{index + 1}
          </span>
          <span className={`text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-stone-500'
          }`}>
            {formatTime(card.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={replayAnimation}
            className={`p-1 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-300'
                : 'hover:bg-stone-100 text-stone-500 hover:text-stone-600'
            }`}
            title="Replay Animation"
          >
            <Play size={14} />
          </button>
          <button
            onClick={() => onReplay(card)}
            className={`p-1 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-300'
                : 'hover:bg-stone-100 text-stone-500 hover:text-stone-600'
            }`}
            title="Replay Question"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="p-1 rounded-lg transition-colors text-red-500 hover:bg-red-500/10"
            title="Delete Card"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="mb-3">
        <h3 className={`text-lg font-semibold mb-2 ${
          isDarkMode ? 'text-white' : 'text-stone-800'
        }`}>
          {showAnimation ? (
            <motion.span
              key={card.question}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block"
            >
              {card.question}
            </motion.span>
          ) : (
            card.question
          )}
        </h3>
        
        {/* Animation Info */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Palette size={12} />
            <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>
              Q: {getAnimationIcon(card.questionAnimation)} {getAnimationName(card.questionAnimation)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Play size={12} />
            <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>
              A: {getAnimationIcon(card.answerAnimation)} {getAnimationName(card.answerAnimation)}
            </span>
          </div>
        </div>
      </div>

      {/* Answer */}
      <div className={`p-3 rounded-lg border ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-700' 
          : 'bg-stone-50 border-stone-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className={`${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`} />
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-slate-300' : 'text-stone-600'
          }`}>
            Selected Answer
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {card.selectedOption.emoji && (
            <span className="text-2xl">{card.selectedOption.emoji}</span>
          )}
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-stone-800'
          }`}>
            {card.selectedOption.label}
          </span>
        </div>
      </div>

      {/* Expandable Details */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="pt-3 mt-3 border-t border-stone-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className={`font-medium ${
                isDarkMode ? 'text-slate-300' : 'text-stone-600'
              }`}>
                Question Type:
              </span>
              <div className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                {card.questionType}
              </div>
            </div>
            <div>
              <span className={`font-medium ${
                isDarkMode ? 'text-slate-300' : 'text-stone-600'
              }`}>
                Color Theme:
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full bg-${card.color}-500`} />
                <span className={`${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  {card.color}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Expand Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full mt-3 py-2 text-sm font-medium transition-colors rounded-lg ${
          isDarkMode
            ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            : 'text-stone-500 hover:text-stone-600 hover:bg-stone-100'
        }`}
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>
    </motion.div>
  );
};

export default TestLabCard;
