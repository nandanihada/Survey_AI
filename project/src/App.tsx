import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import SurveyForm from './components/SurveyForm';
import SurveyList from './components/SurveyList';
import PostbackManager from './components/PostbackManager';
import ResponseAnalytics from './components/ResponseAnalytics';
import SurveyEditor from './components/SurveyEditor';
import PublicSurveyPage from './components/PublicSurveyPage';
import SurveyPreviewPage from './components/SurveyPreviewPage';
import { FloatingWidgetProvider } from './components/FloatingWidgetProvider';
import WidgetTestPage from './components/WidgetTestPage';
import FloatingWidget from './components/FloatingWidget';
import { WidgetResponsesView } from './components/WidgetResponsesView';
import { WidgetCustomizer, WidgetCustomizerSettings } from './components/WidgetCustomizer';
import PassFailAdmin from './components/PassFailAdmin';
import { PenSquare, FolderOpen, TrendingUp, Link, Sun, Moon, Settings } from 'lucide-react';
import './styles/mobile-responsive.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('create');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPreviewWidget, setShowPreviewWidget] = useState(false);
  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(true);

// State for widget settings
  const [widgetSettings, setWidgetSettings] = useState<WidgetCustomizerSettings | null>(null);

  // Memoized default settings
  const defaultSettings = useMemo<WidgetCustomizerSettings>(() => ({
    color: 'red',
    transparency: 95,
    glassEffect: true,
    animationSpeed: 50,
    questionDelay: 2000,
    questionAnimation: 'simple',
    answerAnimation: 'simple',
    smartDelay: true,
    minDelay: 2000,
    maxDelay: 50000,
    questions: [
      {
        id: 'q1',
        text: 'How are you feeling about your experience so far?',
        type: 'emoji',
        options: [
          { id: 'opt1', label: 'Amazing', emoji: '🤩' },
          { id: 'opt2', label: 'Good', emoji: '😊' },
          { id: 'opt3', label: 'Okay', emoji: '😐' },
          { id: 'opt4', label: 'Frustrated', emoji: '😤' }
        ]
      }
    ]
  }), []);

  // Load settings from localStorage and listen for changes
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('widgetCustomizerSettings');
      if (savedSettings) {
        try {
          setWidgetSettings(JSON.parse(savedSettings));
        } catch (error) {
          console.error('Error parsing saved widget settings:', error);
          setWidgetSettings(defaultSettings);
          localStorage.setItem('widgetCustomizerSettings', JSON.stringify(defaultSettings));
        }
      } else {
        setWidgetSettings(defaultSettings);
        localStorage.setItem('widgetCustomizerSettings', JSON.stringify(defaultSettings));
      }
    };


    loadSettings();

    // Listen for storage changes (when settings are updated from customizer)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'widgetCustomizerSettings' && e.newValue) {
        try {
          setWidgetSettings(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing updated widget settings:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events within the same page
    const handleCustomEvent = (e: CustomEvent) => {
      setWidgetSettings(e.detail);
    };
    
    window.addEventListener('widgetSettingsUpdated', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('widgetSettingsUpdated', handleCustomEvent as EventListener);
    };
  }, [defaultSettings]);

  const toggleTheme = useCallback(() => setIsDarkMode(!isDarkMode), []);

  const handleWidgetComplete = useCallback((responses: Record<string, string>) => {
    console.log('Widget completed with responses:', responses);
    setShowPreviewWidget(false);
    // You can integrate this with your analytics or backend here
  }, []);

  const handleWidgetDismiss = useCallback(() => {
    console.log('Widget dismissed');
    setShowPreviewWidget(false);
  }, []);

  const showWidgetPreview = useCallback(() => {
    setShowPreviewWidget(true);
  }, []);

  const toggleAutoPreview = () => {
    setAutoPreviewEnabled(!autoPreviewEnabled);
    if (!autoPreviewEnabled) {
      // Start auto preview after 5 seconds
      setTimeout(() => {
        if (autoPreviewEnabled) {
          setShowPreviewWidget(true);
        }
      }, 5000);
    }
  };

  // Auto preview logic
  useEffect(() => {
    if (autoPreviewEnabled && activeTab === 'create') {
      const timer = setTimeout(() => {
        setShowPreviewWidget(true);
      }, 8000); // Show after 8 seconds on create tab
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, autoPreviewEnabled]);

  return (
    <FloatingWidgetProvider
      isDarkMode={isDarkMode}
      onWidgetComplete={handleWidgetComplete}
      onWidgetDismiss={handleWidgetDismiss}
    >
      <div className={`min-h-screen transition-all duration-300 mobile-scroll safe-area-inset ${isDarkMode ? 'bg-dark-theme text-white' : 'bg-light-theme text-stone-800'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-stone-200'} backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-xs ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <img
                src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
                alt="Chilli Icon"
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{ animation: 'wiggleGlow 1s infinite', filter: 'drop-shadow(0 0 4px red)' }}
              />
              <style>{`@keyframes wiggleGlow {
                0%,100%{transform:rotate(0deg);filter:drop-shadow(0 0 6px red)}
                25%{transform:rotate(5deg);filter:drop-shadow(0 0 10px red)}
                75%{transform:rotate(-5deg);filter:drop-shadow(0 0 10px red)}
              }`}</style>
            </div>
            <span className="text-sm sm:text-base font-medium">AI Survey</span>
          </div>

          {/* Mobile Navigation - Hidden on mobile, shown on tablet+ */}
          <div className="hidden md:flex">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid grid-cols-6 rounded-lg p-1 text-xs ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
                {[
                  { value: 'create', icon: PenSquare, label: 'Create' },
                  { value: 'surveys', icon: FolderOpen, label: 'Surveys' },
                  { value: 'responses', icon: TrendingUp, label: 'Analytics' },
                  { value: 'postback', icon: Link, label: 'Postback' },
                  { value: 'passfail', icon: Settings, label: 'Pass/Fail' },
                  { value: 'testlab', icon: () => <span className="text-xs">🧪</span>, label: 'Test Lab' }
                ].map(({ value, icon: Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md transition-all duration-150 ${
                      isDarkMode
                        ? 'data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-300 hover:text-white'
                        : 'data-[state=active]:bg-white data-[state=active]:text-red-600 text-stone-600 hover:text-stone-800'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden lg:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile Tabs - Visible only on mobile */}
          <div className="md:hidden w-full order-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid grid-cols-6 rounded-lg p-1 text-xs w-full ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
                {[
                  { value: 'create', icon: PenSquare, label: 'Create' },
                  { value: 'surveys', icon: FolderOpen, label: 'Surveys' },
                  { value: 'responses', icon: TrendingUp, label: 'Analytics' },
                  { value: 'postback', icon: Link, label: 'Postback' },
                  { value: 'passfail', icon: Settings, label: 'Pass/Fail' },
                  { value: 'testlab', icon: () => <span className="text-xs">🧪</span>, label: 'Test Lab' }
                ].map(({ value, icon: Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all duration-150 ${
                      isDarkMode
                        ? 'data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-300 hover:text-white'
                        : 'data-[state=active]:bg-white data-[state=active]:text-red-600 text-stone-600 hover:text-stone-800'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="text-xs leading-none">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
            }`}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 gap-4 sm:gap-6 min-h-screen">
        
        {/* Main Content */}
        <div className="flex-1 w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="create">
              <div className="space-y-4 sm:space-y-6">
                <SurveyForm isDarkMode={isDarkMode} />
                
                {/* Widget Preview Section */}
                <div className={`p-4 sm:p-6 rounded-lg border ${
                  isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'
                }`}>
                  <h3 className={`text-base sm:text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-stone-800'
                  }`}>Widget Preview</h3>
                  <p className={`text-sm mb-4 ${
                    isDarkMode ? 'text-slate-300' : 'text-stone-600'
                  }`}>
                    See how your survey widget will appear to visitors.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <button
                      onClick={showWidgetPreview}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
                    >
                      Preview Widget
                    </button>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoPreviewEnabled}
                        onChange={toggleAutoPreview}
                        className="rounded"
                      />
                      <span className={isDarkMode ? 'text-slate-300' : 'text-stone-600'}>
                        Auto-preview
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="surveys"><SurveyList isDarkMode={isDarkMode} /></TabsContent>
            <TabsContent value="responses">
              <div className="space-y-6">
                <ResponseAnalytics isDarkMode={isDarkMode} />
                <WidgetResponsesView isDarkMode={isDarkMode} />
              </div>
            </TabsContent>
            <TabsContent value="postback"><PostbackManager isDarkMode={isDarkMode} /></TabsContent>
            <TabsContent value="passfail"><PassFailAdmin isDarkMode={isDarkMode} /></TabsContent>
            <TabsContent value="testlab">
              <div className="space-y-6">
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'}`}>
                  <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    🧪 Widget Test Lab
                  </h2>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                    Test the enhanced floating widget with centered positioning, glass effects, and typewriter animations.
                  </p>
                  <button
                    onClick={() => window.open('/widget-test', '_blank')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Open Test Lab in New Tab
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
      
      {/* Preview Widget */}
      {showPreviewWidget && widgetSettings && (
        <FloatingWidget
          isDarkMode={isDarkMode}
          customColor={widgetSettings.color}
          glassEffect={widgetSettings.glassEffect}
          transparency={widgetSettings.transparency}
          animationSpeed={widgetSettings.animationSpeed}
          questionDelay={widgetSettings.questionDelay}
          customQuestions={widgetSettings.questions}
          onComplete={handleWidgetComplete}
          onDismiss={handleWidgetDismiss}
        />
      )}
    </FloatingWidgetProvider>
  );
}

function WidgetCustomizerPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<WidgetCustomizerSettings>({
    color: 'red',
    transparency: 95,
    glassEffect: true,
    animationSpeed: 50,
    questionDelay: 2000,
    questionAnimation: 'simple',
    answerAnimation: 'simple',
    smartDelay: true,
    minDelay: 2000,
    maxDelay: 50000,
    questions: [
      {
        id: 'q1',
        text: 'How are you feeling about your experience so far?',
        type: 'emoji',
        options: [
          { id: 'opt1', label: 'Amazing', emoji: '🤩' },
          { id: 'opt2', label: 'Good', emoji: '😊' },
          { id: 'opt3', label: 'Okay', emoji: '😐' },
          { id: 'opt4', label: 'Frustrated', emoji: '😤' }
        ]
      }
    ]
  });
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Widget Customizer</h1>
          <p className="text-gray-600">Customize your survey widget and see changes in real-time.</p>
        </div>
        
        <WidgetCustomizer
          isDarkMode={isDarkMode}
          onSettingsChange={setWidgetSettings}
          onShowWidget={() => setIsWidgetVisible(true)}
          onHideWidget={() => setIsWidgetVisible(false)}
          isWidgetVisible={isWidgetVisible}
          initialSettings={widgetSettings}
        />
        
        {isWidgetVisible && (
          <FloatingWidget
            isDarkMode={isDarkMode}
            customColor={widgetSettings.color}
            glassEffect={widgetSettings.glassEffect}
            transparency={widgetSettings.transparency}
            animationSpeed={widgetSettings.animationSpeed}
            questionDelay={widgetSettings.questionDelay}
            customQuestions={widgetSettings.questions}
            onComplete={(responses) => {
              console.log('Widget completed:', responses);
              setIsWidgetVisible(false);
            }}
            onDismiss={() => setIsWidgetVisible(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/survey/:id" element={<PublicSurveyPage />} />
      <Route path="/preview/:id" element={<SurveyPreviewPage />} />
      <Route path="/edit/:id" element={<SurveyEditor />} />
      <Route path="/widget-test" element={<WidgetTestPage />} />
      <Route path="/widget-customizer" element={<WidgetCustomizerPage />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}
