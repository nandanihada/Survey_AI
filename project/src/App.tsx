import React, { lazy, Suspense } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import OptimizedLoader from './components/OptimizedLoader';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LandingRedirect from './components/LandingRedirect';
import './styles/mobile-responsive.css';

// Lazy load pages and components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

// Survey components
const SurveyEditor = lazy(() => import('./components/SurveyEditor'));
const PublicSurveyPage = lazy(() => import('./components/PublicSurveyPage'));
const SurveyPreviewPage = lazy(() => import('./components/SurveyPreviewPage'));
const SurveyResponsesPage = lazy(() => import('./components/SurveyResponsesPage'));

// Widget components
const WidgetTestPage = lazy(() => import('./components/WidgetTestPage'));

// Import legacy dashboard for backward compatibility
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import { PenSquare, FolderOpen, TrendingUp, Link, Sun, Moon, Settings, Lock } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { FloatingWidgetProvider } from './components/FloatingWidgetProvider';
import type { WidgetCustomizerSettings } from './components/WidgetCustomizer';

const SurveyForm = lazy(() => import('./components/SurveyForm'));
const SurveyList = lazy(() => import('./components/SurveyList'));
const PostbackManager = lazy(() => import('./components/PostbackManager'));
const ResponseAnalytics = lazy(() => import('./components/ResponseAnalytics'));
const FloatingWidget = lazy(() => import('./components/FloatingWidget'));
const WidgetResponsesView = lazy(() => import('./components/WidgetResponsesView'));
const PassFailAdmin = lazy(() => import('./components/PassFailAdmin'));

