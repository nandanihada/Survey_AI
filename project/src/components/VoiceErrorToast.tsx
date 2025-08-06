import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface VoiceErrorToastProps {
  error: string | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

const VoiceErrorToast: React.FC<VoiceErrorToastProps> = ({
  error,
  onClose,
  isDarkMode = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      // Auto hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [error, onClose]);

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          max-w-md p-4 rounded-lg shadow-lg border-l-4 border-orange-500
          transform transition-all duration-300 ease-out
          ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          ${isDarkMode 
            ? 'bg-slate-800 border-orange-500 text-white' 
            : 'bg-white border-orange-500 text-gray-800'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <AlertCircle 
            size={20} 
            className="flex-shrink-0 text-orange-500 mt-0.5" 
          />
          
          <div className="flex-1 min-w-0">
            <p 
              className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              Voice Input Error
            </p>
            <p 
              className={`text-sm mt-1 ${
                isDarkMode ? 'text-slate-300' : 'text-gray-600'
              }`}
            >
              {error}
            </p>
          </div>
          
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className={`
              flex-shrink-0 p-1 rounded-full transition-colors
              ${isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }
            `}
            aria-label="Close error message"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceErrorToast;
