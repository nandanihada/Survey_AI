import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import type { VoiceInputState } from '../hooks/useVoiceInput';

interface VoiceInputButtonProps {
  state: VoiceInputState;
  isSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isDarkMode?: boolean;
  className?: string;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  state,
  isSupported,
  onStartListening,
  onStopListening,
  isDarkMode = false,
  className = '',
}) => {
  const handleClick = () => {
    if (state === 'listening') {
      onStopListening();
    } else if (state === 'idle') {
      onStartListening();
    }
  };

  const getButtonProps = () => {
    switch (state) {
      case 'listening':
        return {
          icon: <Mic size={16} />,
          bgColor: isDarkMode ? 'bg-red-500' : 'bg-red-500',
          hoverColor: isDarkMode ? 'hover:bg-red-600' : 'hover:bg-red-600',
          textColor: 'text-white',
          borderColor: 'border-red-500',
          title: 'Stop recording',
          pulse: true,
        };
      case 'processing':
        return {
          icon: <Volume2 size={16} />,
          bgColor: isDarkMode ? 'bg-blue-500' : 'bg-blue-500',
          hoverColor: isDarkMode ? 'hover:bg-blue-600' : 'hover:bg-blue-600',
          textColor: 'text-white',
          borderColor: 'border-blue-500',
          title: 'Processing...',
          pulse: false,
        };
      case 'error':
        return {
          icon: <MicOff size={16} />,
          bgColor: isDarkMode ? 'bg-orange-500' : 'bg-orange-500',
          hoverColor: isDarkMode ? 'hover:bg-orange-600' : 'hover:bg-orange-600',
          textColor: 'text-white',
          borderColor: 'border-orange-500',
          title: 'Error - Click to retry',
          pulse: false,
        };
      default:
        return {
          icon: <Mic size={16} />,
          bgColor: isDarkMode 
            ? 'bg-slate-600 hover:bg-slate-500' 
            : 'bg-gray-100 hover:bg-gray-200',
          hoverColor: '',
          textColor: isDarkMode ? 'text-slate-300' : 'text-gray-600',
          borderColor: isDarkMode ? 'border-slate-600' : 'border-gray-300',
          title: 'Start voice input',
          pulse: false,
        };
    }
  };

  if (!isSupported) {
    return null;
  }

  const { 
    icon, 
    bgColor, 
    hoverColor, 
    textColor, 
    borderColor, 
    title, 
    pulse 
  } = getButtonProps();

  const isDisabled = state === 'processing';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      className={`
        absolute right-3 top-1/2 transform -translate-y-1/2
        w-8 h-8 rounded-full border
        flex items-center justify-center
        transition-all duration-200
        ${bgColor} ${hoverColor} ${textColor} ${borderColor}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        ${pulse ? 'animate-pulse' : ''}
        focus:outline-none focus:ring-2 focus:ring-red-500/20
        z-10
        ${className}
      `}
      aria-label={title}
      aria-pressed={state === 'listening'}
    >
      {icon}
      
      {/* Recording indicator */}
      {state === 'listening' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
      
      {/* Processing indicator */}
      {state === 'processing' && (
        <div className="absolute -inset-1 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
      )}
    </button>
  );
};

export default VoiceInputButton;
