import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, X, GripVertical, ChevronDown, ChevronUp,
  Link2, Zap, TestTube2, Check, AlertCircle, Copy, Eye, EyeOff,
  ArrowRight, Settings2, Layers
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';

// ═══════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════

interface RedirectEndpoint {
  id: string;
  name: string;
  url: string;
  status_code: number;
  color: string;
  description: string;
  created_at?: string;
}

interface RedirectRule {
  id: string;
  priority: number;
  name: string;
  condition_type: 'answer_based' | 'criteria_set' | 'evaluation_result' | 'score_based' | 'always';
  question_id: string;
  condition: string;
  expected_value: string;
  redirect_endpoint_id: string;
  fire_s2s: boolean;
  is_active: boolean;
  created_at?: string;
}

interface S2SConfig {
  enabled: boolean;
  partner_name: string;
  endpoint: string;
  api_key: string;
  method: string;
  headers: Record<string, string>;
  body_template: Record<string, any>;
}

interface RedirectRulesConfig {
  survey_id: string;
  redirect_endpoints: RedirectEndpoint[];
  redirect_rules: RedirectRule[];
  default_redirect_endpoint_id: string | null;
  s2s_config: S2SConfig | null;
}

interface Question {
  id: string;
  question: string;
  question_text?: string;
  type: string;
  options?: string[];
}

interface Props {
  surveyId: string;
  questions: Question[];
  isDarkMode: boolean;
  criteriaSets?: { _id: string; name: string; criteria: any[]; logic_type: string }[];
}

// ═══════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════

const CONDITION_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'in_list', label: 'In List (comma sep)' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_or_equal', label: '≥ (Greater or Equal)' },
  { value: 'less_than_or_equal', label: '≤ (Less or Equal)' },
];

const ENDPOINT_COLORS = [
  '#22c55e', '#ef4444', '#eab308', '#6b7280', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
];

const PLACEHOLDERS = [
  '{session_id}', '{survey_id}', '{click_id}', '{user_id}',
  '{email}', '{username}', '{timestamp}', '{score}',
  '{status}', '{redirect_status_code}', '{respondent_id}',
  '{ip_address}', '{sub1}', '{sub2}', '{iso_timestamp}'
];

// ═══════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════

