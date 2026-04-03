import React, { lazy, Suspense } from 'react';
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import OptimizedLoader from './components/OptimizedLoader';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LandingRedirect from './components/LandingRedirect';
import NotificationBanner from './components/NotificationBanner';
import EmailConfirmation from './components/EmailConfirmation';
import './styles/mobile-responsive.css';

// Suppress React Router v7 deprecation warnings
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

// Retry wrapper for lazy imports - retries up to 3 times on chunk load failure
function lazyRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch((err) => {
      console.error('[LazyRetry] Chunk load failed, retrying...', err);
      return new Promise<{ default: React.ComponentType<any> }>((resolve, reject) => {
        setTimeout(() => {
          importFn().then(resolve).catch(reject);
        }, 1500);
      });
    })
  );
}

// Global error boundary for catching chunk load failures
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || 'Unknown error' };
  }
  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f9fafb', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, color: '#374151', marginBottom: 8 }}>Page failed to load</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 28px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load pages and components with retry
const AdminDashboard = lazyRetry(() => import('./pages/AdminDashboard'));
const MLInsightsDashboard = lazyRetry(() => import('./pages/MLInsightsDashboard'));
const EmailTriggerManager = lazyRetry(() => import('./pages/EmailTriggerManager'));
const LoginPage = lazyRetry(() => import('./pages/LoginPage'));
const SignupPage = lazyRetry(() => import('./pages/SignupPage'));
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'));
const LinkMaskingDashboard = lazyRetry(() => import('./pages/LinkMaskingDashboard'));
const MaskedLinkViewer = lazyRetry(() => import('./pages/MaskedLinkViewer'));
const NotFound = lazyRetry(() => import('./pages/NotFound'));
const Unauthorized = lazyRetry(() => import('./pages/Unauthorized'));
const AffiliateProgram = lazy(() => import('./pages/AffiliateProgram'));
const ConfirmPage = lazyRetry(() => import('./pages/ConfirmPage'));

// Survey components
const SurveyEditor = lazyRetry(() => import('./components/SurveyEditor'));
const PublicSurveyPage = lazyRetry(() => import('./components/PublicSurveyPage'));
const SurveyPreviewPage = lazyRetry(() => import('./components/SurveyPreviewPage'));
const SurveyResponsesPage = lazyRetry(() => import('./components/SurveyResponsesPage'));

// Widget components
const WidgetTestPage = lazyRetry(() => import('./components/WidgetTestPage'));

