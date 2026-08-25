/**
 * Admin dashboard with user management
 */
import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import Header from '../components/Header';
import SendNotificationModal from '../components/SendNotificationModal';
import PassFailAdmin from '../components/PassFailAdmin';
import LinkMasking from '../components/LinkMasking';
import TrackingTab from '../components/admin/TrackingTab';
import ContactSubmissionsTab from '../components/admin/ContactSubmissionsTab';
import DeletionRequestsTab from '../components/admin/DeletionRequestsTab';
import ReferralTab from '../components/admin/ReferralTab';
import EarningsConfigTab from '../components/admin/EarningsConfigTab';
import SurveyReportTab from '../components/admin/SurveyReportTab';
import SurveyFlowTrackingTab from '../components/admin/SurveyFlowTrackingTab';
import FunnelTrackingTab from '../components/admin/FunnelTrackingTab';
import SurveyClickTrackingTab from '../components/admin/SurveyClickTrackingTab';
import LocationControlTab from '../components/admin/LocationControlTab';
import PlanFeaturesTab from '../components/admin/PlanFeaturesTab';
import ResubmitPolicyTab from '../components/admin/ResubmitPolicyTab';
import {
  Bell, Filter, Save, Edit2, X, Check, Eye, EyeOff, Play, RotateCcw, AlertCircle,
  Users, LayoutDashboard, FileText, BarChart2, SlidersHorizontal, CheckSquare,
  Gift, DollarSign, Radio, Mail, Trash2, MapPin, Settings2, ChevronLeft,
  ChevronRight, Shield, RefreshCw, Layers, GitBranch, MousePointerClick, Send, Search
} from 'lucide-react';
import PublishToMoustacheModal from '../components/PublishToMoustacheModal';
import BulkPublishToMoustacheModal from '../components/BulkPublishToMoustacheModal';
import MoustacheLeadsTab from '../components/admin/MoustacheLeadsTab';
import { getApiBaseUrl } from '../utils/deploymentFix';

interface User {
  _id?: string;
  uid?: string;
  email: string;
  name: string;
  photo_url?: string;
  role: 'basic' | 'premium' | 'enterprise' | 'admin';
  status?: 'approved' | 'disapproved' | 'locked' | 'pending_confirmation';
  /** ISO string – when the account was created */
  createdAt?: string;
  /** ISO string – last login time */
  lastLogin?: string;
  /** OAuth provider: 'google', 'microsoft', 'email', etc. */
  authProvider?: string;
  /** Numeric user ID */
  simpleUserId?: number | string;
  /** Referral source code, if any */
  pending_ref_code?: string;
  /** Location from most recent login event */
  last_login_location?: { city?: string; region?: string; country?: string; ip_address?: string };
}

interface Survey {
  _id: string;
  short_id: string;
  title: string;
  status: string;
  created_at: string;
  ownerUserId: string;
  creator_email?: string;
  creator_name?: string;
  total_sessions: number;
  total_responses: number;
  unique_ips: number;
  creator_info?: {
    _id: string;
    uid: string;
    email: string;
    name: string;
    role: 'basic' | 'premium' | 'enterprise' | 'admin';
    status: 'approved' | 'disapproved' | 'locked';
    createdAt: string;
    last_login?: string;
    simpleUserId?: string;
  };
  latest_session_info?: {
    session_id: string;
    ip_address: string;
    user_agent: string;
    click_id: string;
    session_started: string;
    survey_completed?: string;
    evaluation_status: string;
  };
}