const RedirectRulesBuilder: React.FC<Props> = ({ surveyId, questions, isDarkMode, criteriaSets = [] }) => {
  const baseUrl = getApiBaseUrl();
  
  // State
  const [config, setConfig] = useState<RedirectRulesConfig>({
    survey_id: surveyId,
    redirect_endpoints: [],
    redirect_rules: [],
    default_redirect_endpoint_id: null,
    s2s_config: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // Forms
  const [showEndpointForm, setShowEndpointForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showS2SForm, setShowS2SForm] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<RedirectEndpoint | null>(null);
  const [editingRule, setEditingRule] = useState<RedirectRule | null>(null);
  
  // Endpoint form
  const [epForm, setEpForm] = useState<Partial<RedirectEndpoint>>({
    name: '', url: '', status_code: 1, color: '#22c55e', description: ''
  });
  
  // Rule form
  const [ruleForm, setRuleForm] = useState<Partial<RedirectRule>>({
    name: '', condition_type: 'answer_based', question_id: '',
    condition: 'equals', expected_value: '', redirect_endpoint_id: '',
    fire_s2s: true, is_active: true
  });
  
  // S2S form
  const [s2sForm, setS2SForm] = useState<S2SConfig>({
    enabled: false, partner_name: '', endpoint: '', api_key: '',
    method: 'POST', headers: {}, body_template: { respondentId: '{session_id}', status: '{redirect_status_code}' }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [s2sTestResult, setS2sTestResult] = useState<any>(null);
  const [s2sTesting, setS2sTesting] = useState(false);
  
  // Sections collapse
  const [expandedSections, setExpandedSections] = useState({
    endpoints: true, rules: true, s2s: false, placeholders: false
  });

  // ═══════════════════════════════════════════════════════
  //  DATA FETCHING
  // ═══════════════════════════════════════════════════════
  
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        if (data.s2s_config) {
          setS2SForm(data.s2s_config);
        }
      }
    } catch (error) {
      console.error('Failed to fetch redirect config:', error);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, surveyId]);
  
  useEffect(() => {
    if (surveyId) fetchConfig();
  }, [surveyId, fetchConfig]);

  // ═══════════════════════════════════════════════════════
  //  ENDPOINT CRUD
  // ═══════════════════════════════════════════════════════
  
  const saveEndpoint = async () => {
    if (!epForm.name || !epForm.url) {
      setMessage({ type: 'error', text: 'Name and URL are required' });
      return;
    }
    setSaving(true);
    try {
      const method = editingEndpoint ? 'PUT' : 'POST';
      const url = editingEndpoint
        ? `${baseUrl}/api/redirect-rules/${surveyId}/endpoints/${editingEndpoint.id}`
        : `${baseUrl}/api/redirect-rules/${surveyId}/endpoints`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epForm)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: editingEndpoint ? 'Endpoint updated' : 'Endpoint created' });
        setShowEndpointForm(false);
        setEditingEndpoint(null);
        setEpForm({ name: '', url: '', status_code: 1, color: '#22c55e', description: '' });
        await fetchConfig();
      } else {
        const err = await response.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };
  
  const deleteEndpoint = async (endpointId: string) => {
    if (!confirm('Delete this endpoint? Any rules using it will also be removed.')) return;
    try {
      await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/endpoints/${endpointId}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Endpoint deleted' });
      await fetchConfig();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };

  // ═══════════════════════════════════════════════════════
  //  RULE CRUD
  // ═══════════════════════════════════════════════════════
  
  const saveRule = async () => {
    if (!ruleForm.redirect_endpoint_id) {
      setMessage({ type: 'error', text: 'Select a redirect endpoint' });
      return;
    }
    if (ruleForm.condition_type === 'answer_based' && !ruleForm.question_id) {
      setMessage({ type: 'error', text: 'Select a question for answer-based rules' });
      return;
    }
    setSaving(true);
    try {
      const method = editingRule ? 'PUT' : 'POST';
      const url = editingRule
        ? `${baseUrl}/api/redirect-rules/${surveyId}/rules/${editingRule.id}`
        : `${baseUrl}/api/redirect-rules/${surveyId}/rules`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleForm)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: editingRule ? 'Rule updated' : 'Rule created' });
        setShowRuleForm(false);
        setEditingRule(null);
        setRuleForm({
          name: '', condition_type: 'answer_based', question_id: '',
          condition: 'equals', expected_value: '', redirect_endpoint_id: '',
          fire_s2s: true, is_active: true
        });
        await fetchConfig();
      } else {
        const err = await response.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };
  
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/rules/${ruleId}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Rule deleted' });
      await fetchConfig();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };
  
  const toggleRuleActive = async (rule: RedirectRule) => {
    try {
      await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      await fetchConfig();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to toggle' });
    }
  };

  const moveRule = async (currentIdx: number, direction: 'up' | 'down') => {
    const rules = [...config.redirect_rules];
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= rules.length) return;
    
    // Swap the rules
    const newOrder = rules.map(r => r.id);
    [newOrder[currentIdx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[currentIdx]];
    
    try {
      await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/rules/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_order: newOrder })
      });
      await fetchConfig();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to reorder' });
    }
  };

  // ═══════════════════════════════════════════════════════
  //  DEFAULT & S2S
  // ═══════════════════════════════════════════════════════
  
  const setDefaultEndpoint = async (endpointId: string | null) => {
    try {
      await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_redirect_endpoint_id: endpointId })
      });
      setMessage({ type: 'success', text: 'Default endpoint updated' });
      await fetchConfig();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to set default' });
    }
  };
  
  const saveS2SConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/s2s-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s2sForm)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'S2S config saved' });
        await fetchConfig();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save S2S config' });
    } finally {
      setSaving(false);
    }
  };
  
  const testS2S = async () => {
    setS2sTesting(true);
    setS2sTestResult(null);
    try {
      const response = await fetch(`${baseUrl}/api/redirect-rules/${surveyId}/s2s-config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setS2sTestResult(data);
    } catch (e) {
      setS2sTestResult({ success: false, error: 'Network error' });
    } finally {
      setS2sTesting(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════
  
  const getEndpointById = (id: string) => config.redirect_endpoints.find(ep => ep.id === id);
  
  const getQuestionLabel = (qId: string) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return qId;
    const text = q.question || q.question_text || '';
    return text.length > 50 ? text.slice(0, 50) + '...' : text;
  };
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const copyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    setMessage({ type: 'success', text: `Copied: ${placeholder}` });
  };

  // Clear messages after 3s
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Loading redirect configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success'
            ? isDarkMode ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-50 text-green-700 border border-green-200'
            : isDarkMode ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* ═══ SECTION 1: REDIRECT ENDPOINTS ═══ */}
      <div className={`rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <button
          onClick={() => toggleSection('endpoints')}
          className={`w-full px-5 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-3">
            <Link2 size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            <div className="text-left">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Redirect Endpoints
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Define where users get redirected ({config.redirect_endpoints.length} configured)
              </p>
            </div>
          </div>
          {expandedSections.endpoints ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.endpoints && (
          <div className={`px-5 pb-5 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
            {/* Endpoint List */}
            <div className="space-y-3 mt-4">
              {config.redirect_endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
                  style={{ borderLeftColor: ep.color }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ep.color }}></div>
                      <div>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ep.name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                          Status: {ep.status_code}
                        </span>
                        {config.default_redirect_endpoint_id === ep.id && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">DEFAULT</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDefaultEndpoint(config.default_redirect_endpoint_id === ep.id ? null : ep.id)}
                        className={`text-xs px-2 py-1 rounded ${
                          config.default_redirect_endpoint_id === ep.id
                            ? 'bg-blue-500 text-white'
                            : isDarkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Set as default fallback"
                      >
                        {config.default_redirect_endpoint_id === ep.id ? '★ Default' : '☆ Set Default'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingEndpoint(ep);
                          setEpForm(ep);
                          setShowEndpointForm(true);
                        }}
                        className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-500'}`}
                      >
                        <Settings2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteEndpoint(ep.id)}
                        className={`p-1.5 rounded text-red-400 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={`mt-2 text-xs font-mono truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {ep.url}
                  </div>
                  {ep.description && (
                    <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {ep.description}
                    </div>
                  )}
                </div>
              ))}
              
              {config.redirect_endpoints.length === 0 && (
                <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Link2 size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No endpoints yet. Add your first redirect URL.</p>
                </div>
              )}
            </div>
            
            {/* Add Endpoint Button */}
            <button
              onClick={() => {
                setEditingEndpoint(null);
                setEpForm({ name: '', url: '', status_code: 1, color: ENDPOINT_COLORS[config.redirect_endpoints.length % ENDPOINT_COLORS.length], description: '' });
                setShowEndpointForm(true);
              }}
              className={`mt-4 w-full py-2.5 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium ${
                isDarkMode
                  ? 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400'
                  : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              <Plus size={16} /> Add Endpoint
            </button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2: REDIRECT RULES ═══ */}
      <div className={`rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <button
          onClick={() => toggleSection('rules')}
          className={`w-full px-5 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-3">
            <Layers size={20} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
            <div className="text-left">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Redirect Rules
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Define conditions to route users ({config.redirect_rules.length} rules)
              </p>
            </div>
          </div>
          {expandedSections.rules ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.rules && (
          <div className={`px-5 pb-5 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
            {/* Rules List */}
            <div className="space-y-3 mt-4">
              {config.redirect_rules.map((rule, idx) => {
                const endpoint = getEndpointById(rule.redirect_endpoint_id);
                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-lg border ${
                      rule.is_active
                        ? isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-white border-gray-200'
                        : isDarkMode ? 'bg-slate-800/50 border-slate-700 opacity-50' : 'bg-gray-100 border-gray-200 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {/* Priority controls */}
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => moveRule(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-0.5 rounded ${idx === 0 ? 'opacity-20 cursor-not-allowed' : isDarkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Move up (higher priority)"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <button
                            onClick={() => moveRule(idx, 'down')}
                            disabled={idx === config.redirect_rules.length - 1}
                            className={`p-0.5 rounded ${idx === config.redirect_rules.length - 1 ? 'opacity-20 cursor-not-allowed' : isDarkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Move down (lower priority)"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {rule.name || `Rule ${idx + 1}`}
                          </div>
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {rule.condition_type === 'answer_based' && (
                              <span>IF <strong>Q: {getQuestionLabel(rule.question_id)}</strong> {rule.condition} "<em>{rule.expected_value}</em>"</span>
                            )}
                            {rule.condition_type === 'criteria_set' && (
                              <span>IF <strong>Criteria Set: {criteriaSets.find(cs => cs._id === rule.question_id)?.name || rule.question_id}</strong> → passes</span>
                            )}
                            {rule.condition_type === 'evaluation_result' && (
                              <span>IF <strong>Evaluation</strong> {rule.condition} "<em>{rule.expected_value}</em>"</span>
                            )}
                            {rule.condition_type === 'score_based' && (
                              <span>IF <strong>Score</strong> {rule.condition} <em>{rule.expected_value}</em></span>
                            )}
                            {rule.condition_type === 'always' && (
                              <span>ALWAYS (catch-all)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <ArrowRight size={12} className={isDarkMode ? 'text-slate-500' : 'text-gray-400'} />
                            {endpoint && (
                              <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: endpoint.color + '20', color: endpoint.color }}>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: endpoint.color }}></div>
                                {endpoint.name}
                              </span>
                            )}
                            {rule.fire_s2s && (
                              <span className={`text-xs px-2 py-0.5 rounded ${isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
                                <Zap size={10} className="inline mr-0.5" /> S2S
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleRuleActive(rule)}
                          className={`p-1.5 rounded text-xs ${
                            rule.is_active
                              ? 'text-green-500 hover:bg-green-50'
                              : isDarkMode ? 'text-slate-500 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                        >
                          {rule.is_active ? <Check size={14} /> : <X size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setRuleForm(rule);
                            setShowRuleForm(true);
                          }}
                          className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-500'}`}
                        >
                          <Settings2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className={`p-1.5 rounded text-red-400 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {config.redirect_rules.length === 0 && (
                <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Layers size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No rules yet. Add rules to route users based on their answers.</p>
                </div>
              )}
            </div>
            
            {/* Default Fallback Notice */}
            {config.redirect_endpoints.length > 0 && (
              <div className={`mt-4 p-3 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-blue-700'}`}>
                  <strong>Default Fallback:</strong>{' '}
                  {config.default_redirect_endpoint_id
                    ? `→ ${getEndpointById(config.default_redirect_endpoint_id)?.name || 'Unknown'}`
                    : 'Not set (will fall through to existing pass/fail logic)'
                  }
                </div>
              </div>
            )}
            
            {/* Add Rule Button */}
            {config.redirect_endpoints.length > 0 && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setRuleForm({
                    name: '', condition_type: 'answer_based', question_id: '',
                    condition: 'equals', expected_value: '', redirect_endpoint_id: '',
                    fire_s2s: true, is_active: true
                  });
                  setShowRuleForm(true);
                }}
                className={`mt-4 w-full py-2.5 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium ${
                  isDarkMode
                    ? 'border-slate-600 text-slate-300 hover:border-purple-500 hover:text-purple-400'
                    : 'border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600'
                }`}
              >
                <Plus size={16} /> Add Rule
              </button>
            )}
            
            {config.redirect_endpoints.length === 0 && (
              <p className={`mt-4 text-xs text-center ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                ⚠️ Add at least one endpoint above before creating rules.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: S2S CONFIG ═══ */}
      <div className={`rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <button
          onClick={() => toggleSection('s2s')}
          className={`w-full px-5 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-3">
            <Zap size={20} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />
            <div className="text-left">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                S2S Integration (Server-to-Server)
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Fire API calls to partner systems on redirect {s2sForm.enabled ? '(Active)' : '(Inactive)'}
              </p>
            </div>
          </div>
          {expandedSections.s2s ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.s2s && (
          <div className={`px-5 pb-5 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="space-y-4 mt-4">
              {/* Enable Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s2sForm.enabled}
                  onChange={(e) => setS2SForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Enable S2S Postback
                </span>
              </label>
              
              {s2sForm.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Partner Name</label>
                      <input
                        type="text"
                        value={s2sForm.partner_name}
                        onChange={(e) => setS2SForm(prev => ({ ...prev, partner_name: e.target.value }))}
                        placeholder="e.g., Moustacheleads"
                        className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Method</label>
                      <select
                        value={s2sForm.method}
                        onChange={(e) => setS2SForm(prev => ({ ...prev, method: e.target.value }))}
                        className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="GET">GET (URL with placeholders)</option>
                        <option value="POST">POST (JSON body)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      {s2sForm.method === 'GET' ? 'Postback URL (with placeholders)' : 'API Endpoint URL'}
                    </label>
                    <input
                      type="url"
                      value={s2sForm.endpoint}
                      onChange={(e) => setS2SForm(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder={s2sForm.method === 'GET' 
                        ? 'https://partner.com/postback?user_id={session_id}&status={redirect_status_code}&payout=0.10'
                        : 'https://api.partner.com/callback/updateStatus'}
                      className={`w-full p-2.5 rounded-lg border text-sm font-mono ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    {s2sForm.method === 'GET' && (
                      <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        Put the full URL with placeholders. Example: https://partner.com/postback?user_id={'{session_id}'}&status={'{redirect_status_code}'}
                      </p>
                    )}
                  </div>
                  
                  {/* API Key - only show for POST or if user wants it */}
                  {s2sForm.method === 'POST' && (
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>API Key (optional)</label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={s2sForm.api_key}
                          onChange={(e) => setS2SForm(prev => ({ ...prev, api_key: e.target.value }))}
                          placeholder="Leave empty if not required"
                          className={`w-full p-2.5 pr-10 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Body Template - only for POST */}
                  {s2sForm.method === 'POST' && (
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        Body Template (JSON — use placeholders)
                      </label>
                      <textarea
                        value={JSON.stringify(s2sForm.body_template, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setS2SForm(prev => ({ ...prev, body_template: parsed }));
                          } catch { /* allow invalid JSON while editing */ }
                        }}
                        rows={4}
                        placeholder='{"respondentId": "{session_id}", "status": "{redirect_status_code}"}'
                        className={`w-full p-2.5 rounded-lg border text-sm font-mono ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={saveS2SConfig}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2"
                    >
                      <Save size={14} /> {saving ? 'Saving...' : 'Save S2S Config'}
                    </button>
                    <button
                      onClick={testS2S}
                      disabled={s2sTesting || !s2sForm.endpoint}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                        isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}
                    >
                      <TestTube2 size={14} /> {s2sTesting ? 'Testing...' : 'Test S2S'}
                    </button>
                  </div>
                  
                  {/* Test Result */}
                  {s2sTestResult && (
                    <div className={`p-3 rounded-lg text-xs font-mono ${
                      s2sTestResult.success
                        ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
                        : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
                    }`}>
                      <p className="font-bold mb-1">{s2sTestResult.success ? '✅ Success' : '❌ Failed'}</p>
                      {s2sTestResult.status_code && <p>Status: {s2sTestResult.status_code}</p>}
                      {s2sTestResult.response_text && <p className="mt-1 break-all">{s2sTestResult.response_text.slice(0, 200)}</p>}
                      {s2sTestResult.error && <p className="mt-1">{s2sTestResult.error}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION 4: PLACEHOLDERS ═══ */}
      <div className={`rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} overflow-hidden`}>
        <button
          onClick={() => toggleSection('placeholders')}
          className={`w-full px-5 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-3">
            <Copy size={20} className={isDarkMode ? 'text-teal-400' : 'text-teal-600'} />
            <div className="text-left">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Available Placeholders
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Use these in your endpoint URLs (click to copy)
              </p>
            </div>
          </div>
          {expandedSections.placeholders ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {expandedSections.placeholders && (
          <div className={`px-5 pb-5 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="mt-4 overflow-x-auto">
              <table className={`w-full text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                <thead>
                  <tr className={`${isDarkMode ? 'border-slate-600' : 'border-gray-200'} border-b`}>
                    <th className="text-left py-2 pr-3 font-semibold">Placeholder</th>
                    <th className="text-left py-2 pr-3 font-semibold">Description</th>
                    <th className="text-left py-2 font-semibold">Example Value</th>
                  </tr>
                </thead>
                <tbody className={`${isDarkMode ? 'divide-slate-700' : 'divide-gray-100'} divide-y`}>
                  {[
                    { p: '{session_id}', desc: 'Unique session ID for this survey attempt', ex: 'a3f2-bc01-d4e5' },
                    { p: '{survey_id}', desc: 'The survey identifier', ex: '3KCWF' },
                    { p: '{click_id}', desc: 'Click/tracking ID passed on survey entry URL', ex: 'clk_789xyz' },
                    { p: '{user_id}', desc: 'Internal user ID of the respondent', ex: 'usr_12345' },
                    { p: '{email}', desc: 'Email address provided by respondent', ex: 'user@example.com' },
                    { p: '{username}', desc: 'Username/name of the respondent', ex: 'john_doe' },
                    { p: '{redirect_status_code}', desc: 'Status code of the matched endpoint (1,2,3,4...)', ex: '1' },
                    { p: '{status}', desc: 'Evaluation result: "pass" or "fail"', ex: 'pass' },
                    { p: '{score}', desc: 'Evaluation score percentage (0-100)', ex: '85' },
                    { p: '{timestamp}', desc: 'Unix timestamp (seconds since epoch)', ex: '1753267200' },
                    { p: '{iso_timestamp}', desc: 'ISO format date-time', ex: '2026-07-23T10:00:00Z' },
                    { p: '{ip_address}', desc: 'Respondent IP address', ex: '192.168.1.1' },
                    { p: '{respondent_id}', desc: 'Same as session_id (alias for partner compat)', ex: 'a3f2-bc01-d4e5' },
                    { p: '{sub1}', desc: 'Sub-parameter 1 from entry URL', ex: 'campaign_a' },
                    { p: '{sub2}', desc: 'Sub-parameter 2 from entry URL', ex: 'source_fb' },
                  ].map(row => (
                    <tr key={row.p}>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => copyPlaceholder(row.p)}
                          className={`font-mono px-2 py-0.5 rounded cursor-pointer ${isDarkMode ? 'bg-slate-700 text-teal-300 hover:bg-slate-600' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                        >
                          {row.p}
                        </button>
                      </td>
                      <td className={`py-2 pr-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.desc}</td>
                      <td className={`py-2 font-mono ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{row.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      
      {/* Endpoint Form Modal */}
      {showEndpointForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} max-w-lg w-full rounded-xl p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingEndpoint ? 'Edit' : 'Add'} Redirect Endpoint
              </h3>
              <button onClick={() => { setShowEndpointForm(false); setEditingEndpoint(null); }} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Name *</label>
                <input
                  type="text"
                  value={epForm.name || ''}
                  onChange={(e) => setEpForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Complete, Terminate, Quota Full"
                  className={`w-full p-3 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Redirect URL *</label>
                <input
                  type="text"
                  value={epForm.url || ''}
                  onChange={(e) => setEpForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://partner.com/callback?rid={session_id}&status=1"
                  className={`w-full p-3 rounded-lg border text-sm font-mono ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Use placeholders like {'{session_id}'}, {'{redirect_status_code}'} etc.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Status Code</label>
                  <input
                    type="number"
                    min={1}
                    value={epForm.status_code || 1}
                    onChange={(e) => setEpForm(prev => ({ ...prev, status_code: parseInt(e.target.value) || 1 }))}
                    className={`w-full p-3 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={epForm.color || '#22c55e'}
                      onChange={(e) => setEpForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {ENDPOINT_COLORS.slice(0, 5).map(c => (
                        <button
                          key={c}
                          onClick={() => setEpForm(prev => ({ ...prev, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 ${epForm.color === c ? 'border-blue-500' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Description (optional)</label>
                <input
                  type="text"
                  value={epForm.description || ''}
                  onChange={(e) => setEpForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., User completed survey successfully"
                  className={`w-full p-3 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveEndpoint}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
              >
                <Save size={16} /> {saving ? 'Saving...' : editingEndpoint ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => { setShowEndpointForm(false); setEditingEndpoint(null); }}
                className={`px-4 py-3 rounded-lg border font-medium ${isDarkMode ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rule Form Modal */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-slate-800/95 border-slate-600/50' : 'bg-white/95 border-white/60'} max-w-2xl w-full rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto border backdrop-blur-xl`}
            style={{ boxShadow: isDarkMode ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.3)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingRule ? 'Edit' : 'Add'} Redirect Rule
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Define when to redirect a user to a specific endpoint
                </p>
              </div>
              <button onClick={() => { setShowRuleForm(false); setEditingRule(null); }} className={`p-2.5 rounded-xl ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Rule Name */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>Rule Name</label>
                <input
                  type="text"
                  value={ruleForm.name || ''}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Qualified Users → Complete"
                  className={`w-full p-3.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700/80 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400`}
                />
              </div>
              
              {/* Condition Type */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>Condition Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'criteria_set', label: 'Criteria Set', desc: 'Use a group of rules you created', icon: '📋' },
                    { value: 'answer_based', label: 'Single Answer', desc: 'Check one specific question', icon: '❓' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRuleForm(prev => ({ ...prev, condition_type: opt.value as any }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        ruleForm.condition_type === opt.value
                          ? isDarkMode ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                          : isDarkMode ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      <div className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{opt.label}</div>
                      <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Criteria Set selection */}
              {ruleForm.condition_type === 'criteria_set' && (
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-purple-50/50 border-purple-100'}`}>
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>Select Criteria Set</label>
                  <select
                    value={ruleForm.question_id || ''}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, question_id: e.target.value, condition: 'equals', expected_value: 'pass' }))}
                    className={`w-full p-3.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                  >
                    <option value="">— Select Criteria Set —</option>
                    {criteriaSets.map((cs) => (
                      <option key={cs._id} value={cs._id}>
                        {cs.name} ({cs.criteria.length} rules)
                      </option>
                    ))}
                  </select>
                  {criteriaSets.length === 0 && (
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      ⚠ No criteria sets found. Create one in the "Criteria & Questions" tab first.
                    </p>
                  )}
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    ℹ When ALL rules in this criteria set pass, the user gets redirected to the selected endpoint.
                  </p>
                </div>
              )}

              {/* Answer Based: Question + Condition + Value */}
              {ruleForm.condition_type === 'answer_based' && (
                <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-50/50 border-blue-100'}`}>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>Question</label>
                    <select
                      value={ruleForm.question_id || ''}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, question_id: e.target.value }))}
                      className={`w-full p-3.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    >
                      <option value="">— Select Question —</option>
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.id}: {(q.question || q.question_text || '').slice(0, 60)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Condition</label>
                      <select
                        value={ruleForm.condition || 'equals'}
                        onChange={(e) => setRuleForm(prev => ({ ...prev, condition: e.target.value }))}
                        className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      >
                        {CONDITION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Expected Value</label>
                      {ruleForm.question_id && (() => {
                        const q = questions.find(q => q.id === ruleForm.question_id);
                        if (q && q.options && q.options.length > 0) {
                          return (
                            <select
                              value={ruleForm.expected_value || ''}
                              onChange={(e) => setRuleForm(prev => ({ ...prev, expected_value: e.target.value }))}
                              className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            >
                              <option value="">— Select —</option>
                              {q.options.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          );
                        }
                        return (
                          <input type="text" value={ruleForm.expected_value || ''}
                            onChange={(e) => setRuleForm(prev => ({ ...prev, expected_value: e.target.value }))}
                            placeholder="Expected answer"
                            className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                        );
                      })()}
                      {!ruleForm.question_id && (
                        <input type="text" disabled placeholder="Select a question first"
                          className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`} />
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Redirect Endpoint */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>Redirect To *</label>
                <select
                  value={ruleForm.redirect_endpoint_id || ''}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, redirect_endpoint_id: e.target.value }))}
                  className={`w-full p-3.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-700/80 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400`}
                >
                  <option value="">— Select Endpoint —</option>
                  {config.redirect_endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} (Status: {ep.status_code})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Fire S2S */}
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl ${isDarkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={ruleForm.fire_s2s ?? true}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, fire_s2s: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                    Fire S2S postback
                  </span>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Also send server-to-server notification to partner when this rule matches
                  </p>
                </div>
              </label>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                onClick={saveRule}
                disabled={saving}
                className="flex-1 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Save size={16} /> {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
              <button
                onClick={() => { setShowRuleForm(false); setEditingRule(null); }}
                className={`px-5 py-3.5 rounded-xl border font-medium ${isDarkMode ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedirectRulesBuilder;