// Import legacy dashboard for backward compatibility
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import { PenSquare, FolderOpen, TrendingUp, Link, Mail, MapPin, Sun, Moon, Settings, Lock, Menu, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { FloatingWidgetProvider } from './components/FloatingWidgetProvider';
import type { WidgetCustomizerSettings } from './components/WidgetCustomizer';

const PublicSurveyCreation = lazyRetry(() => import('./components/PublicSurveyCreation'));
const SurveyForm = lazyRetry(() => import('./components/SurveyForm'));
const SurveyList = lazyRetry(() => import('./components/SurveyList'));
const PostbackManager = lazyRetry(() => import('./components/PostbackManager'));
const ResponseAnalytics = lazyRetry(() => import('./components/ResponseAnalytics'));
const FloatingWidget = lazyRetry(() => import('./components/FloatingWidget'));
const WidgetResponsesView = lazyRetry(() => import('./components/WidgetResponsesView'));
const EmailDashboard = lazyRetry(() => import('./pages/EmailDashboard'));
const PassFailAdmin = lazyRetry(() => import('./components/PassFailAdmin'));
const AnalyticsDashboard = lazyRetry(() => import('./pages/AnalyticsDashboard'));
const ProfessionalAnalyticsDashboard = lazyRetry(() => import('./pages/ProfessionalAnalyticsDashboard'));
const SessionAnalyticsView = lazyRetry(() => import('./pages/SessionAnalyticsView'));

// Legacy dashboard component - will be removed after migration
function LegacyDashboard() {
  const { hasFeature } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'create');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPreviewWidget, setShowPreviewWidget] = useState(false);
  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    console.log('URL tab parameter:', tab);
    console.log('Current activeTab:', activeTab);
    if (tab && tab !== activeTab) {
      console.log('Setting activeTab to:', tab);
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

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
        <div className={`sticky top-0 z-50 border-b ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-stone-200'} backdrop-blur-sm`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded flex items-center justify-center text-xs`}>
                <img
                  src="https://i.postimg.cc/qq8tgkpd/Screenshot-(2313).png"
                  alt="Pepperwahl Logo"
                  className={`w-6 h-6 sm:w-8 sm:h-8 ${isDarkMode ? 'brightness-200 contrast-125 mix-blend-screen' : 'mix-blend-multiply'}`}
                />
              </div>
              <span className="text-sm sm:text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-500">Pepperwahl</span>
            </div>

            {/* Mobile Navigation - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:flex">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`flex flex-row items-center rounded-lg p-1 text-xs gap-1 ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
                  {[
                    { value: 'create', icon: PenSquare, label: 'Create', requiresFeature: 'create' },
                    { value: 'surveys', icon: FolderOpen, label: 'Surveys', requiresFeature: 'survey' },
                    { value: 'responses', icon: TrendingUp, label: 'Analytics', requiresFeature: 'analytics' },
                    { value: 'sessions', icon: MapPin, label: 'Sessions', requiresFeature: 'analytics' },
                    { value: 'postback', icon: Link, label: 'Postback', requiresFeature: 'postback', isPremiumIcon: true },
                    { value: 'passfail', icon: Settings, label: 'Pass/Fail', requiresFeature: 'pass_fail', isPremiumIcon: true },
                    { value: 'testlab', icon: () => <span className="text-xs">🧪</span>, label: 'Test Lab', requiresFeature: 'test_lab', isPremiumIcon: true }
                  ].map(({ value, icon: Icon, label, requiresFeature, isPremiumIcon }) => {
                    const hasAccess = hasFeature(requiresFeature);
                    return (
                      <TabsTrigger
                        key={value}
                        value={value}
                        onClick={(e) => {
                          if (!hasAccess && isPremiumIcon) {
                            e.preventDefault();
                            navigate('/signup');
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md transition-all duration-150 relative ${!hasAccess && !isPremiumIcon
                            ? 'opacity-50 cursor-not-allowed'
                            : isDarkMode
                              ? 'data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-300 hover:text-white'
                              : 'data-[state=active]:bg-white data-[state=active]:text-red-600 text-stone-600 hover:text-stone-800'
                          }`}
                      >
                        {!hasAccess && !isPremiumIcon ? (
                          <>
                            <Lock size={14} className="text-red-500" />
                            <span className="hidden lg:inline">{label}</span>
                          </>
                        ) : (
                          <>
                            {isPremiumIcon && !hasAccess ? (
                              <div className="relative flex items-center justify-center w-5 h-5" title={`${label} - Locked`}>
                                <Icon size={16} className="text-stone-400 dark:text-slate-500" />
                                <Lock size={10} className="absolute -bottom-1 -right-1 text-red-500 bg-white dark:bg-slate-800 rounded-full" />
                              </div>
                            ) : (
                              <div title={isPremiumIcon ? label : undefined}>
                                <Icon size={16} />
                              </div>
                            )}
                            {!isPremiumIcon && <span className="hidden lg:inline">{label}</span>}
                          </>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            {/* Mobile Hamburger - Visible only on mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-md transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`p-2 rounded-md transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
              >
                <Menu size={20} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isDarkMode
                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
              >
                <span className="opacity-70">Free plan</span>
                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                <span className={isDarkMode ? 'text-white' : 'text-stone-900'}>Upgrade</span>
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-md transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div
              className={`absolute top-0 right-0 h-full w-72 shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-800' : 'bg-white'
                }`}
              style={{ animation: 'slideInRight 0.25s ease-out' }}
            >
              <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-stone-200'}`}>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 py-2 overflow-y-auto">
                {[
                  { value: 'create', icon: PenSquare, label: 'Create', desc: 'Generate AI surveys', requiresFeature: 'create' },
                  { value: 'surveys', icon: FolderOpen, label: 'Surveys', desc: 'Manage your surveys', requiresFeature: 'survey' },
                  { value: 'responses', icon: TrendingUp, label: 'Analytics', desc: 'View responses & data', requiresFeature: 'analytics' },
                  { value: 'sessions', icon: MapPin, label: 'Sessions', desc: 'Real-time session tracking', requiresFeature: 'analytics' },
                  { value: 'postback', icon: Link, label: 'Postback', desc: 'Configure postbacks', requiresFeature: 'postback', isPremiumIcon: true },
                  { value: 'email', icon: Mail, label: 'Email', desc: 'Email triggers & templates', requiresFeature: 'email' },
                  { value: 'passfail', icon: Settings, label: 'Pass/Fail', desc: 'Set evaluation rules', requiresFeature: 'pass_fail', isPremiumIcon: true },
                  { value: 'testlab', icon: () => <span className="text-lg">🧪</span>, label: 'Test Lab', desc: 'Widget testing', requiresFeature: 'test_lab', isPremiumIcon: true }
                ].map(({ value, icon: Icon, label, desc, requiresFeature, isPremiumIcon }) => {
                  const hasAccess = hasFeature(requiresFeature);
                  const isActive = activeTab === value;
                  return (
                    <button
                      key={value}
                      onClick={() => {
                        if (hasAccess) {
                          setActiveTab(value); setMobileMenuOpen(false);
                        } else if (isPremiumIcon) {
                          navigate('/signup');
                        }
                      }}
                      disabled={!hasAccess && !isPremiumIcon}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${(!hasAccess && !isPremiumIcon)
                          ? 'opacity-40 cursor-not-allowed'
                          : isActive
                            ? isDarkMode ? 'bg-red-500/10 border-r-2 border-red-500' : 'bg-red-50 border-r-2 border-red-500'
                            : isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-stone-50'
                        }`}
                    >
                      <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center ${isActive
                          ? 'bg-red-500 text-white'
                          : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-500'
                        }`}>
                        {(!hasAccess && !isPremiumIcon) ? (
                          <Lock size={16} className="text-red-500" />
                        ) : isPremiumIcon && !hasAccess ? (
                          <>
                            <Icon size={16} className="opacity-70" />
                            <Lock size={10} className="absolute -bottom-1 -right-1 text-red-500 bg-white dark:bg-slate-800 rounded-full" />
                          </>
                        ) : (
                          <Icon size={16} />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isActive ? (isDarkMode ? 'text-red-400' : 'text-red-600') : isDarkMode ? 'text-white' : 'text-stone-800'}`}>{label}</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`}>{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className={`px-5 py-4 border-t text-center ${isDarkMode ? 'border-slate-700' : 'border-stone-200'}`}>
                <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>PepperAds AI Survey</p>
              </div>
            </div>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 gap-4 sm:gap-6 min-h-screen">

          {/* Main Content */}
          <div className="flex-1 w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="create">
                <div className="space-y-4 sm:space-y-6">
                  <Suspense fallback={<OptimizedLoader type="page" message="Loading survey form..." />}>
                    <SurveyForm isDarkMode={isDarkMode} onNavigateToSurveys={() => setActiveTab('surveys')} />
                  </Suspense>
                </div>
              </TabsContent>
              <TabsContent value="surveys">
                <Suspense fallback={<OptimizedLoader type="page" message="Loading surveys..." />}>
                  <SurveyList isDarkMode={isDarkMode} />
                </Suspense>
              </TabsContent>
              <TabsContent value="responses">
                <div className="space-y-6">
                  <Suspense fallback={<OptimizedLoader type="page" message="Loading analytics..." />}>
                    <ResponseAnalytics isDarkMode={isDarkMode} />
                    <WidgetResponsesView isDarkMode={isDarkMode} />
                  </Suspense>
                </div>
              </TabsContent>
              <TabsContent value="sessions">
                <div className="space-y-6">
                  <Suspense fallback={<OptimizedLoader type="page" message="Loading session intelligence..." />}>
                    <SessionAnalyticsView />
                  </Suspense>
                </div>
              </TabsContent>
              <TabsContent value="postback">
                {hasFeature('postback') ? (
                  <Suspense fallback={<OptimizedLoader type="page" message="Loading postback manager..." />}>
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
              <TabsContent value="email">
                {hasFeature('email') ? (
                  <Suspense fallback={<OptimizedLoader type="page" message="Loading email system..." />}>
                    <EmailDashboard />
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
                  <Suspense fallback={<OptimizedLoader type="page" message="Loading pass/fail admin..." />}>
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


export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-light-theme">
            <OptimizedLoader type="page" message="Loading..." />
          </div>
        }>
          <Routes>
            {/* Landing page - redirects based on auth */}
            <Route path="/" element={<LandingRedirect />} />

            {/* Public survey creation - allows 1 survey without login */}
            <Route path="/create-survey" element={<PublicSurveyCreation />} />

            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Affiliate Program Landing Page */}
            <Route path="/partners" element={<AffiliateProgram />} />
            <Route path="/affiliate" element={<AffiliateProgram />} />

            <Route path="/confirm-email" element={<EmailConfirmation />} />
            <Route path="/confirm" element={<ConfirmPage />} />

            {/* Public survey routes */}
            <Route path="/survey/:id" element={<PublicSurveyPage />} />
            <Route path="/survey" element={<PublicSurveyPage />} />
            <Route path="/s/:shortId" element={<PublicSurveyPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <LegacyDashboard />
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

            {/* Analytics routes */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/analytics-pro" element={
              <ProtectedRoute>
                <ProfessionalAnalyticsDashboard />
              </ProtectedRoute>
            } />

            <Route path="/ml-insights" element={
              <ProtectedRoute>
                <MLInsightsDashboard />
              </ProtectedRoute>
            } />

            <Route path="/session-analytics" element={
              <ProtectedRoute>
                <SessionAnalyticsView />
              </ProtectedRoute>
            } />

            {/* Link masking routes */}
            <Route path="/link-masking" element={
              <ProtectedRoute>
                <LinkMaskingDashboard />
              </ProtectedRoute>
            } />

            {/* Masked link proxy - keeps masked URL in address bar */}
            <Route path="/go/:shortId" element={<MaskedLinkViewer />} />

            {/* Widget routes */}
            <Route path="/widget-test" element={<WidgetTestPage />} />

            {/* Error routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <NotificationBanner />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