// Legacy dashboard component - will be removed after migration
function LegacyDashboard() {
  const { hasFeature } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'create');
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
                  { value: 'create', icon: PenSquare, label: 'Create', requiresFeature: 'create' },
                  { value: 'surveys', icon: FolderOpen, label: 'Surveys', requiresFeature: 'survey' },
                  { value: 'responses', icon: TrendingUp, label: 'Analytics', requiresFeature: 'analytics' },
                  { value: 'postback', icon: Link, label: 'Postback', requiresFeature: 'postback' },
                  { value: 'passfail', icon: Settings, label: 'Pass/Fail', requiresFeature: 'pass_fail' },
                  { value: 'testlab', icon: () => <span className="text-xs">🧪</span>, label: 'Test Lab', requiresFeature: 'test_lab' }
                ].map(({ value, icon: Icon, label, requiresFeature }) => {
                  const hasAccess = hasFeature(requiresFeature);
                  return (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md transition-all duration-150 relative ${
                        !hasAccess
                          ? 'opacity-50 cursor-not-allowed'
                          : isDarkMode
                          ? 'data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-300 hover:text-white'
                          : 'data-[state=active]:bg-white data-[state=active]:text-red-600 text-stone-600 hover:text-stone-800'
                      }`}
                    >
                      {!hasAccess ? (
                        <>
                          <Lock size={14} className="text-red-500" />
                          <span className="hidden lg:inline">{label}</span>
                        </>
                      ) : (
                        <>
                          <Icon size={14} />
                          <span className="hidden lg:inline">{label}</span>
                        </>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile Tabs - Visible only on mobile */}
          <div className="md:hidden w-full order-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid grid-cols-6 rounded-lg p-1 text-xs w-full ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
                {[
                  { value: 'create', icon: PenSquare, label: 'Create', requiresFeature: 'create' },
                  { value: 'surveys', icon: FolderOpen, label: 'Surveys', requiresFeature: 'survey' },
                  { value: 'responses', icon: TrendingUp, label: 'Analytics', requiresFeature: 'analytics' },
                  { value: 'postback', icon: Link, label: 'Postback', requiresFeature: 'postback' },
                  { value: 'passfail', icon: Settings, label: 'Pass/Fail', requiresFeature: 'pass_fail' },
                  { value: 'testlab', icon: () => <span className="text-xs">🧪</span>, label: 'Test Lab', requiresFeature: 'test_lab' }
                ].map(({ value, icon: Icon, label, requiresFeature }) => {
                  const hasAccess = hasFeature(requiresFeature);
                  return (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all duration-150 relative ${
                        !hasAccess
                          ? 'opacity-50 cursor-not-allowed'
                          : isDarkMode
                          ? 'data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-300 hover:text-white'
                          : 'data-[state=active]:bg-white data-[state=active]:text-red-600 text-stone-600 hover:text-stone-800'
                      }`}
                    >
                      {!hasAccess ? (
                        <>
                          <Lock size={12} className="text-red-500" />
                          <span className="text-xs leading-none">{label}</span>
                        </>
                      ) : (
                        <>
                          <Icon size={12} />
                          <span className="text-xs leading-none">{label}</span>
                        </>
                      )}
                    </TabsTrigger>
                  );
                })}
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
                <Suspense fallback={<OptimizedLoader type="component" message="Loading survey form..." />}>
                  <SurveyForm isDarkMode={isDarkMode} onNavigateToSurveys={() => setActiveTab('surveys')} />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="surveys">
              <Suspense fallback={<OptimizedLoader type="component" message="Loading surveys..." />}>
                <SurveyList isDarkMode={isDarkMode} />
              </Suspense>
            </TabsContent>
            <TabsContent value="responses">
              <div className="space-y-6">
                <Suspense fallback={<OptimizedLoader type="component" message="Loading analytics..." />}>
                  <ResponseAnalytics isDarkMode={isDarkMode} />
                  <WidgetResponsesView isDarkMode={isDarkMode} />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="postback">
              {hasFeature('postback') ? (
                <Suspense fallback={<OptimizedLoader type="component" message="Loading postback manager..." />}>
                  <PostbackManager isDarkMode={isDarkMode} />
                </Suspense>
              ) : (
                <div className={`p-6 rounded-lg border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'}`}>
                  <Lock size={48} className="mx-auto mb-4 text-red-500" />
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Premium Access Required</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>This feature requires Premium or higher subscription. Please upgrade your account.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="passfail">
              {hasFeature('pass_fail') ? (
                <Suspense fallback={<OptimizedLoader type="component" message="Loading pass/fail admin..." />}>
                  <PassFailAdmin isDarkMode={isDarkMode} />
                </Suspense>
              ) : (
                <div className={`p-6 rounded-lg border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'}`}>
                  <Lock size={48} className="mx-auto mb-4 text-red-500" />
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Premium Access Required</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>This feature requires Premium or higher subscription. Please upgrade your account.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="testlab">
              {hasFeature('test_lab') ? (
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
              ) : (
                <div className={`p-6 rounded-lg border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'}`}>
                  <Lock size={48} className="mx-auto mb-4 text-red-500" />
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Enterprise Access Required</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>This feature requires Enterprise subscription. Please upgrade your account.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
      
      {/* Preview Widget */}
      {showPreviewWidget && widgetSettings && (
        <Suspense fallback={null}>
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
        </Suspense>
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
        
        <Suspense fallback={<OptimizedLoader type="component" message="Loading customizer..." />}>
          <WidgetCustomizer
            isDarkMode={isDarkMode}
            onSettingsChange={setWidgetSettings}
            onShowWidget={() => setIsWidgetVisible(true)}
            onHideWidget={() => setIsWidgetVisible(false)}
            isWidgetVisible={isWidgetVisible}
            initialSettings={widgetSettings}
          />
        </Suspense>
        
        {isWidgetVisible && (
          <Suspense fallback={null}>
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
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-light-theme">
          <OptimizedLoader type="page" message="Loading..." />
        </div>
      }>
        <Routes>
          {/* Landing page - redirects based on auth */}
          <Route path="/" element={<LandingRedirect />} />
          
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } />
          
          {/* Public survey routes */}
          <Route path="/survey/:id" element={<PublicSurveyPage />} />
          <Route path="/survey" element={<PublicSurveyPage />} />
          <Route path="/s/:shortId" element={<PublicSurveyPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Dashboard nested routes */}
          <Route path="/dashboard/create" element={
            <ProtectedRoute>
              <LegacyDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/edit/:id" element={
            <ProtectedRoute>
              <SurveyEditor />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/preview/:id" element={
            <ProtectedRoute>
              <SurveyPreviewPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/responses/:id" element={
            <ProtectedRoute>
              <SurveyResponsesPage />
            </ProtectedRoute>
          } />
          
          {/* Legacy routes - redirect to dashboard */}
          <Route path="/create" element={
            <ProtectedRoute>
              <LegacyDashboard />
            </ProtectedRoute>
          } />
          <Route path="/edit/:id" element={
            <ProtectedRoute>
              <SurveyEditor />
            </ProtectedRoute>
          } />
          <Route path="/preview/:id" element={
            <ProtectedRoute>
              <SurveyPreviewPage />
            </ProtectedRoute>
          } />
          
          {/* User routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Widget routes */}
          <Route path="/widget-test" element={<WidgetTestPage />} />
          
          {/* Error routes */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
