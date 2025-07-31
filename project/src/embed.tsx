import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import FloatingWidget from './components/FloatingWidget';
import { WidgetCustomizer, Question, WidgetCustomizerSettings } from './components/WidgetCustomizer';
import { Settings, X, Edit, Eye, EyeOff } from 'lucide-react';
import './index.css';

interface Config {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  themeColor?: string;
  questions: { type: string; question: string; options?: string[] }[];
  trigger: { type: string; seconds?: number };
  adminMode?: boolean;
  widgetId?: string;
  customSettings?: Partial<WidgetCustomizerSettings>;
}

interface ExtendedConfig extends Config {
  onSettingsChange?: (settings: WidgetCustomizerSettings) => void;
  onComplete?: (responses: Record<string, string>) => void;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    SurveyWidget: {
      init: (config: ExtendedConfig) => void;
      showCustomizer: () => void;
      hideCustomizer: () => void;
      updateSettings: (settings: Partial<WidgetCustomizerSettings>) => void;
      getSettings: () => WidgetCustomizerSettings | null;
    };
  }
}

const createContainer = () => {
  let container = document.getElementById('survey-widget-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'survey-widget-container';
    container.style.position = 'fixed';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
};

// Define helper functions first
const mapQuestions = (questions: Config['questions']): Question[] => {
  if (!questions || questions.length === 0) {
    return [{
      id: 'q1',
      text: 'How are you feeling about your experience so far?',
      type: 'emoji',
      options: [
        { id: 'opt1', label: 'Amazing', emoji: '🤩' },
        { id: 'opt2', label: 'Good', emoji: '😊' },
        { id: 'opt3', label: 'Okay', emoji: '😐' },
        { id: 'opt4', label: 'Frustrated', emoji: '😤' }
      ]
    }];
  }
  
  return questions.map((q, index) => ({
    id: `q${index + 1}`,
    text: q.question,
    type: q.type as 'emoji' | 'scale' | 'choice' | 'short_answer',
    options: q.options?.map((opt, optIndex) => ({
      id: `opt${optIndex + 1}`,
      label: opt,
      emoji: q.type === 'emoji' ? getEmojiForOption(opt) : undefined,
    })) || [],
  }));
};

const getEmojiForOption = (option: string): string => {
  const emojiMap: { [key: string]: string } = {
    'amazing': '🤩',
    'great': '😊',
    'good': '👍',
    'okay': '😐',
    'bad': '👎',
    'terrible': '😤',
    'frustrated': '😠',
    'happy': '😊',
    'sad': '😢',
    'love': '❤️',
    'like': '👍',
    'dislike': '👎',
    'hate': '💔',
  };
  return emojiMap[option.toLowerCase()] || '😐';
};

const EmbeddedWidget: React.FC<{ config: ExtendedConfig }> = ({ config }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [triggerTimer, setTriggerTimer] = useState<NodeJS.Timeout | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [customizerSettings, setCustomizerSettings] = useState<WidgetCustomizerSettings>(() => {
    // Try to load saved settings from localStorage
    const savedSettings = localStorage.getItem(`widget-settings-${config.widgetId || 'default'}`);
    const defaultSettings: WidgetCustomizerSettings = {
      color: config.themeColor || 'red',
      transparency: 95,
      glassEffect: true,
      animationSpeed: 50,
      questionDelay: 2000,
      questionAnimation: 'simple',
      answerAnimation: 'simple',
      smartDelay: true,
      minDelay: 2000,
      maxDelay: 50000,
      questions: mapQuestions(config.questions || [])
    };
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsed, ...config.customSettings };
      } catch (e) {
        console.warn('Failed to parse saved settings, using defaults');
      }
    }
    
    return { ...defaultSettings, ...config.customSettings };
  });
  const [adminPanelVisible, setAdminPanelVisible] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      const { trigger } = config;
      
      if (trigger.type === 'immediate') {
        setIsVisible(true);
      } else if (trigger.type === 'timeSpent' && trigger.seconds) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, trigger.seconds * 1000);
        setTriggerTimer(timer);
      } else if (trigger.type === 'scroll') {
        const handleScroll = () => {
          const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent > 50) {
            setIsVisible(true);
            window.removeEventListener('scroll', handleScroll);
          }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      } else if (trigger.type === 'idle') {
        let idleTimer: NodeJS.Timeout;
        const resetTimer = () => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            setIsVisible(true);
          }, (trigger.seconds || 30) * 1000);
        };
        
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
          document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer();
        
        return () => {
          ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.removeEventListener(event, resetTimer, true);
          });
          clearTimeout(idleTimer);
        };
      }
    };

    const cleanup = handleTrigger();
    return () => {
      if (triggerTimer) clearTimeout(triggerTimer);
      cleanup?.();
    };
  }, [config]);

  const handleSettingsChange = (settings: WidgetCustomizerSettings) => {
    setCustomizerSettings(settings);
    // Save to localStorage
    localStorage.setItem(`widget-settings-${config.widgetId || 'default'}`, JSON.stringify(settings));
    // Call external callback if provided
    config.onSettingsChange?.(settings);
  };
  
  const handleShowWidget = () => {
    setIsWidgetVisible(true);
    setIsVisible(true);
  };
  
  const handleHideWidget = () => {
    setIsWidgetVisible(false);
    setIsVisible(false);
  };
  
  const handleComplete = (responses: Record<string, string>) => {
    console.log('Survey completed:', responses);
    config.onComplete?.(responses);
    setIsVisible(false);
  };
  
  const handleDismiss = () => {
    config.onDismiss?.();
    setIsVisible(false);
  };
  
  const toggleAdminPanel = () => {
    setAdminPanelVisible(!adminPanelVisible);
  };
  
  // Global methods for external control
  useEffect(() => {
    window.SurveyWidget = {
      ...window.SurveyWidget,
      showCustomizer: () => setShowCustomizer(true),
      hideCustomizer: () => setShowCustomizer(false),
      updateSettings: (settings: Partial<WidgetCustomizerSettings>) => {
        setCustomizerSettings(prev => ({ ...prev, ...settings }));
        localStorage.setItem(`widget-settings-${config.widgetId || 'default'}`, JSON.stringify({ ...customizerSettings, ...settings }));
      },
      getSettings: () => customizerSettings
    };
  }, [customizerSettings, config.widgetId]);
  const getPositionStyles = () => {
    const position = config.position || 'bottom-right';
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 9999,
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' };
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' };
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' };
      default:
        return { ...baseStyles, bottom: '20px', right: '20px' };
    }
  };

  return (
    <>
      {/* Admin Panel Toggle (only in admin mode) */}
      {config.adminMode && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onClick={toggleAdminPanel}
        >
          <Settings size={16} />
          Widget Admin
        </div>
      )}
      
      {/* Admin Panel */}
      {config.adminMode && adminPanelVisible && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <button
              onClick={() => setAdminPanelVisible(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                color: '#6b7280'
              }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', gap: '24px', minHeight: '600px' }}>
              <div style={{ flex: 1, minWidth: '400px' }}>
                <WidgetCustomizer
                  isDarkMode={false}
                  onSettingsChange={handleSettingsChange}
                  onShowWidget={handleShowWidget}
                  onHideWidget={handleHideWidget}
                  isWidgetVisible={isWidgetVisible}
                  initialSettings={customizerSettings}
                />
              </div>
              
              <div style={{ 
                flex: 1, 
                minWidth: '400px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #e2e8f0'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Live Preview
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  Click "Show Widget" to preview your changes
                </p>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={handleShowWidget}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                  
                  {isWidgetVisible && (
                    <button
                      onClick={handleHideWidget}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <EyeOff size={16} />
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <strong>Widget ID:</strong> {config.widgetId || 'default'} • 
              <strong>Settings Auto-saved</strong> • 
              Use the customizer to edit questions, colors, animations, and more!
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Widget */}
      {isVisible && (
        <div style={getPositionStyles()}>
          <FloatingWidget
            isDarkMode={false}
            customColor={customizerSettings.color}
            customQuestions={customizerSettings.questions}
            onComplete={handleComplete}
            onDismiss={handleDismiss}
            glassEffect={customizerSettings.glassEffect}
            transparency={customizerSettings.transparency}
            animationSpeed={customizerSettings.animationSpeed}
            questionDelay={customizerSettings.questionDelay}
            questionAnimation={customizerSettings.questionAnimation}
            answerAnimation={customizerSettings.answerAnimation}
            smartDelay={customizerSettings.smartDelay}
            minDelay={customizerSettings.minDelay}
            maxDelay={customizerSettings.maxDelay}
          />
        </div>
      )}
    </>
  );
};

window.SurveyWidget = {
  init: (config: ExtendedConfig) => {
    const container = createContainer();
    const root = ReactDOM.createRoot(container);

    root.render(<EmbeddedWidget config={config} />);
  },
  showCustomizer: () => {},
  hideCustomizer: () => {},
  updateSettings: () => {},
  getSettings: () => null
};