interface Filter {
  _id: string;
  name: string;
  description: string;
  category: string;
  logic: any;
  rules: string;
  isEnabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface FilterFormData {
  name: string;
  description: string;
  category: string;
  logic: string;
  rules: string;
  isEnabled: boolean;
  priority: number;
}

const AdminDashboard: React.FC = () => {
  // ── baseUrl declared first so all functions below can use it ──────────────
  const baseUrl = getApiBaseUrl();

  const [users, setUsers] = useState<User[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  // ── Surveys tab — server-side pagination ──────────────────────────────────
  const [surveyPage, setSurveyPage] = useState(1);
  const [surveyPerPage] = useState(20);
  const [surveyTotal, setsurveyTotal] = useState(0);
  const [surveyTotalPages, setSurveyTotalPages] = useState(1);
  const [surveySearch, setSurveySearch] = useState('');
  const [surveySearchInput, setSurveySearchInput] = useState('');
  const [surveySourceType, setSurveySourceType] = useState<'surveys'|'funnels'|'all'>('surveys');
  const [surveysLoading, setSurveysLoading] = useState(false);
  // ── Moustache publish modal ───────────────────────────────────────────────
  const [moustacheModal, setMoustacheModal] = useState<{
    surveyShortId: string;
    surveyTitle: string;
    existingMoustacheId?: string | null;
    existingQuestions?: any[];
    sourceType?: 'survey' | 'funnel';
  } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'surveys' | 'filters' | 'pass-fail' | 'link-masking' | 'tracking' | 'contacts' | 'deletions' | 'referrals' | 'earnings-config' | 'survey-report' | 'survey-flow-tracking' | 'funnel-tracking' | 'location-control' | 'survey-settings' | 'back-exits' | 'plan-features' | 'resubmit-policy' | 'survey-click-tracking' | 'moustache-leads'>('users');
  const [showNotifModal, setShowNotifModal] = useState(false);
  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Platform config state (for Survey Settings tab)
  const [platformConfig, setPlatformConfig] = useState<{ back_button_enabled: boolean } | null>(null);
  const [platformConfigSaving, setPlatformConfigSaving] = useState(false);
  const [platformConfigMsg, setPlatformConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Survey Settings sub-tab
  const [settingsSubTab, setSettingsSubTab] = useState<'global' | 'per-survey' | 'per-user'>('global');
  // Per-survey back button overrides (surveyId -> enabled | null = use global)
  const [surveyBackOverrides, setSurveyBackOverrides] = useState<Record<string, boolean | null>>({});
  const [surveyBackSaving, setSurveyBackSaving] = useState<string | null>(null);
  // Per-user back button overrides (userId -> enabled | null = use global)
  const [userBackOverrides, setUserBackOverrides] = useState<Record<string, boolean | null>>({});
  const [userBackSaving, setUserBackSaving] = useState<string | null>(null);
  // Surveys/users for settings sub-tabs
  const [settingsSurveys, setSettingsSurveys] = useState<any[]>([]);
  const [settingsUsers, setSettingsUsers] = useState<any[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadPlatformConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/platform-config`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlatformConfig(data.config);
      }
    } catch { /* silent */ }
  };

  const savePlatformConfig = async (updates: Partial<{ back_button_enabled: boolean }>) => {
    setPlatformConfigSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/platform-config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setPlatformConfig(data.config);
        setPlatformConfigMsg({ type: 'success', text: 'Settings saved!' });
      } else {
        setPlatformConfigMsg({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch {
      setPlatformConfigMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setPlatformConfigSaving(false);
      setTimeout(() => setPlatformConfigMsg(null), 3000);
    }
  };

  const loadSettingsData = async (subTab: 'global' | 'per-survey' | 'per-user') => {
    const token = localStorage.getItem('auth_token');
    if (subTab === 'per-survey' && settingsSurveys.length === 0) {
      setSettingsLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/admin/surveys-with-config`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.surveys || [];
          setSettingsSurveys(list);
          const overrides: Record<string, boolean | null> = {};
          list.forEach((s: any) => {
            const id = s.short_id || s._id;
            overrides[id] = typeof s.back_button_enabled === 'boolean' ? s.back_button_enabled : null;
          });
          setSurveyBackOverrides(overrides);
        }
      } finally {
        setSettingsLoading(false);
      }
    }
    if (subTab === 'per-user' && settingsUsers.length === 0) {
      setSettingsLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.users || [];
          setSettingsUsers(list);
          const overrides: Record<string, boolean | null> = {};
          list.forEach((u: any) => {
            const id = u._id || u.uid;
            overrides[id] = typeof u.back_button_enabled === 'boolean' ? u.back_button_enabled : null;
          });
          setUserBackOverrides(overrides);
        }
      } finally {
        setSettingsLoading(false);
      }
    }
  };

  const saveSurveyBackButton = async (surveyId: string, enabled: boolean | null) => {
    setSurveyBackSaving(surveyId);
    try {
      const token = localStorage.getItem('auth_token');
      if (enabled === null) {
        // Remove override — not supported by backend directly, use a sentinel
        // We'll store null as removing the field by setting a special value
        await fetch(`${baseUrl}/api/admin/surveys/${surveyId}/back-button`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ back_button_enabled: null, use_global: true }),
        });
      } else {
        await fetch(`${baseUrl}/api/admin/surveys/${surveyId}/back-button`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ back_button_enabled: enabled }),
        });
      }
      setSurveyBackOverrides(prev => ({ ...prev, [surveyId]: enabled }));
    } finally {
      setSurveyBackSaving(null);
    }
  };

  const saveUserBackButton = async (userId: string, enabled: boolean | null) => {
    setUserBackSaving(userId);
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${baseUrl}/api/admin/users/${userId}/back-button`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(enabled === null
          ? { back_button_enabled: true, use_global: true }
          : { back_button_enabled: enabled }
        ),
      });
      setUserBackOverrides(prev => ({ ...prev, [userId]: enabled }));
    } finally {
      setUserBackSaving(null);
    }
  };
  
  // Filter management states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Filter>>({});
  const [showJsonEditor, setShowJsonEditor] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterSuccess, setFilterSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Back-exits tab state
  const [backExits, setBackExits] = useState<Array<{
    _id: string; email: string; survey_id: string;
    submitted_at: string; ip?: string;
  }>>([]);
  const [backExitsLoading, setBackExitsLoading] = useState(false);

  const loadBackExits = async () => {
    setBackExitsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/back-exits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBackExits(data.exits || []);
      }
    } finally {
      setBackExitsLoading(false);
    }
  };

  // User functions
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching users with token:', token ? 'Token present' : 'No token');
      
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fetch users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data:', data);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch users:', response.status, errorData);
        alert(`Failed to fetch users: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Survey functions
  const fetchAllSurveys = async (page = 1, search = '', sourceType: 'surveys'|'funnels'|'all' = 'surveys') => {
    try {
      setSurveysLoading(true);
      setSelectedSurveyIds([]); // clear selections on every load
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(surveyPerPage),
        ...(search ? { search } : {}),
        source_type: sourceType,
      });
      const response = await fetch(`${baseUrl}/api/admin/surveys/comprehensive/paginated?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
        setsurveyTotal(data.total || 0);
        setSurveyTotalPages(data.total_pages || 1);
        setSurveyPage(page);
      } else {
        const errorData = await response.json();
        alert(`Failed to fetch surveys: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
    } finally {
      setSurveysLoading(false);
    }
  };

  // Filter functions
  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/admin/suggestion-filters`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilters(data.filters || []);
        setFilterError(null);
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to fetch filters: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('fetchFilters network error:', error);
      setFilterError('Failed to load filters. Please refresh to try again.');
    }
  };

  const initializeFilters = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/admin/suggestion-filters/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilterSuccess(data.message);
        await fetchFilters(); // Refresh the filters list
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to initialize filters: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('initializeFilters network error:', error);
      setFilterError('Failed. Please try again.');
    }
  };

  const handleEdit = (filter: Filter) => {
    setEditingId(filter._id);
    setEditForm({
      name: filter.name,
      description: filter.description,
      category: filter.category,
      logic: typeof filter.logic === 'string' ? filter.logic : JSON.stringify(filter.logic, null, 2),
      rules: typeof filter.rules === 'string' ? filter.rules : JSON.stringify(filter.rules),
      isEnabled: filter.isEnabled,
      priority: filter.priority
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setShowJsonEditor(null);
  };

  const handleSave = async (filterId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Parse logic if it's a string
      let parsedLogic = editForm.logic;
      if (typeof editForm.logic === 'string') {
        try {
          parsedLogic = JSON.parse(editForm.logic);
        } catch (e) {
          setFilterError('Invalid JSON in logic configuration');
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch(`${baseUrl}/admin/suggestion-filters/${filterId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          category: editForm.category,
          logic: parsedLogic,
          rules: editForm.rules,
          isEnabled: editForm.isEnabled,
          priority: editForm.priority
        })
      });

      if (response.ok) {
        setFilterSuccess('Filter updated successfully');
        setEditingId(null);
        setEditForm({});
        setShowJsonEditor(null);
        await fetchFilters();
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to update filter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('handleSave network error:', error);
      setFilterError('Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (filterId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/admin/suggestion-filters/${filterId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilterSuccess(data.message);
        await fetchFilters();
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to toggle filter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('handleToggle network error:', error);
      setFilterError('Failed. Please try again.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Check current user's token and role
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Decode JWT token to check role (basic decode, not verification)
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Current user token payload:', payload);
            console.log('User role:', payload.role);
            console.log('User features:', payload.features);
            
            if (payload.role !== 'admin') {
              alert(`Warning: You are logged in as '${payload.role}', but admin access is required. Please contact an administrator to upgrade your role.`);
            }
          }
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      
      if (activeTab === 'users') {
        await fetchUsers();
      } else if (activeTab === 'surveys') {
        await fetchAllSurveys(1, surveySearch, surveySourceType);
      } else if (activeTab === 'filters') {
        await fetchFilters();
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  const updateUserRole = async (userId: string, newRole: 'basic' | 'premium' | 'enterprise' | 'admin') => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Updating role for user:', userId, 'to:', newRole);
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ role: newRole }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok) {
        console.log('Role updated successfully:', result.message);
        setUsers(users.map(user => 
          (user._id || user.uid) === userId ? { ...user, role: newRole } : user
        ));
        
        // Trigger permission refresh for affected user
        const updatedUser = users.find(u => (u._id || u.uid) === userId);
        if (updatedUser) {
          // If global refresh function is available, call it
          if ((window as any).refreshUserPermissions) {
            setTimeout(() => {
              (window as any).refreshUserPermissions();
            }, 1000);
          }
          
          alert(`Success: ${result.message}\n\nPermissions will be refreshed automatically. User should see new features within 30 seconds.`);
        }
      } else {
        console.error('Failed to update role:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed. Please try again.');
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'approved' | 'disapproved' | 'locked') => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Updating status for user:', userId, 'to:', newStatus);
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log('Status response status:', response.status);
      const result = await response.json();
      console.log('Status response data:', result);

      if (response.ok) {
        console.log('Status updated successfully:', result.message);
        setUsers(users.map(user => 
          (user._id || user.uid) === userId ? { ...user, status: newStatus } : user
        ));
        alert(`Success: ${result.message}`);
      } else {
        console.error('Failed to update status:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Failed. Please try again.');
    }
  };

  const categories = ['all', 'Business', 'Demographic', 'Financial', 'Professional', 'Satisfaction', 'Location', 'Behavioral', 'Quality', 'Technical', 'Temporal'];
  const filteredFilters = selectedCategory === 'all' 
    ? filters 
    : filters.filter(f => f.category === selectedCategory);

  type NavItem = { id: typeof activeTab; icon: React.ReactNode; label: string };
  type NavGroup = { label: string; items: NavItem[] };
  const NAV_GROUPS: NavGroup[] = [
    { label: 'People',     items: [{ id: 'users', icon: <Users size={14} />, label: 'Users' }] },
    { label: 'Content',    items: [
      { id: 'surveys',              icon: <FileText size={14} />,        label: 'All Surveys' },
      { id: 'survey-report',        icon: <BarChart2 size={14} />,       label: 'Survey Report' },
      { id: 'survey-flow-tracking', icon: <GitBranch size={14} />,       label: 'Flow Tracking' },
      { id: 'funnel-tracking',      icon: <Layers size={14} />,          label: 'Funnel Tracking' },
      { id: 'filters',              icon: <SlidersHorizontal size={14}/>, label: 'Filters' },
      { id: 'pass-fail',            icon: <CheckSquare size={14} />,     label: 'Pass / Fail' },
    ]},
    { label: 'Growth',     items: [
      { id: 'referrals',       icon: <Gift size={14} />,            label: 'Referrals' },
      { id: 'earnings-config', icon: <DollarSign size={14} />,      label: 'Earnings' },
    ]},
    { label: 'Engagement', items: [
      { id: 'tracking',               icon: <Radio size={14} />,           label: 'Tracking' },
      { id: 'survey-click-tracking',  icon: <MousePointerClick size={14}/>, label: 'Survey Clicks' },
      { id: 'contacts',               icon: <Mail size={14} />,            label: 'Contacts' },
      { id: 'link-masking',           icon: <Shield size={14} />,          label: 'Link Masking' },
      { id: 'moustache-leads',        icon: <span style={{ fontWeight: 800, fontSize: 13, lineHeight: 1 }}>M</span>, label: 'MoustacheLeads API' },
    ]},
    { label: 'System',     items: [
      { id: 'location-control',icon: <MapPin size={14} />,          label: 'Location' },
      { id: 'deletions',       icon: <Trash2 size={14} />,          label: 'Deletions' },
      { id: 'survey-settings', icon: <Settings2 size={14} />,       label: 'Survey Settings' },
      { id: 'back-exits',      icon: <ChevronLeft size={14} />,     label: 'Back Exits' },
      { id: 'plan-features',   icon: <Layers size={14} />,          label: 'Plan Features' },
      { id: 'resubmit-policy', icon: <RefreshCw size={14} />,       label: 'Resubmit Policy' },
    ]},
  ];
  const activeLabel = NAV_GROUPS.flatMap((g: NavGroup) => g.items).find((i: NavItem) => i.id === activeTab)?.label || '';

  return (
    <ProtectedRoute requireAdmin>
      {/* Paper-cream shell — fixed to viewport height, children scroll independently */}
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F1E8', fontFamily: "'Outfit', -apple-system, sans-serif" }}>
        <div style={{ flexShrink: 0 }}><Header /></div>

        {/* ── Top bar ── */}
        <div style={{ background: '#FDFCFA', borderBottom: '1px solid #EBE8E3', boxShadow: '0 1px 3px rgba(45,37,32,0.06)', flexShrink: 0 }}
          className="px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
              style={{ color: '#9B9189', background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
            <div className="flex items-center gap-2.5">
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #C4785C 0%, #A8624A 100%)', boxShadow: '0 2px 8px rgba(196,120,92,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LayoutDashboard size={14} color="#fff" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#2D2520', lineHeight: 1 }}>Admin Panel</p>
                  <p style={{ fontSize: 10, color: '#9B9189', marginTop: 2 }}>Pepperwahl Control Centre</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: '#6B6158', fontWeight: 500 }}>{users.length} users</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4785C', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: '#6B6158', fontWeight: 500 }}>{surveyTotal} surveys</span>
              </div>
            </div>
            <button
              onClick={() => setShowNotifModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#C4785C', color: '#fff', border: 'none', borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(196,120,92,0.28)', fontFamily: 'inherit' }}
            >
              <Bell size={13} /> Send Notification
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: '1 1 0', overflow: 'hidden' }}>

          {/* ── Sidebar — scrolls independently ── */}
          <aside style={{
            width: sidebarCollapsed ? 52 : 216,
            minWidth: sidebarCollapsed ? 52 : 216,
            transition: 'width 0.2s ease, min-width 0.2s ease',
            background: '#FDFCFA',
            borderRight: '1px solid #EBE8E3',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none' as const,
            flexShrink: 0,
            height: '100%',
          }}
          className="[&::-webkit-scrollbar]:hidden"
          >
            <nav style={{ padding: sidebarCollapsed ? '16px 6px' : '16px 8px' }}>
              {NAV_GROUPS.map(group => (
                <div key={group.label} style={{ marginBottom: 18 }}>
                  {!sidebarCollapsed && (
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4A99A', padding: '0 6px', marginBottom: 4 }}>
                      {group.label}
                    </p>
                  )}
                  {sidebarCollapsed && <div style={{ height: 1, background: '#EBE8E3', margin: '8px 4px 10px' }} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {group.items.map((item: NavItem) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id); if (item.id === 'survey-settings') { loadPlatformConfig(); setSettingsSubTab('global'); } if (item.id === 'back-exits') { loadBackExits(); } }}
                          title={sidebarCollapsed ? item.label : undefined}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: sidebarCollapsed ? '9px 0' : '8px 10px',
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            borderRadius: 9, border: 'none', cursor: 'pointer',
                            transition: 'background 0.12s ease, color 0.12s ease',
                            fontFamily: "'Outfit', sans-serif", fontSize: 12.5,
                            fontWeight: isActive ? 600 : 400,
                            background: isActive ? '#FEF0EC' : 'transparent',
                            color: isActive ? '#C4785C' : '#6B6158',
                            borderLeft: isActive && !sidebarCollapsed ? '2.5px solid #C4785C' : '2.5px solid transparent',
                            width: '100%',
                          }}
                        >
                          <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6, display: 'flex' }}>{item.icon}</span>
                          {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{item.label}</span>}
                          {!sidebarCollapsed && isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4785C', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* ── Main ── */}
          {/* ── Main content — scrolls independently ── */}
          <main style={{ flex: '1 1 0', overflowY: 'auto', overflowX: 'hidden', padding: 22, height: '100%' }}>
            {/* Heading */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2D2520', margin: 0 }}>{activeLabel}</h2>
              <p style={{ fontSize: 11, color: '#9B9189', marginTop: 3 }}>
                {activeTab === 'users' && `${users.length} registered users`}
                {activeTab === 'surveys' && `${surveyTotal} surveys`}
                {activeTab === 'filters' && `${filters.length} filters`}
                {activeTab === 'plan-features' && 'Configure which features are available per plan'}
                {activeTab === 'survey-click-tracking' && 'Track survey link clicks, visit counts and completion status'}
                {!['users','surveys','filters','plan-features','survey-flow-tracking','survey-click-tracking'].includes(activeTab) && 'Manage settings and configuration'}
                {activeTab === 'survey-flow-tracking' && 'Full session flow — questions answered, mid-survey redirects & outcomes'}
                {activeTab === 'moustache-leads' && 'External API integration — requests received from MoustacheLeads and generation status'}
              </p>
            </div>

            {/* Content card */}
            <div style={{ background: '#FDFCFA', borderRadius: 14, border: '1px solid #EBE8E3', boxShadow: '0 1px 6px rgba(45,37,32,0.05)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14 }}>
                  <div className="animate-spin" style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #EBE8E3', borderTopColor: '#C4785C' }} />
                  <p style={{ fontSize: 12, color: '#9B9189', fontWeight: 500 }}>Loading…</p>
                </div>
              ) : (
                <>
                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div style={{ borderRadius: 14, overflow: 'hidden' }}>
                    {users.map((user) => {
                      const userId = user._id || user.uid || '';
                      // Format date
                      const joinedDate = user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : null;
                      const joinedTime = user.createdAt
                        ? new Date(user.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : null;
                      const lastLoginStr = user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : null;
                      // Auth provider label + colour
                      const provider = (user.authProvider || 'email').toLowerCase();
                      const isGoogle = provider === 'google';
                      const isMicrosoft = provider === 'microsoft';
                      const providerLabel = isGoogle ? 'Google' : isMicrosoft ? 'Microsoft' : 'Email';
                      const providerBg = isGoogle ? '#FEF0EB' : isMicrosoft ? '#EFF6FF' : '#F0FDF4';
                      const providerColor = isGoogle ? '#EA4335' : isMicrosoft ? '#2563EB' : '#16A34A';
                      return (
                        <div key={userId} style={{ borderBottom: '1px solid #F5F1E8', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FEF9F7'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                          {/* Avatar + basic info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '0 0 auto', maxWidth: 320 }}>
                            {user.photo_url ? (
                              <img style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #EBE8E3', flexShrink: 0 }} src={user.photo_url} alt={user.name} />
                            ) : (
                              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #D4917A, #C4785C)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(196,120,92,0.25)', flexShrink: 0 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user.name?.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#2D2520', margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {user.name}
                                {user.simpleUserId && (
                                  <span style={{ fontSize: 9, color: '#C4A99A', fontWeight: 500, background: '#F5F1E8', padding: '1px 5px', borderRadius: 4 }}>#{user.simpleUserId}</span>
                                )}
                              </p>
                              <p style={{ fontSize: 11, color: '#9B9189', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                              {/* Joined + provider + location row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                {joinedDate && (
                                  <span style={{ fontSize: 10, color: '#9B9189', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><rect x="1" y="3" width="14" height="12" rx="2" stroke="#C4A99A" strokeWidth="1.5"/><path d="M5 1v4M11 1v4M1 7h14" stroke="#C4A99A" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                    {joinedDate}{joinedTime && <>, {joinedTime}</>}
                                  </span>
                                )}
                                {!joinedDate && <span style={{ fontSize: 10, color: '#C4A99A' }}>No join date</span>}
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: providerBg, color: providerColor }}>
                                  {isGoogle && '🔵 '}{isMicrosoft && '🟦 '}{!isGoogle && !isMicrosoft && '📧 '}{providerLabel}
                                </span>
                                {lastLoginStr && (
                                  <span style={{ fontSize: 10, color: '#C4A99A' }}>Last login: {lastLoginStr}</span>
                                )}
                                {/* Location from last login */}
                                {(() => {
                                  const loc = user.last_login_location;
                                  if (!loc) return null;
                                  const parts = [loc.city, loc.country].filter(Boolean);
                                  if (parts.length === 0) return null;
                                  return (
                                    <span style={{ fontSize: 10, color: '#6B9E8A', display: 'flex', alignItems: 'center', gap: 3, background: '#F0FAF5', padding: '1px 7px', borderRadius: 10 }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#6B9E8A"/></svg>
                                      {parts.join(', ')}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          {/* Role + Status controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: user.role === 'admin' ? '#FEF0EC' : user.role === 'enterprise' ? '#EEF2FF' : user.role === 'premium' ? '#ECFDF5' : '#F5F1E8', color: user.role === 'admin' ? '#C4785C' : user.role === 'enterprise' ? '#4F46E5' : user.role === 'premium' ? '#059669' : '#6B6158' }}>
                                {user.role}
                              </span>
                              <select value={user.role} onChange={(e) => updateUserRole(userId, e.target.value as 'basic' | 'premium' | 'enterprise' | 'admin')} style={{ fontSize: 11, border: '1px solid #EBE8E3', borderRadius: 7, padding: '4px 8px', background: '#FDFCFA', color: '#3D3530', cursor: 'pointer', fontFamily: 'inherit' }}>
                                <option value="basic">Basic</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                                background: (user.status || 'approved') === 'approved' ? '#ECFDF5' : (user.status || 'approved') === 'disapproved' ? '#FEF2F2' : (user.status || 'approved') === 'pending_confirmation' ? '#FFF7ED' : '#FFFBEB',
                                color: (user.status || 'approved') === 'approved' ? '#059669' : (user.status || 'approved') === 'disapproved' ? '#DC2626' : (user.status || 'approved') === 'pending_confirmation' ? '#EA580C' : '#D97706' }}>
                                {user.status === 'pending_confirmation' ? 'pending' : (user.status || 'approved')}
                              </span>
                              <select value={user.status || 'approved'} onChange={(e) => updateUserStatus(userId, e.target.value as 'approved' | 'disapproved' | 'locked')} style={{ fontSize: 11, border: '1px solid #EBE8E3', borderRadius: 7, padding: '4px 8px', background: '#FDFCFA', color: '#3D3530', cursor: 'pointer', fontFamily: 'inherit' }}>
                                <option value="approved">Approved</option>
                                <option value="disapproved">Disapproved</option>
                                <option value="locked">Locked</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {users.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#9B9189', fontSize: 13 }}>No users found</div>}
                  </div>
                )}

                {/* Surveys Tab */}
                {activeTab === 'surveys' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* ── Toolbar: search + bulk + refresh ── */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* Select-all checkbox */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={surveys.length > 0 && surveys.every(s => selectedSurveyIds.includes(s.short_id))}
                          onChange={e => {
                            e.stopPropagation();
                            if (e.target.checked) setSelectedSurveyIds(surveys.map(s => s.short_id));
                            else setSelectedSurveyIds([]);
                          }}
                          style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#C4785C", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 11, color: "#6B6158", fontWeight: 600, userSelect: "none" }}>All</span>
                      </div>


                      {/* Source type toggle */}
                      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#F5F1E8", borderRadius: 9, padding: 3, flexShrink: 0 }}>
                        {([["surveys","Surveys"],["funnels","Funnels"],["all","All"]] as const).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => { setSurveySourceType(val); fetchAllSurveys(1, surveySearch, val); }}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7, border: "none",
                              background: surveySourceType === val ? "#FDFCFA" : "transparent",
                              color: surveySourceType === val ? "#C4785C" : "#9B9189",
                              cursor: "pointer", fontFamily: "inherit",
                              boxShadow: surveySourceType === val ? "0 1px 3px rgba(45,37,32,0.1)" : "none",
                            }}
                          >{label}</button>
                        ))}
                      </div>

                      {/* Bulk publish button — visible when ≥1 selected */}
                      {selectedSurveyIds.length > 0 && (
                        <button
                          onClick={() => setShowBulkModal(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1A1A2E', color: '#F5C842', border: 'none', borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <Send size={12} /> Bulk Publish ({selectedSurveyIds.length})
                        </button>
                      )}

                      {/* Search */}
                      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 140, maxWidth: 320 }}>
                        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9B9189', pointerEvents: 'none' }} />
                        <input
                          style={{ width: '100%', border: '1px solid #EBE8E3', borderRadius: 9, padding: '7px 12px 7px 30px', fontSize: 12, color: '#2D2520', background: '#F5F1E8', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }}
                          placeholder="Search surveys…"
                          value={surveySearchInput}
                          onChange={e => setSurveySearchInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { setSurveySearch(surveySearchInput); fetchAllSurveys(1, surveySearchInput, surveySourceType); }
                          }}
                        />
                      </div>
                      <button
                        onClick={() => { setSurveySearch(surveySearchInput); fetchAllSurveys(1, surveySearchInput, surveySourceType); }}
                        style={{ background: '#C4785C', color: '#fff', border: 'none', borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >Search</button>
                      {surveySearch && (
                        <button
                          onClick={() => { setSurveySearch(''); setSurveySearchInput(''); fetchAllSurveys(1, '', surveySourceType); }}
                          style={{ background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 9, padding: '7px 12px', fontSize: 12, color: '#6B6158', cursor: 'pointer', fontFamily: 'inherit' }}
                        >Clear</button>
                      )}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#9B9189' }}>{surveyTotal} total · page {surveyPage} of {surveyTotalPages}</span>
                        <button onClick={() => fetchAllSurveys(surveyPage, surveySearch, surveySourceType)} title="Refresh" style={{ background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <RefreshCw size={12} color="#9B9189" />
                        </button>
                      </div>
                    </div>

                    {/* ── Survey rows ── */}
                    {surveysLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
                        <div className="animate-spin" style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid #EBE8E3', borderTopColor: '#C4785C' }} />
                        <p style={{ fontSize: 12, color: '#9B9189' }}>Loading surveys…</p>
                      </div>
                    ) : surveys.length === 0 ? (
                      <div style={{ padding: '60px 0', textAlign: 'center', color: '#9B9189', fontSize: 13 }}>
                        {surveySearch ? `No surveys matching "${surveySearch}"` : 'No surveys found'}
                      </div>
                    ) : (
                      surveys.map((survey) => {
                        const hasMoustache = !!survey.moustache_survey_id;
                        return (
                          <div
                            key={survey._id || survey.short_id}
                            style={{ borderBottom: '1px solid #F5F1E8', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FEF9F7'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                          >
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedSurveyIds.includes(survey.short_id)}
                              onChange={() => {
                                const id = survey.short_id;
                                setSelectedSurveyIds(prev =>
                                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                );
                              }}
                              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#C4785C', flexShrink: 0 }}
                            />
                            {/* Survey info */}
                            <div style={{ flex: '1 1 0', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#2D2520' }}>{survey.title}</span>
                                {/* Survey status badge */}
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                                  background: survey.status === 'published' ? '#ECFDF5' : survey.status === 'draft' ? '#F5F1E8' : '#FEF2F2',
                                  color: survey.status === 'published' ? '#059669' : survey.status === 'draft' ? '#6B6158' : '#DC2626',
                                }}>{survey.status}</span>
                                {/* Moustache badge */}
                                {hasMoustache && (
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#1A1A2E', color: '#F5C842', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontWeight: 800 }}>M</span> on Moustache
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: '#9B9189' }}>ID: {survey.short_id}</span>
                                {survey.creator_info && (
                                  <span style={{ fontSize: 11, color: '#9B9189' }}>
                                    {survey.creator_info.name} · {survey.creator_info.email}
                                  </span>
                                )}
                                <span style={{ fontSize: 11, color: '#C4A99A' }}>
                                  {survey.total_sessions || 0} sessions · {survey.total_responses || 0} responses
                                </span>
                                <span style={{ fontSize: 11, color: '#C4A99A' }}>
                                  {survey.created_at ? new Date(survey.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                              <a
                                href={`/survey/${survey.short_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, fontWeight: 600, color: '#6B6158', border: '1px solid #EBE8E3', borderRadius: 7, padding: '5px 10px', background: '#F5F1E8', textDecoration: 'none' }}
                              >View</a>
                              <a
                                href={`/edit/${survey.short_id}`}
                                style={{ fontSize: 11, fontWeight: 600, color: '#6B6158', border: '1px solid #EBE8E3', borderRadius: 7, padding: '5px 10px', background: '#F5F1E8', textDecoration: 'none' }}
                              >Edit</a>
                              {/* Publish to Moustache button */}
                              <button
                                onClick={() => setMoustacheModal({
                                  surveyShortId: survey.short_id,
                                  surveyTitle: survey.title,
                                  existingMoustacheId: survey.moustache_survey_id || null,
                                  existingQuestions: survey.moustache_questions || [],
                                  sourceType: (survey.source_type || 'survey') as 'survey' | 'funnel',
                                })}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  fontSize: 11, fontWeight: 700,
                                  border: hasMoustache ? '1px solid #A7F3D0' : '1px solid #1A1A2E',
                                  borderRadius: 7, padding: '5px 10px',
                                  background: hasMoustache ? '#ECFDF5' : '#1A1A2E',
                                  color: hasMoustache ? '#059669' : '#F5C842',
                                  cursor: 'pointer', fontFamily: 'inherit',
                                }}
                              >
                                <Send size={11} />
                                {hasMoustache ? 'Update' : 'Publish to Moustache'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* ── Pagination controls ── */}
                    {!surveysLoading && surveyTotalPages > 1 && (
                      <div style={{ padding: '12px 18px', borderTop: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 11, color: '#9B9189' }}>
                          Showing {((surveyPage - 1) * surveyPerPage) + 1}–{Math.min(surveyPage * surveyPerPage, surveyTotal)} of {surveyTotal}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <button
                            disabled={surveyPage <= 1}
                            onClick={() => fetchAllSurveys(surveyPage - 1, surveySearch, surveySourceType)}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EBE8E3', background: surveyPage <= 1 ? '#F5F1E8' : '#FDFCFA', cursor: surveyPage <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: surveyPage <= 1 ? 0.4 : 1 }}
                          ><ChevronLeft size={13} color="#6B6158" /></button>

                          {/* Page number pills */}
                          {Array.from({ length: Math.min(7, surveyTotalPages) }, (_, i) => {
                            let pg: number;
                            if (surveyTotalPages <= 7) pg = i + 1;
                            else if (surveyPage <= 4) pg = i + 1;
                            else if (surveyPage >= surveyTotalPages - 3) pg = surveyTotalPages - 6 + i;
                            else pg = surveyPage - 3 + i;
                            return (
                              <button
                                key={pg}
                                onClick={() => fetchAllSurveys(pg, surveySearch, surveySourceType)}
                                style={{
                                  width: 30, height: 30, borderRadius: 7, border: '1px solid #EBE8E3',
                                  background: surveyPage === pg ? '#C4785C' : '#FDFCFA',
                                  color: surveyPage === pg ? '#fff' : '#6B6158',
                                  cursor: 'pointer', fontSize: 12, fontWeight: surveyPage === pg ? 700 : 400,
                                  fontFamily: 'inherit',
                                }}
                              >{pg}</button>
                            );
                          })}

                          <button
                            disabled={surveyPage >= surveyTotalPages}
                            onClick={() => fetchAllSurveys(surveyPage + 1, surveySearch, surveySourceType)}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EBE8E3', background: surveyPage >= surveyTotalPages ? '#F5F1E8' : '#FDFCFA', cursor: surveyPage >= surveyTotalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: surveyPage >= surveyTotalPages ? 0.4 : 1 }}
                          ><ChevronRight size={13} color="#6B6158" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Moustache publish modal */}
                {moustacheModal && (
                  <PublishToMoustacheModal
                    surveyShortId={moustacheModal.surveyShortId}
                    surveyTitle={moustacheModal.surveyTitle}
                    existingMoustacheId={moustacheModal.existingMoustacheId}
                    existingQuestions={moustacheModal.existingQuestions}
                    onClose={() => setMoustacheModal(null)}
                    onPublished={(moustacheId, status) => {
                      // Update the survey row in state without a full refetch
                      setSurveys(prev => prev.map(s =>
                        s.short_id === moustacheModal.surveyShortId
                          ? { ...s, moustache_survey_id: moustacheId, moustache_status: status }
                          : s
                      ));
                    }}
                  />
                )}

                {/* Bulk publish modal */}
                {showBulkModal && (
                  <BulkPublishToMoustacheModal
                    surveys={surveys.filter(s => selectedSurveyIds.includes(s.short_id)).map(s => ({ short_id: s.short_id, title: s.title }))}
                    onClose={() => setShowBulkModal(false)}
                    onDone={results => {
                      // Update rows that were successfully published
                      setSurveys(prev => prev.map(s => {
                        const r = results.find(x => x.survey_id === s.short_id);
                        if (r?.success) return { ...s, moustache_survey_id: r.moustache_survey_id, moustache_status: r.status };
                        return s;
                      }));
                      setSelectedSurveyIds([]);
                    }}
                  />
                )}

                {/* Filters Tab */}
                {activeTab === 'filters' && (
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                            <Filter className="h-5 w-5 text-blue-500" />
                            Suggestion Filters
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Manage all system filters that process and validate survey responses
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={fetchFilters}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Refresh
                          </button>
                          <button
                            onClick={initializeFilters}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Initialize Filters
                          </button>
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="mt-4 flex space-x-2">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                              selectedCategory === cat
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Status Messages */}
                      {filterError && (
                        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span>{filterError}</span>
                          <button onClick={() => setFilterError(null)} className="ml-auto">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {filterSuccess && (
                        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative flex items-center gap-2">
                          <Check className="h-5 w-5" />
                          <span>{filterSuccess}</span>
                        </div>
                      )}
                    </div>

                    {/* Filters List */}
                    <ul className="divide-y divide-gray-200">
                      {filteredFilters.map((filter) => (
                        <li key={filter._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                          {editingId === filter._id ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Name</label>
                                  <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Category</label>
                                  <select
                                    value={editForm.category || 'Business'}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  >
                                    <option value="Business">Business</option>
                                    <option value="Demographic">Demographic</option>
                                    <option value="Financial">Financial</option>
                                    <option value="Professional">Professional</option>
                                    <option value="Satisfaction">Satisfaction</option>
                                    <option value="Location">Location</option>
                                    <option value="Behavioral">Behavioral</option>
                                    <option value="Quality">Quality</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Temporal">Temporal</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  rows={2}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Rules / Logic Description</label>
                                <textarea
                                  value={editForm.rules || ''}
                                  onChange={(e) => setEditForm({ ...editForm, rules: e.target.value })}
                                  rows={2}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <label className="block text-sm font-medium text-gray-700">Logic Configuration</label>
                                  <button
                                    onClick={() => setShowJsonEditor(showJsonEditor === filter._id ? null : filter._id)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    {showJsonEditor === filter._id ? 'Hide JSON' : 'Edit as JSON'}
                                  </button>
                                </div>
                                {showJsonEditor === filter._id ? (
                                  <textarea
                                    value={typeof editForm.logic === 'string' ? editForm.logic : JSON.stringify(editForm.logic, null, 2)}
                                    onChange={(e) => setEditForm({ ...editForm, logic: e.target.value })}
                                    rows={6}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 font-mono text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                ) : (
                                  <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-40 border border-gray-200">
                                    {JSON.stringify(
                                      typeof editForm.logic === 'string' ? JSON.parse(editForm.logic || '{}') : editForm.logic,
                                      null, 2
                                    )}
                                  </pre>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={editForm.isEnabled || false}
                                      onChange={(e) => setEditForm({ ...editForm, isEnabled: e.target.checked })}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 text-sm text-gray-700">Enabled</label>
                                  </div>
                                  <div className="flex items-center">
                                    <label className="text-sm text-gray-700 mr-2">Priority:</label>
                                    <input
                                      type="number"
                                      value={editForm.priority || 0}
                                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                                      className="w-20 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleSave(filter._id)}
                                    disabled={loading}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-lg font-medium text-gray-900">{filter.name}</h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    filter.category === 'Business' ? 'bg-blue-100 text-blue-800' :
                                    filter.category === 'Demographic' ? 'bg-green-100 text-green-800' :
                                    filter.category === 'Financial' ? 'bg-yellow-100 text-yellow-800' :
                                    filter.category === 'Professional' ? 'bg-purple-100 text-purple-800' :
                                    filter.category === 'Satisfaction' ? 'bg-pink-100 text-pink-800' :
                                    filter.category === 'Location' ? 'bg-indigo-100 text-indigo-800' :
                                    filter.category === 'Behavioral' ? 'bg-red-100 text-red-800' :
                                    filter.category === 'Quality' ? 'bg-orange-100 text-orange-800' :
                                    filter.category === 'Technical' ? 'bg-gray-100 text-gray-800' :
                                    filter.category === 'Temporal' ? 'bg-teal-100 text-teal-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {filter.category}
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    filter.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {filter.isEnabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                
                                <p className="mt-1 text-sm text-gray-600">{filter.description}</p>
                                
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rules:</p>
                                  <p className="text-sm text-gray-900">{typeof filter.rules === 'string' ? filter.rules : JSON.stringify(filter.rules)}</p>
                                </div>

                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Logic:</p>
                                  <details className="mt-1">
                                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                      View configuration
                                    </summary>
                                    <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-60 border border-gray-200">
                                      {JSON.stringify(filter.logic, null, 2)}
                                    </pre>
                                  </details>
                                </div>

                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                  <span>Priority: {filter.priority}</span>
                                  <span>Created: {new Date(filter.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                </div>
                              </div>

                              <div className="ml-4 flex flex-col space-y-2">
                                <button
                                  onClick={() => handleEdit(filter)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggle(filter._id)}
                                  className={`inline-flex items-center px-3 py-1 border text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    filter.isEnabled
                                      ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500'
                                      : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
                                  }`}
                                >
                                  {filter.isEnabled ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-1" />
                                      Disable
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Enable
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    {filteredFilters.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No filters found in this category.
                      </div>
                    )}
                  </div>
                )}

                {/* Pass/Fail Tab */}
                {activeTab === 'pass-fail' && (
                  <PassFailAdmin isDarkMode={false} />
                )}

                {/* Link Masking Tab */}
                {activeTab === 'link-masking' && (
                  <LinkMasking isDarkMode={false} />
                )}

                {/* Tracking Tab */}
                {activeTab === 'tracking' && (
                  <TrackingTab />
                )}

                {/* Contact Submissions Tab */}
                {activeTab === 'contacts' && (
                  <ContactSubmissionsTab />
                )}

                {/* Deletion Requests Tab */}
                {activeTab === 'deletions' && (
                  <DeletionRequestsTab />
                )}

                {/* Referrals Tab */}
                {activeTab === 'referrals' && (
                  <ReferralTab />
                )}

                {/* Earnings Config Tab */}
                {activeTab === 'earnings-config' && (
                  <EarningsConfigTab />
                )}

                {/* Survey Combined Report Tab */}
                {activeTab === 'survey-report' && (
                  <SurveyReportTab />
                )}

                {/* Survey Flow Tracking Tab */}
                {activeTab === 'survey-flow-tracking' && (
                  <SurveyFlowTrackingTab />
                )}

                {/* Funnel Tracking Tab */}
                {activeTab === 'funnel-tracking' && (
                  <FunnelTrackingTab />
                )}

                {/* Survey Click Tracking Tab */}
                {activeTab === 'survey-click-tracking' && (
                  <SurveyClickTrackingTab />
                )}

                {/* Location Control Tab */}
                {activeTab === 'location-control' && (
                  <LocationControlTab />
                )}

                {/* Survey Settings Tab */}
                {activeTab === 'survey-settings' && (
                  <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">⚙️ Survey Settings</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Control back-button behaviour globally, per survey, or per user.</p>
                    </div>

                    {/* Sub-tab bar */}
                    <div className="flex border-b border-gray-200 px-6 bg-white">
                      {(['global', 'per-survey', 'per-user'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => { setSettingsSubTab(tab); loadSettingsData(tab); }}
                          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors mr-1 ${
                            settingsSubTab === tab
                              ? 'border-orange-500 text-orange-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab === 'global' ? '🌐 Global' : tab === 'per-survey' ? '📋 Per Survey' : '👤 Per User'}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {/* ── Global sub-tab ── */}
                      {settingsSubTab === 'global' && (
                        <div className="max-w-lg space-y-4">
                          <p className="text-xs text-gray-500">This setting is the default for all surveys. Per-survey or per-user overrides take priority over this.</p>
                          <div className="border border-gray-200 rounded-xl p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">Back Button — Default</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  When disabled, the Back button is hidden from all survey pages and browser-back shows an email capture page.
                                </p>
                              </div>
                              <button
                                onClick={() => { if (!platformConfig) return; savePlatformConfig({ back_button_enabled: !platformConfig.back_button_enabled }); }}
                                disabled={platformConfigSaving || !platformConfig}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${platformConfig?.back_button_enabled ? 'bg-green-500' : 'bg-gray-300'} disabled:opacity-50`}
                              >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${platformConfig?.back_button_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            <div className="mt-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${platformConfig?.back_button_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {platformConfig === null ? 'Loading…' : platformConfig.back_button_enabled ? '✓ Enabled globally' : '✗ Disabled globally'}
                              </span>
                            </div>
                          </div>
                          {platformConfigMsg && (
                            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${platformConfigMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {platformConfigMsg.text}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Per Survey sub-tab ── */}
                      {settingsSubTab === 'per-survey' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-4">Override the back button for individual surveys. "Use Global" means no override — it follows the global setting.</p>
                          {settingsLoading ? (
                            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Survey</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Back Button</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {settingsSurveys.map((s: any) => {
                                    const id = s.short_id || s._id;
                                    const val = surveyBackOverrides[id];
                                    return (
                                      <tr key={id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{s.title || 'Untitled'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{id}</td>
                                        <td className="px-4 py-3 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            {/* 3-way selector: ON / OFF / Global */}
                                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold">
                                              <button
                                                onClick={() => saveSurveyBackButton(id, true)}
                                                disabled={surveyBackSaving === id}
                                                className={`px-3 py-1.5 transition-colors ${val === true ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-green-50'}`}
                                              >ON</button>
                                              <button
                                                onClick={() => saveSurveyBackButton(id, false)}
                                                disabled={surveyBackSaving === id}
                                                className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${val === false ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-red-50'}`}
                                              >OFF</button>
                                              <button
                                                onClick={() => saveSurveyBackButton(id, null)}
                                                disabled={surveyBackSaving === id}
                                                className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${val === null ? 'bg-gray-200 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                              >Global</button>
                                            </div>
                                            {surveyBackSaving === id && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-orange-400 border-t-transparent" />}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {settingsSurveys.length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">No surveys found</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Per User sub-tab ── */}
                      {settingsSubTab === 'per-user' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-4">Override the back button for all surveys belonging to a specific user. "Use Global" removes the override.</p>
                          {settingsLoading ? (
                            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Role</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Back Button</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {settingsUsers.map((u: any) => {
                                    const id = u._id || u.uid;
                                    const val = userBackOverrides[id];
                                    return (
                                      <tr key={id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{u.name || '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'premium' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold">
                                              <button
                                                onClick={() => saveUserBackButton(id, true)}
                                                disabled={userBackSaving === id}
                                                className={`px-3 py-1.5 transition-colors ${val === true ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-green-50'}`}
                                              >ON</button>
                                              <button
                                                onClick={() => saveUserBackButton(id, false)}
                                                disabled={userBackSaving === id}
                                                className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${val === false ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-red-50'}`}
                                              >OFF</button>
                                              <button
                                                onClick={() => saveUserBackButton(id, null)}
                                                disabled={userBackSaving === id}
                                                className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${val === null ? 'bg-gray-200 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                              >Global</button>
                                            </div>
                                            {userBackSaving === id && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-orange-400 border-t-transparent" />}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {settingsUsers.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No users found</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Back Exits Tab */}
                {activeTab === 'back-exits' && (
                  <div>
                    {/* Header row */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5F1E8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#2D2520', margin: 0 }}>Back Exit Captures</p>
                        <p style={{ fontSize: 11, color: '#9B9189', marginTop: 2 }}>Emails collected when respondents tried to go back</p>
                      </div>
                      <button
                        onClick={loadBackExits}
                        disabled={backExitsLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, fontWeight: 600, background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, cursor: 'pointer', color: '#6B6158', fontFamily: 'inherit' }}
                      >
                        <RefreshCw size={12} style={{ animation: backExitsLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                        Refresh
                      </button>
                    </div>

                    {backExitsLoading ? (
                      <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #EBE8E3', borderTopColor: '#C4785C', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 12, color: '#9B9189' }}>Loading…</p>
                      </div>
                    ) : backExits.length === 0 ? (
                      <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <ChevronLeft size={32} color="#EBE8E3" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <p style={{ fontSize: 13, color: '#9B9189' }}>No back-exit emails captured yet</p>
                        <p style={{ fontSize: 11, color: '#C4A99A', marginTop: 4 }}>They appear here when back is disabled and a respondent leaves their email</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #EBE8E3' }}>
                              {['Email', 'Survey ID', 'Time', 'IP Address'].map(h => (
                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {backExits.map((exit, i) => (
                              <tr key={exit._id || i} style={{ borderBottom: '1px solid #F5F1E8' }}
                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FEF9F7'}
                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                              >
                                <td style={{ padding: '12px 16px', color: '#2D2520', fontWeight: 500 }}>{exit.email}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#F5F1E8', padding: '2px 8px', borderRadius: 6, color: '#6B6158' }}>{exit.survey_id}</span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#9B9189' }}>
                                  {exit.submitted_at ? new Date(exit.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#C4A99A', fontFamily: 'monospace', fontSize: 11 }}>{exit.ip || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ padding: '10px 16px', borderTop: '1px solid #F5F1E8', fontSize: 11, color: '#9B9189' }}>
                          {backExits.length} record{backExits.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Plan Features Tab */}
                {activeTab === 'plan-features' && (
                  <PlanFeaturesTab />
                )}

                {/* Resubmit Policy Tab */}
                {activeTab === 'resubmit-policy' && (
                  <ResubmitPolicyTab />
                )}

                {/* MoustacheLeads API Tracking Tab */}
                {activeTab === 'moustache-leads' && (
                  <MoustacheLeadsTab />
                )}

                </>
              )}
            </div>{/* end content card */}
          </main>
        </div>{/* end body */}
      </div>
      {showNotifModal && <SendNotificationModal onClose={() => setShowNotifModal(false)} />}
    </ProtectedRoute>
  );
};

export default AdminDashboard;
