import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import FloatingWidget from './FloatingWidget';
import { useUserBehavior } from '../hooks/useUserBehavior';
import { Question } from './WidgetCustomizer';

interface FloatingWidgetContextValue {
  showWidget: () => void;
  hideWidget: () => void;
  isWidgetEnabled: boolean;
  setWidgetEnabled: (enabled: boolean) => void;
  responses: Record<string, string> | null;
}

const FloatingWidgetContext = createContext<FloatingWidgetContextValue | null>(null);

export const useFloatingWidget = () => {
  const context = useContext(FloatingWidgetContext);
  if (!context) {
    throw new Error('useFloatingWidget must be used within a FloatingWidgetProvider');
  }
  return context;
};

interface FloatingWidgetProviderProps {
  children: ReactNode;
  isDarkMode?: boolean;
  disabled?: boolean;
  onWidgetComplete?: (responses: Record<string, string>) => void;
  onWidgetDismiss?: () => void;
  customColor?: string;
  glassEffect?: boolean;
  transparency?: number;
  animationSpeed?: number;
  questionDelay?: number;
  questions?: Question[];
  questionAnimation?: string;
  answerAnimation?: string;
  smartDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
}

export const FloatingWidgetProvider: React.FC<FloatingWidgetProviderProps> = ({
  children,
  isDarkMode = false,
  disabled = false,
  onWidgetComplete,
  onWidgetDismiss,
  customColor = 'red',
  glassEffect = true,
  transparency = 95,
  animationSpeed = 50,
  questionDelay = 2000,
  questions,
  questionAnimation = 'simple',
  answerAnimation = 'simple',
  smartDelay = true,
  minDelay = 2000,
  maxDelay = 50000,
}) => {
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(!disabled);
  const [forceShow, setForceShow] = useState(false);
  const [responses, setResponses] = useState<Record<string, string> | null>(null);
  const [hasShownWidget, setHasShownWidget] = useState(false);
  
  const { behavior, engagementScore, userIntent, isLikelyToConvert, optimalWidgetTime } = useUserBehavior();

  // Check if widget should be shown based on various conditions
  const shouldShowWidget = (): boolean => {
    if (!isWidgetEnabled || hasShownWidget) return false;
    
    // Don't show if user seems to be leaving
    if (userIntent === 'leaving') return false;
    
    // Force show if requested
    if (forceShow) return true;
    
    // Show based on engagement and timing
    if (optimalWidgetTime <= 0 && engagementScore > 30) return true;
    
    // Show for highly engaged users sooner
    if (isLikelyToConvert && behavior.timeOnPage > 15000) return true;
    
    return false;
  };

  // Auto-show widget every 5 seconds
  useEffect(() => {
    if (!isWidgetEnabled || hasShownWidget) return;
    
    const timer = setInterval(() => {
      setForceShow(true);
    }, 5000); // Show every 5 seconds
    
    return () => clearInterval(timer);
  }, [isWidgetEnabled, hasShownWidget]);

  // Handle widget completion
  const handleWidgetComplete = (widgetResponses: Record<string, string>) => {
    setResponses(widgetResponses);
    setHasShownWidget(false); // Allow widget to appear again
    setForceShow(false);
    
    // Store responses but don't prevent showing again
    localStorage.setItem('floatingWidgetResponses', JSON.stringify(widgetResponses));
    
    onWidgetComplete?.(widgetResponses);
  };

  // Handle widget dismissal
  const handleWidgetDismiss = () => {
    setHasShownWidget(true);
    setForceShow(false);
    
    // Store dismissal with timestamp
    const dismissalData = {
      timestamp: Date.now(),
      userIntent,
      engagementScore,
      timeOnPage: behavior.timeOnPage,
    };
    localStorage.setItem('floatingWidgetDismissed', JSON.stringify(dismissalData));
    
    onWidgetDismiss?.();
  };

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem('floatingWidgetCompleted');
    const dismissed = localStorage.getItem('floatingWidgetDismissed');
    const storedResponses = localStorage.getItem('floatingWidgetResponses');
    
    if (completed) {
      setHasShownWidget(true);
      if (storedResponses) {
        try {
          setResponses(JSON.parse(storedResponses));
        } catch (e) {
          console.warn('Failed to parse stored widget responses');
        }
      }
    } else if (dismissed) {
      try {
        const dismissalData = JSON.parse(dismissed);
        const daysSinceDismissal = (Date.now() - dismissalData.timestamp) / (1000 * 60 * 60 * 24);
        
        // Allow showing again after 7 days
        if (daysSinceDismissal < 7) {
          setHasShownWidget(true);
        }
      } catch (e) {
        console.warn('Failed to parse dismissal data');
      }
    }
  }, []);

  // Context value
  const contextValue: FloatingWidgetContextValue = {
    showWidget: () => setForceShow(true),
    hideWidget: () => setForceShow(false),
    isWidgetEnabled,
    setWidgetEnabled: (enabled: boolean) => {
      setIsWidgetEnabled(enabled);
      if (!enabled) {
        setForceShow(false);
      }
    },
    responses,
  };

  return (
    <FloatingWidgetContext.Provider value={contextValue}>
      {children}
      {isWidgetEnabled && (forceShow || shouldShowWidget()) && (
        <FloatingWidget
          isDarkMode={isDarkMode}
          userBehavior={behavior}
          onComplete={handleWidgetComplete}
          onDismiss={handleWidgetDismiss}
          customColor={customColor}
          glassEffect={glassEffect}
          transparency={transparency}
          animationSpeed={animationSpeed}
          questionDelay={questionDelay}
          customQuestions={questions}
          questionAnimation={questionAnimation}
          answerAnimation={answerAnimation}
          smartDelay={smartDelay}
          minDelay={minDelay}
          maxDelay={maxDelay}
        />
      )}
    </FloatingWidgetContext.Provider>
  );
};

// Debug component to display current behavior metrics (for development)
export const FloatingWidgetDebug: React.FC = () => {
  const { behavior, engagementScore, userIntent, isLikelyToConvert } = useUserBehavior();
  const { responses } = useFloatingWidget();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <h4 className="font-bold mb-2">Widget Debug Info</h4>
      <div className="space-y-1">
        <div>Time on page: {Math.round(behavior.timeOnPage / 1000)}s</div>
        <div>Scroll: {behavior.scrollPercent}%</div>
        <div>Clicks: {behavior.clickCount}</div>
        <div>Engagement: {engagementScore}/100</div>
        <div>Intent: {userIntent}</div>
        <div>Likely to convert: {isLikelyToConvert ? 'Yes' : 'No'}</div>
        <div>Idle time: {Math.round(behavior.idleTime / 1000)}s</div>
        {responses && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="font-semibold">Responses:</div>
            {Object.entries(responses).map(([key, value]) => (
              <div key={key}>{key}: {value}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
