/**
 * JWT Authentication context for the dashboard
 */
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { authService, User, LoginRequest, RegisterRequest } from '../services/authService';

// ── Session duration: 3 hours in milliseconds ────────────────────────────────
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const LOGIN_TIME_KEY = 'auth_login_time';

function isSessionExpired(): boolean {
  const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
  if (!loginTime) return false; // no timestamp = legacy session, don't force-expire
  return Date.now() - parseInt(loginTime, 10) > SESSION_DURATION_MS;
}

function stampLoginTime() {
  localStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
}

function clearSession() {
  localStorage.removeItem('user_data');
  localStorage.removeItem('auth_token');
  localStorage.removeItem(LOGIN_TIME_KEY);
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  confirmEmail: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  hasFeature: (feature: string) => boolean;
  hasPremiumAccess: boolean;
  hasEnterpriseAccess: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const autoLogoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // performLogout defined first, scheduleAutoLogout references it via closure
  const performLogout = () => {
    if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current);
    clearSession();
    setUser(null);
    setAuthenticated(false);
  };

  // Schedule auto-logout at the 3-hour mark from login time
  const scheduleAutoLogout = () => {
    if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current);
    const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
    if (!loginTime) return;
    const elapsed = Date.now() - parseInt(loginTime, 10);
    const remaining = SESSION_DURATION_MS - elapsed;
    if (remaining <= 0) {
      performLogout();
      return;
    }
    autoLogoutTimerRef.current = setTimeout(() => {
      performLogout();
    }, remaining);
  };

  const refreshAuth = async () => {
    try {
      setLoading(true);

      const userData = localStorage.getItem('user_data');
      const token = localStorage.getItem('auth_token');

      // ── Check 3-hour expiry first ──────────────────────────────────────────
      if (userData && token && isSessionExpired()) {
        clearSession();
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      if (userData && token) {
        try {
          const response = await fetch(
            `${window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:5000'
              : 'https://surevy-pepperwahl.onrender.com'}/api/auth/check`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (response.ok) {
            const authData = await response.json();

            if (authData.authenticated && authData.user) {
              setAuthenticated(true);
              setUser(authData.user);
              // Persist updated user data (includes plan_features from server)
              localStorage.setItem('user_data', JSON.stringify(authData.user));
              // Schedule auto-logout if not already stamped (legacy sessions get a fresh stamp)
              if (!localStorage.getItem(LOGIN_TIME_KEY)) stampLoginTime();
              scheduleAutoLogout();
            } else {
              clearSession();
              setAuthenticated(false);
              setUser(null);
            }
          } else {
            clearSession();
            setAuthenticated(false);
            setUser(null);
          }
        } catch (err) {
          console.error('Token verification failed:', err);
          clearSession();
          setAuthenticated(false);
          setUser(null);
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setAuthenticated(false);
      setUser(null);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGIN (unchanged)
  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);

      setUser(response.user);
      setAuthenticated(true);

      localStorage.setItem('user_data', JSON.stringify(response.user));
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      // Stamp login time and start 3-hour auto-logout timer
      stampLoginTime();
      scheduleAutoLogout();

    } catch (error) {
      console.error('Login failed:', error);
      clearSession();
      setAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  // 🚨 FIXED REGISTER (NO AUTO LOGIN)
  const register = async (userData: RegisterRequest) => {
    try {
      await authService.register(userData);

      // ❌ DO NOT LOGIN USER
      setUser(null);
      setAuthenticated(false);

      // Ensure nothing stored
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');

    } catch (error) {
      console.error('Registration failed:', error);

      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      setAuthenticated(false);
      setUser(null);

      throw error;
    }
  };

  const logout = async () => {
    try {
      performLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const confirmEmail = async (token: string) => {
    try {
      const response = await authService.confirmEmail(token);
      
      // User should now login manually
      setUser(null);
      setAuthenticated(false);
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      
      console.log('✅ Email confirmed successfully');
    } catch (error) {
      console.error('Email confirmation failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshAuth();
    // Cleanup auto-logout timer on unmount
    return () => {
      if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current);
    };
  }, []);

  const isAdmin = user?.role === 'admin';

  const hasFeature = (feature: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // If server returned plan_features from admin-configurable config, use those.
    // Only use if non-empty — empty array means the server hasn't sent them yet.
    if (user.plan_features && user.plan_features.length > 0) {
      return user.plan_features.includes(feature);
    }

    // Fallback: hardcoded role-based defaults used until server responds.
    // These use BOTH old keys (create/survey/analytics) and new plan feature keys
    // so the UI works correctly even before plan_features arrive from the server.
    const ENTERPRISE_FEATURES = [
      // old keys
      'create', 'survey', 'analytics', 'sessions', 'postback', 'email',
      'pass_fail', 'test_lab', 'response_logs', 'export_csv',
      // new tab keys
      'tab_analytics', 'tab_sessions', 'tab_postback', 'tab_passfail', 'tab_testlab', 'tab_email',
      // survey actions
      'survey_clone', 'survey_email_invite', 'survey_responses', 'survey_export_csv',
      // editor
      'editor_type_multiple_choice', 'editor_type_short_answer', 'editor_type_yes_no',
      'editor_type_rating', 'editor_type_scale', 'editor_type_dropdown',
      'editor_type_dropdown_multi', 'editor_type_matrix', 'editor_type_list',
      'editor_anim_fadeSlideUp', 'editor_anim_typewriter', 'editor_anim_flipIn',
      'editor_anim_zoomBounce', 'editor_anim_slideFromLeft', 'editor_anim_blurReveal',
      'editor_style_classic', 'editor_style_underline', 'editor_style_card',
      'editor_style_pill', 'editor_style_flat',
      'editor_question_image', 'editor_option_images',
      'editor_branching', 'branching_redirect_chain', 'branching_survey_end',
      'branching_survey_chain', 'branching_multi_layer', 'branching_flow_diagram',
      'editor_ai_generate', 'editor_ai_refine', 'editor_ai_options', 'editor_ai_assistant',
    ];

    const PREMIUM_FEATURES = [
      // old keys
      'create', 'survey', 'analytics', 'sessions', 'postback', 'email',
      'response_logs', 'export_csv',
      // new tab keys
      'tab_analytics', 'tab_sessions', 'tab_postback', 'tab_passfail', 'tab_email',
      // survey actions
      'survey_clone', 'survey_email_invite', 'survey_responses', 'survey_export_csv',
      // editor
      'editor_type_multiple_choice', 'editor_type_short_answer', 'editor_type_yes_no',
      'editor_type_rating', 'editor_type_scale', 'editor_type_dropdown', 'editor_type_list',
      'editor_anim_fadeSlideUp', 'editor_anim_typewriter', 'editor_anim_flipIn',
      'editor_anim_zoomBounce', 'editor_anim_slideFromLeft',
      'editor_style_classic', 'editor_style_underline', 'editor_style_card', 'editor_style_pill',
      'editor_question_image', 'editor_option_images',
      'editor_branching', 'branching_redirect_chain', 'branching_survey_end',
      'branching_flow_diagram',
      'editor_ai_generate', 'editor_ai_refine', 'editor_ai_options', 'editor_ai_assistant',
    ];

    const FREE_FEATURES = [
      // old keys — must keep so existing create/survey/analytics checks still work
      'create', 'survey', 'analytics',
      // new tab keys that free users should always see
      'tab_analytics',
      // basic editor
      'editor_type_multiple_choice', 'editor_type_short_answer', 'editor_type_yes_no',
      'editor_style_classic',
      'editor_anim_fadeSlideUp',
      'survey_responses',
      'editor_ai_generate',
    ];

    if (user.role === 'enterprise') return ENTERPRISE_FEATURES.includes(feature);
    if (user.role === 'premium') return PREMIUM_FEATURES.includes(feature);
    // basic / free
    return FREE_FEATURES.includes(feature);
  };

  const hasPremiumAccess =
    user?.role === 'premium' ||
    user?.role === 'enterprise' ||
    user?.role === 'admin';

  const hasEnterpriseAccess =
    user?.role === 'enterprise' ||
    user?.role === 'admin';

  const value: AuthContextType = {
    user,
    loading,
    authenticated,
    login,
    register,
    confirmEmail,
    logout,
    isAdmin,
    hasFeature,
    hasPremiumAccess,
    hasEnterpriseAccess,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};