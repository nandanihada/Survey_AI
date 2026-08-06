/**
 * SimpleBranchingRules - Easy-to-understand branching rules editor
 * 
 * Features:
 * - Table view for all questions
 * - Set when to show each question (always or conditional)
 * - Set redirect URL after any question (with resume support)
 * - AI-powered suggestions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  Sparkles, Save, RefreshCw, Eye, EyeOff,
  AlertCircle, Check, HelpCircle, ExternalLink, Link, ChevronDown, ChevronUp,
  ArrowUpRight, StopCircle
} from 'lucide-react';
import './SimpleBranchingRules.css';

interface RedirectConfig {
  enabled: boolean;
  url: string;
  condition: string;
  color: string;
  allow_resume: boolean;
  resume_expiry_hours?: number;
  open_in_new_tab?: boolean;  // default true
}

interface BranchingRule {
  index: number;
  id: string;
  question: string;
  type: string;
  options: string[];
  show_if: any;
  always_show: boolean;
  depends_on: string | null;
  condition: string | null;
  value: string | null;
  // Redirect settings
  redirect_enabled: boolean;
  redirect_url: string | null;
  redirect_condition: string | null;
  redirect_color: string;
  allow_resume: boolean;
  resume_expiry_hours: number;
  // Multi-condition redirects (e.g. Yes→url1, No→url2)
  redirect_configs: RedirectConfig[];
  // End here settings
  end_here_enabled: boolean;
  end_here_condition: string;
  // Redirect tab behaviour
  open_in_new_tab: boolean;  // true = new tab (default), false = same tab
  // Survey chaining
  chain_survey_enabled: boolean;
  chain_survey_url: string | null;
  chain_survey_condition: string;       // 'always' | answer value
  chain_survey_mode: 'direct' | 'ask' | 'inline';
  chain_survey_message: string;
  chain_survey_yes_label: string;
  chain_survey_no_label: string;
  // Per-answer chaining (Yes→SurveyA, No→SurveyB)
  chain_survey_configs: Array<{
    condition: string;
    url: string;
    mode: 'direct' | 'ask' | 'inline';
  }>;
  // Layers (result pages, spinners, chain surveys, end survey)
  layers: Array<{
    type: 'result_page' | 'spinner' | 'chain_survey' | 'end_survey';
    variant?: 'pass' | 'fail';         // for result_page
    condition: string;                  // 'always' | answer value
    // result_page fields
    title?: string;
    subtitle?: string;
    cta_text?: string;
    // spinner fields
    duration?: number;
    text?: string;
    // chain_survey fields
    survey_url?: string;
    chain_mode?: 'direct' | 'ask';
    chain_message?: string;
    chain_yes_label?: string;
    chain_no_label?: string;
  }>;
}

interface Props {
  surveyId: string;
  onClose?: () => void;
  onRulesSaved?: () => void;  // Called after successful save — triggers flow diagram refresh
  focusQuestionId?: string | null;  // If set, auto-expand this question row on mount
}

// ── Survey URL Picker — dropdown of user's own surveys + manual URL fallback ──
interface SurveyUrlPickerProps {
  value: string;
  surveys: Array<{ id: string; title: string; url: string }>;
  currentSurveyId: string;
  placeholder: string;
  onChange: (val: string) => void;
}
const SurveyUrlPicker: React.FC<SurveyUrlPickerProps> = ({ value, surveys, currentSurveyId, placeholder, onChange }) => {
  const [showManual, setShowManual] = React.useState(false);
  // Find if current value matches one of the user's surveys
  const matched = surveys.find(s => s.url === value || value?.includes(s.id));

  // If value doesn't match any survey and is non-empty, show manual input
  React.useEffect(() => {
    if (value && !surveys.find(s => s.url === value || value.includes(s.id))) {
      setShowManual(true);
    }
  }, [value, surveys]);

  const otherSurveys = surveys.filter(s => s.id !== currentSurveyId);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Dropdown of user's surveys */}
      <select
        className="sbr-select"
        value={matched ? matched.url : (showManual ? '__manual__' : '')}
        onChange={(e) => {
          if (e.target.value === '__manual__') {
            setShowManual(true);
            onChange('');
          } else if (e.target.value === '') {
            setShowManual(false);
            onChange('');
          } else {
            setShowManual(false);
            onChange(e.target.value);
          }
        }}
        style={{ fontSize: 12 }}
      >
        <option value="">{otherSurveys.length > 0 ? placeholder : 'No other surveys — use manual URL below'}</option>
        {otherSurveys.map(s => (
          <option key={s.id} value={s.url}>
            {s.title.length > 45 ? s.title.slice(0, 45) + '…' : s.title}
          </option>
        ))}
        <option value="__manual__">✏️ Paste a URL manually…</option>
      </select>

      {/* Manual URL input — shown when "Paste URL" is selected, value is external, or no surveys */}
      {(showManual || otherSurveys.length === 0) && (
        <input
          type="text"
          className="url-input"
          placeholder="https://survey.pepperwahl.com/survey/..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: 12 }}
          autoFocus={showManual}
        />
      )}
    </div>
  );
};

const SimpleBranchingRules: React.FC<Props> = ({ surveyId, onClose, onRulesSaved, focusQuestionId }) => {
  const baseUrl = getApiBaseUrl();
  
  const [rules, setRules] = useState<BranchingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);
  // Track if component is still mounted before setting any message
  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  const safeSetMessage = React.useCallback((msg: {type: 'success'|'error'|'info', text: string} | null) => {
    if (isMountedRef.current) setMessage(msg);
  }, []);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<Record<number, 'redirect' | 'chain' | 'end' | 'passfail'>>({});
  const [expandedLayerIdx, setExpandedLayerIdx] = useState<Record<number, number | null>>({});
  const rulesRef = React.useRef<BranchingRule[]>([]);
  // Ref for the focused row so we can scroll to it
  const focusRowRef = React.useRef<HTMLTableRowElement | null>(null);

  // ── User's own surveys for the chain-survey picker ────────────────────────
  const [userSurveys, setUserSurveys] = useState<Array<{ id: string; title: string; url: string }>>([]);

  useEffect(() => {
    const fetchUserSurveys = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${baseUrl}/api/surveys`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          console.warn('fetchUserSurveys: non-ok response', res.status);
          // Silently fall through — chain picker will show "paste URL" fallback
          return;
        }
        const data = await res.json();
        console.log('fetchUserSurveys response:', data);
        const list = (data.surveys || data || []).map((s: any) => {
          const sid = s.short_id || s.id || s._id;
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const frontendBase = isLocal ? 'http://localhost:5173' : 'https://survey.pepperwahl.com';
          return {
            id: sid,
            title: s.title || s.prompt?.slice(0, 40) || `Survey ${sid}`,
            url: `${frontendBase}/survey/${sid}`,
          };
        });
        console.log('fetchUserSurveys parsed:', list.length, 'surveys');
        setUserSurveys(list);
      } catch (e) {
        console.error('fetchUserSurveys error:', e);
      }
    };
    fetchUserSurveys();
  }, [baseUrl]);

  // Keep ref in sync so we can save on unmount
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  // Fetch current rules
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        const rulesWithRedirect = (data.rules || []).map((r: any) => ({
          ...r,
          redirect_enabled: r.redirect_enabled || false,
          redirect_url: r.redirect_url || null,
          redirect_condition: r.redirect_condition || 'always',
          redirect_color: r.redirect_color || '#f59e0b',
          allow_resume: r.allow_resume !== false,
          resume_expiry_hours: r.resume_expiry_hours ?? 24,
          redirect_configs: r.redirect_configs || [],
          end_here_enabled: r.end_here_enabled || false,
          end_here_condition: r.end_here_condition || 'always',
          open_in_new_tab: r.open_in_new_tab !== false,
          chain_survey_enabled: r.chain_survey_enabled || false,
          chain_survey_url: r.chain_survey_url || null,
          chain_survey_condition: r.chain_survey_condition || 'always',
          chain_survey_mode: r.chain_survey_mode || 'ask',
          chain_survey_message: r.chain_survey_message || 'Another survey is waiting for you!',
          chain_survey_yes_label: r.chain_survey_yes_label || 'Continue',
          chain_survey_no_label: r.chain_survey_no_label || 'No thanks',
          chain_survey_configs: r.chain_survey_configs || [],
          layers: r.layers || [],
        }));
        setRules(rulesWithRedirect);
      } else {
        // Non-ok response — show error but don't crash
        console.error('fetchRules non-ok:', response.status);
      }
    } catch (error) {
      // Only log — don't show a red error banner on initial load
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, surveyId]);

  useEffect(() => {
    if (surveyId) fetchRules();
  }, [surveyId, fetchRules]);

  // Clear any stale message whenever surveyId changes (new survey opened)
  useEffect(() => {
    safeSetMessage(null);
  }, [surveyId, safeSetMessage]);

  // Auto-expand and scroll to the focused question row after rules load
  useEffect(() => {
    if (!loading && focusQuestionId && rules.length > 0) {
      const idx = rules.findIndex(r => r.id === focusQuestionId);
      if (idx !== -1) {
        setExpandedRow(idx);
        // Give DOM a tick to render the expanded row, then scroll
        setTimeout(() => {
          focusRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      }
    }
  }, [loading, focusQuestionId, rules]);

  // Save rules (also used for auto-save)
  const saveRules = useCallback(async (rulesToSave?: BranchingRule[]) => {
    const data = rulesToSave || rules;
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rules: data })
      });
      
      if (response.ok) {
        safeSetMessage({ type: 'success', text: 'Branching rules saved!' });
        setHasChanges(false);
        onRulesSaved?.();
      } else {
        safeSetMessage({ type: 'error', text: 'Failed to save' });
      }
    } catch (error) {
      safeSetMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }, [baseUrl, surveyId, rules]);

  // Auto-save when component unmounts if there are unsaved changes
  const hasChangesRef = React.useRef(false);
  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  useEffect(() => {
    return () => {
      // On unmount, auto-save silently if there are unsaved changes
      if (hasChangesRef.current && rulesRef.current.length > 0) {
        const tok = localStorage.getItem('auth_token');
        fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
          body: JSON.stringify({ rules: rulesRef.current })
        }).catch(() => {}); // Silent fail on unmount
      }
    };
  }, [baseUrl, surveyId]);

  // Let AI suggest rules
  const aiSuggest = async () => {
    if (!confirm('AI will analyze your questions and suggest branching logic. Continue?')) return;
    
    try {
      setAiLoading(true);
      const response = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const rulesWithRedirect = (data.rules || []).map((r: any) => ({
          ...r,
          redirect_enabled: r.redirect_enabled || false,
          redirect_url: r.redirect_url || null,
          redirect_condition: r.redirect_condition || 'always',
          redirect_color: r.redirect_color || '#f59e0b',
          allow_resume: r.allow_resume !== false,
          resume_expiry_hours: r.resume_expiry_hours ?? 24,
          end_here_enabled: r.end_here_enabled || false,
          end_here_condition: r.end_here_condition || 'always',
          layers: r.layers || [],
        }));
        setRules(rulesWithRedirect);
        setHasChanges(true);
        safeSetMessage({ type: 'success', text: 'AI suggestions applied! Review and save.' });
      } else {
        safeSetMessage({ type: 'error', text: 'AI suggestion failed' });
      }
    } catch (error) {
      safeSetMessage({ type: 'error', text: 'Network error' });
    } finally {
      setAiLoading(false);
    }
  };

  // Update a single rule
  const updateRule = (index: number, field: string, value: any) => {
    setRules(prev => prev.map((rule, i) => {
      if (i !== index) return rule;
      
      const updated = { ...rule, [field]: value };
      
      // If toggling to "always show", clear the dependency
      if (field === 'always_show' && value === true) {
        updated.depends_on = null;
        updated.condition = null;
        updated.value = null;
        updated.show_if = null;
      }
      
      // If selecting a dependency, set defaults
      if (field === 'depends_on' && value) {
        updated.always_show = false;
        updated.condition = updated.condition || 'equals';
      }
      
      // Build show_if from individual fields
      if (!updated.always_show && updated.depends_on) {
        updated.show_if = {
          depends_on: updated.depends_on,
          condition: updated.condition || 'equals',
          value: updated.value
        };
      } else {
        updated.show_if = null;
      }
      
      return updated;
    }));
    setHasChanges(true);
  };

  // Get available parent questions (only questions before this one)
  const getParentOptions = (currentIndex: number) => {
    return rules.slice(0, currentIndex).filter(r => 
      r.type === 'yes_no' || 
      r.type === 'multiple_choice' || 
      r.type === 'dropdown' ||
      (r.options && r.options.length > 0)
    );
  };

  // Get answer options for a parent question
  const getAnswerOptions = (parentId: string | null) => {
    if (!parentId) return [];
    const parent = rules.find(r => r.id === parentId);
    if (!parent) return [];
    
    if (parent.type === 'yes_no') {
      return ['Yes', 'No'];
    }
    
    return parent.options || [];
  };

  // Get answer options for current question (for redirect condition)
  const getCurrentAnswerOptions = (rule: BranchingRule) => {
    if (rule.type === 'yes_no') {
      return ['Yes', 'No'];
    }
    return rule.options || [];
  };

  // Toggle expanded row
  const toggleExpand = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  // Clear message after delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => safeSetMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message, safeSetMessage]);

  if (loading) {
    return (
      <div className="simple-branching-loading">
        <div className="loading-spinner" />
        <p>Loading branching rules...</p>
      </div>
    );
  }

  return (
    <div className="simple-branching-rules">
      {/* Header */}
      <div className="sbr-header">
        <div className="sbr-header-left">
          <h2>📋 Branching & Redirects</h2>
          <p className="sbr-subtitle">Control question flow and set redirect URLs</p>
        </div>
        
        <div className="sbr-header-right">
          <button 
            className="sbr-btn ai"
            onClick={aiSuggest}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <RefreshCw size={16} className="spinning" />
                AI Thinking...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI Suggest
              </>
            )}
          </button>
          
          <button 
            className="sbr-btn primary"
            onClick={saveRules}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="spinning" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Rules
              </>
            )}
          </button>
          
          {onClose && (
            <button className="sbr-btn close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`sbr-message ${message.type}`}>
          {message.type === 'success' && <Check size={16} />}
          {message.type === 'error' && <AlertCircle size={16} />}
          {message.type === 'info' && <HelpCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Help Box */}
      <div className="sbr-help">
        <HelpCircle size={18} />
        <div>
          <strong>How it works:</strong>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li><strong>Show Logic:</strong> Control when each question appears (always or based on previous answers)</li>
            <li><strong>Redirect:</strong> Click any row to expand and set a redirect URL - user will be sent there after answering</li>
          </ul>
        </div>
      </div>

      {/* Rules Table */}
      <div className="sbr-table-wrapper">
        <table className="sbr-table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-question">Question</th>
              <th className="col-type">Type</th>
              <th className="col-visibility">Show When</th>
              <th className="col-depends">Depends On</th>
              <th className="col-answer">Answer Value</th>
              <th className="col-redirect">Redirect</th>
              <th className="col-expand"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => {
              const parentOptions = getParentOptions(index);
              const answerOptions = getAnswerOptions(rule.depends_on);
              const hasParentOptions = parentOptions.length > 0;
              const isExpanded = expandedRow === index;
              const currentAnswerOptions = getCurrentAnswerOptions(rule);
              
              return (
                <React.Fragment key={rule.id}>
                  <tr className={`${rule.always_show ? 'always-show' : 'conditional'} ${isExpanded ? 'expanded' : ''} ${rule.id === focusQuestionId ? 'focus-highlight' : ''}`}
                    ref={rule.id === focusQuestionId ? (el => { focusRowRef.current = el; }) : undefined}
                  >
                    <td className="col-num">{index + 1}</td>
                    
                    <td className="col-question">
                      <div className="question-text">{rule.question}</div>
                    </td>
                    
                    <td className="col-type">
                      <span className={`type-badge ${rule.type}`}>
                        {rule.type.replace('_', ' ')}
                      </span>
                    </td>
                    
                    <td className="col-visibility">
                      <label className="visibility-toggle">
                        <input
                          type="checkbox"
                          checked={rule.always_show}
                          onChange={(e) => updateRule(index, 'always_show', e.target.checked)}
                          disabled={!hasParentOptions}
                        />
                        <span className="toggle-label">
                          {rule.always_show ? (
                            <>
                              <Eye size={14} />
                              Always
                            </>
                          ) : (
                            <>
                              <EyeOff size={14} />
                              Conditional
                            </>
                          )}
                        </span>
                      </label>
                    </td>
                    
                    <td className="col-depends">
                      {!rule.always_show && hasParentOptions ? (
                        <select
                          value={rule.depends_on || ''}
                          onChange={(e) => updateRule(index, 'depends_on', e.target.value || null)}
                          className="sbr-select"
                        >
                          <option value="">Select question...</option>
                          {parentOptions.map((parent) => (
                            <option key={parent.id} value={parent.id}>
                              Q{parent.index + 1}: {parent.question.substring(0, 25)}...
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="na-text">—</span>
                      )}
                    </td>
                    
                    <td className="col-answer">
                      {!rule.always_show && rule.depends_on && answerOptions.length > 0 ? (
                        <select
                          value={rule.value || ''}
                          onChange={(e) => updateRule(index, 'value', e.target.value)}
                          className="sbr-select answer-select"
                        >
                          <option value="">Select answer...</option>
                          {answerOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="na-text">—</span>
                      )}
                    </td>
                    
                    <td className="col-redirect">
                      {rule.redirect_enabled ? (
                        <span className="redirect-badge active">
                          <ExternalLink size={12} />
                          Redirect
                        </span>
                      ) : rule.end_here_enabled ? (
                        <span className="redirect-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
                          🛑 Ends Here
                        </span>
                      ) : (
                        <span className="redirect-badge inactive">None</span>
                      )}
                    </td>
                    
                    <td className="col-expand">
                      <button 
                        className="expand-btn"
                        onClick={() => toggleExpand(index)}
                        title="Configure redirect"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Row - Tabbed Configuration */}
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan={8}>
                        <div className="exp-panel">
                          {/* Tab bar */}
                          <div className="exp-tab-bar">
                            <button
                              className={`exp-tab exp-tab--redirect ${(activeConfigTab[index] ?? 'redirect') === 'redirect' ? 'exp-tab--active' : ''}`}
                              onClick={() => setActiveConfigTab(prev => ({ ...prev, [index]: 'redirect' }))}
                            >
                              <ArrowUpRight size={14} />
                              Redirect
                              {rule.redirect_enabled && <span className="exp-tab-dot exp-tab-dot--amber" />}
                            </button>
                            <button
                              className={`exp-tab exp-tab--chain ${(activeConfigTab[index] ?? 'redirect') === 'chain' ? 'exp-tab--active' : ''}`}
                              onClick={() => setActiveConfigTab(prev => ({ ...prev, [index]: 'chain' }))}
                            >
                              <Link size={14} />
                              Chain Survey
                              {rule.chain_survey_enabled && <span className="exp-tab-dot exp-tab-dot--teal" />}
                            </button>
                            <button
                              className={`exp-tab exp-tab--end ${(activeConfigTab[index] ?? 'redirect') === 'end' ? 'exp-tab--active' : ''}`}
                              onClick={() => setActiveConfigTab(prev => ({ ...prev, [index]: 'end' }))}
                            >
                              <StopCircle size={14} />
                              End Survey
                              {rule.end_here_enabled && <span className="exp-tab-dot exp-tab-dot--red" />}
                            </button>
                            <button
                              className={`exp-tab exp-tab--passfail ${(activeConfigTab[index] ?? 'redirect') === 'passfail' ? 'exp-tab--active' : ''}`}
                              onClick={() => setActiveConfigTab(prev => ({ ...prev, [index]: 'passfail' }))}
                            >
                              ◈ Multi Layer
                              {(rule.layers && rule.layers.length > 0) && <span className="exp-tab-dot" style={{ background: '#8b5cf6' }} />}
                            </button>
                          </div>

                          {/* ─── REDIRECT TAB ─────────────────────────────── */}
                          {(activeConfigTab[index] ?? 'redirect') === 'redirect' && (
                            <div className="exp-tab-body">
                              <div className="exp-section-header exp-section-header--amber">
                                <ArrowUpRight size={16} />
                                <span>Redirect to an external URL after this question</span>
                              </div>

                              {/* Per-answer redirect rows (questions with options) */}
                              {currentAnswerOptions.length > 0 ? (
                                <div className="multi-redirect-section">
                                  <p className="multi-redirect-desc">
                                    Set a different redirect URL for each answer. Leave blank to skip redirecting for that answer.
                                  </p>
                                  <div className="multi-redirect-rows">
                                    {/* "Any answer" row */}
                                    <div className={`multi-redirect-row ${rule.redirect_condition === 'always' && rule.redirect_enabled ? 'active' : ''}`}>
                                      <span className="multi-redirect-answer-badge always">Always</span>
                                      <input
                                        type="text"
                                        className="url-input"
                                        placeholder="Redirect URL for any answer (leave blank to use per-answer rules)"
                                        value={rule.redirect_condition === 'always' && rule.redirect_enabled ? (rule.redirect_url || '') : ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val) {
                                            updateRule(index, 'redirect_enabled', true);
                                            updateRule(index, 'redirect_url', val);
                                            updateRule(index, 'redirect_condition', 'always');
                                            updateRule(index, 'redirect_configs', []);
                                          } else {
                                            updateRule(index, 'redirect_enabled', false);
                                            updateRule(index, 'redirect_url', null);
                                          }
                                        }}
                                      />
                                    </div>

                                    <div className="multi-redirect-divider">— or set per answer —</div>

                                    {currentAnswerOptions.map((opt) => {
                                      const existingCfg = (rule.redirect_configs || []).find(
                                        (c: RedirectConfig) => c.condition?.toLowerCase() === opt.toLowerCase()
                                      );
                                      const urlVal = existingCfg?.url || (
                                        rule.redirect_enabled && rule.redirect_condition?.toLowerCase() === opt.toLowerCase()
                                          ? rule.redirect_url || ''
                                          : ''
                                      );
                                      return (
                                        <div key={opt} className={`multi-redirect-row ${urlVal ? 'active' : ''}`}>
                                          <span className="multi-redirect-answer-badge">{opt}</span>
                                          <input
                                            type="text"
                                            className="url-input"
                                            placeholder={`Redirect URL when answer is "${opt}"`}
                                            value={urlVal}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const existing: RedirectConfig[] = [...(rule.redirect_configs || [])];
                                              const cfgIdx = existing.findIndex(
                                                (c: RedirectConfig) => c.condition?.toLowerCase() === opt.toLowerCase()
                                              );
                                              if (val) {
                                                const newCfg: RedirectConfig = {
                                                  enabled: true, url: val, condition: opt,
                                                  color: '#f59e0b', allow_resume: true, resume_expiry_hours: 24,
                                                };
                                                if (cfgIdx >= 0) existing[cfgIdx] = newCfg;
                                                else existing.push(newCfg);
                                              } else {
                                                if (cfgIdx >= 0) existing.splice(cfgIdx, 1);
                                              }
                                              const hasAny = existing.length > 0;
                                              updateRule(index, 'redirect_configs', existing);
                                              updateRule(index, 'redirect_enabled', hasAny);
                                              if (hasAny) {
                                                updateRule(index, 'redirect_url', existing[0].url);
                                                updateRule(index, 'redirect_condition', existing[0].condition);
                                              }
                                            }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="placeholder-help">
                                    <strong>Placeholders:</strong>
                                    <code>{'{click_id}'}</code>
                                    <code>{'{answer}'}</code>
                                    <code>{'{return_url}'}</code>
                                    <code>{'{session_id}'}</code>
                                  </div>

                                  {/* Resume + tab behaviour */}
                                  {rule.redirect_enabled && (
                                    <div className="exp-resume-block">
                                      <label className="checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={rule.allow_resume}
                                          onChange={(e) => updateRule(index, 'allow_resume', e.target.checked)}
                                        />
                                        <span>Allow user to return and continue the survey after redirect</span>
                                      </label>
                                      <div className="exp-tab-toggle-row">
                                        <span className="exp-tab-toggle-label">Open redirect in:</span>
                                        <div className="exp-tab-toggle-group">
                                          <button
                                            type="button"
                                            className={`exp-tab-toggle-btn ${rule.open_in_new_tab !== false ? 'active' : ''}`}
                                            onClick={() => updateRule(index, 'open_in_new_tab', true)}
                                          >
                                            New Tab (default)
                                          </button>
                                          <button
                                            type="button"
                                            className={`exp-tab-toggle-btn ${rule.open_in_new_tab === false ? 'active' : ''}`}
                                            onClick={() => updateRule(index, 'open_in_new_tab', false)}
                                          >
                                            Same Tab
                                          </button>
                                        </div>
                                      </div>
                                      {rule.open_in_new_tab === false && rule.allow_resume && (
                                        <div className="exp-return-url-preview">
                                          <p className="exp-return-url-title">
                                            🔗 Return URL
                                            <span className="exp-return-url-note-badge">example format — not a real link</span>
                                          </p>
                                          <div className="exp-return-url-code">
                                            <span className="exp-ru-muted">survey.pepperwahl.com</span>
                                            <span className="exp-ru-path">/survey/{surveyId}</span>
                                            <span className="exp-ru-param">?resume=</span>
                                            <span className="exp-ru-token">{'<token>'}</span>
                                            <span className="exp-ru-param">&q={index + 2}</span>
                                          </div>
                                          <p className="exp-return-url-help">
                                            When a user hits the redirect, the backend generates a real token and appends it as <code>?return_url=...</code> to your partner URL automatically.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* ── Single redirect for questions without options ── */
                                <>
                                  <div className="redirect-toggle">
                                    <label className="checkbox-label highlight">
                                      <input
                                        type="checkbox"
                                        checked={rule.redirect_enabled}
                                        onChange={(e) => updateRule(index, 'redirect_enabled', e.target.checked)}
                                      />
                                      Send user to an external URL after they answer this question
                                    </label>
                                  </div>

                                  {rule.redirect_enabled && (
                                    <div className="redirect-fields">
                                      <div className="field-row">
                                        <label>Redirect URL</label>
                                        <input
                                          type="text"
                                          value={rule.redirect_url || ''}
                                          onChange={(e) => updateRule(index, 'redirect_url', e.target.value)}
                                          placeholder="https://example.com/offer?click_id={click_id}&return_url={return_url}"
                                          className="url-input"
                                        />
                                      </div>
                                      <div className="placeholder-help">
                                        <strong>Placeholders:</strong>
                                        <code>{'{click_id}'}</code>
                                        <code>{'{answer}'}</code>
                                        <code>{'{return_url}'}</code>
                                        <code>{'{session_id}'}</code>
                                      </div>
                                      <div className="exp-resume-block">
                                        <label className="checkbox-label">
                                          <input
                                            type="checkbox"
                                            checked={rule.allow_resume}
                                            onChange={(e) => updateRule(index, 'allow_resume', e.target.checked)}
                                          />
                                          <span>Allow user to return and continue the survey after the redirect</span>
                                        </label>
                                        <div className="exp-tab-toggle-row">
                                          <span className="exp-tab-toggle-label">Open redirect in:</span>
                                          <div className="exp-tab-toggle-group">
                                            <button
                                              type="button"
                                              className={`exp-tab-toggle-btn ${rule.open_in_new_tab !== false ? 'active' : ''}`}
                                              onClick={() => updateRule(index, 'open_in_new_tab', true)}
                                            >New Tab (default)</button>
                                            <button
                                              type="button"
                                              className={`exp-tab-toggle-btn ${rule.open_in_new_tab === false ? 'active' : ''}`}
                                              onClick={() => updateRule(index, 'open_in_new_tab', false)}
                                            >Same Tab</button>
                                          </div>
                                        </div>
                                        {rule.open_in_new_tab === false && rule.allow_resume && (
                                          <div className="exp-return-url-preview">
                                            <p className="exp-return-url-title">
                                              🔗 Return URL
                                              <span className="exp-return-url-note-badge">example format — not a real link</span>
                                            </p>
                                            <div className="exp-return-url-code">
                                              <span className="exp-ru-muted">survey.pepperwahl.com</span>
                                              <span className="exp-ru-path">/survey/{surveyId}</span>
                                              <span className="exp-ru-param">?resume=</span>
                                              <span className="exp-ru-token">{'<token>'}</span>
                                              <span className="exp-ru-param">&q={index + 2}</span>
                                            </div>
                                            <p className="exp-return-url-help">
                                              When a user hits the redirect, the backend generates a real token and appends it as <code>?return_url=...</code> to your partner URL automatically.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* ─── CHAIN SURVEY TAB ───────────────────────────── */}
                          {(activeConfigTab[index] ?? 'redirect') === 'chain' && (
                            <div className="exp-tab-body">
                              <div className="exp-section-header exp-section-header--teal">
                                <Link size={16} />
                                <span>Link to another Pepperwahl survey after this question</span>
                              </div>

                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={rule.chain_survey_enabled}
                                  onChange={(e) => updateRule(index, 'chain_survey_enabled', e.target.checked)}
                                />
                                Enable survey chaining after this question
                              </label>

                              {rule.chain_survey_enabled && (
                                <div className="exp-chain-body">
                                  {/* Per-answer chaining (if question has options) */}
                                  {currentAnswerOptions.length > 0 ? (
                                    <div className="multi-redirect-section">
                                      <p className="multi-redirect-desc">
                                        Set a different survey for each answer, or leave blank to use one for all.
                                      </p>
                                      <div className="multi-redirect-rows">
                                        <div className="multi-redirect-row">
                                          <span className="multi-redirect-answer-badge always">Always</span>
                                          <SurveyUrlPicker
                                            value={rule.chain_survey_condition === 'always' && rule.chain_survey_url ? rule.chain_survey_url : ''}
                                            surveys={userSurveys}
                                            currentSurveyId={surveyId}
                                            placeholder="Select or paste survey URL for any answer"
                                            onChange={(val) => {
                                              updateRule(index, 'chain_survey_url', val || null);
                                              if (val) {
                                                updateRule(index, 'chain_survey_condition', 'always');
                                                updateRule(index, 'chain_survey_configs', []);
                                              }
                                            }}
                                          />
                                        </div>
                                        <div className="multi-redirect-divider">— or per answer —</div>
                                        {currentAnswerOptions.map((opt) => {
                                          const existing = (rule.chain_survey_configs || []).find(c => c.condition?.toLowerCase() === opt.toLowerCase());
                                          return (
                                            <div key={opt} className="multi-redirect-row">
                                              <span className="multi-redirect-answer-badge">{opt}</span>
                                              <SurveyUrlPicker
                                                value={existing?.url || ''}
                                                surveys={userSurveys}
                                                currentSurveyId={surveyId}
                                                placeholder={`Select survey when "${opt}"`}
                                                onChange={(val) => {
                                                  const existing2 = [...(rule.chain_survey_configs || [])];
                                                  const idx2 = existing2.findIndex(c => c.condition?.toLowerCase() === opt.toLowerCase());
                                                  if (val) {
                                                    const entry = { condition: opt, url: val, mode: rule.chain_survey_mode || 'ask' };
                                                    if (idx2 >= 0) existing2[idx2] = entry; else existing2.push(entry);
                                                    updateRule(index, 'chain_survey_enabled', existing2.length > 0 || !!rule.chain_survey_url);
                                                  } else {
                                                    if (idx2 >= 0) existing2.splice(idx2, 1);
                                                  }
                                                  updateRule(index, 'chain_survey_configs', existing2);
                                                  updateRule(index, 'chain_survey_enabled', existing2.length > 0 || !!rule.chain_survey_url);
                                                }}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="field-row">
                                      <label>Next Survey</label>
                                      <SurveyUrlPicker
                                        value={rule.chain_survey_url || ''}
                                        surveys={userSurveys}
                                        currentSurveyId={surveyId}
                                        placeholder="Select from your surveys or paste a URL"
                                        onChange={(val) => updateRule(index, 'chain_survey_url', val || null)}
                                      />
                                    </div>
                                  )}

                                  {/* Display mode */}
                                  <div className="field-row">
                                    <label>How to show the next survey:</label>
                                    <div className="exp-mode-buttons">
                                      {[
                                        { value: 'ask', label: '💬 Ask first (overlay)', desc: 'Show "Continue?" card' },
                                        { value: 'inline', label: '📋 Ask inline', desc: 'Replaces next question slot' },
                                        { value: 'direct', label: '⚡ Direct redirect', desc: 'Go straight, no prompt' },
                                      ].map(m => (
                                        <button
                                          key={m.value}
                                          type="button"
                                          className={`exp-mode-btn ${rule.chain_survey_mode === m.value ? 'active' : ''}`}
                                          onClick={() => {
                                            // Build updated rules with new mode and save immediately
                                            const updatedRules = rules.map((r, i) =>
                                              i === index ? { ...r, chain_survey_mode: m.value as 'ask' | 'inline' | 'direct' } : r
                                            );
                                            setRules(updatedRules);
                                            setHasChanges(true);
                                            // Save with the fresh rules immediately
                                            setTimeout(() => saveRules(updatedRules), 50);
                                          }}
                                        >
                                          {m.label}
                                          <span className="exp-mode-btn-desc">{m.desc}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Custom message (ask/inline modes) */}
                                  {rule.chain_survey_mode !== 'direct' && (
                                    <div className="field-row">
                                      <label>Prompt message shown to user:</label>
                                      <input
                                        type="text"
                                        className="url-input"
                                        value={rule.chain_survey_message || 'Another survey is waiting for you!'}
                                        onChange={(e) => updateRule(index, 'chain_survey_message', e.target.value)}
                                        placeholder="Another survey is waiting for you!"
                                      />
                                      <div className="exp-btn-label-row">
                                        <input
                                          type="text"
                                          className="url-input"
                                          value={rule.chain_survey_yes_label || 'Continue'}
                                          onChange={(e) => updateRule(index, 'chain_survey_yes_label', e.target.value)}
                                          placeholder="Yes button label"
                                        />
                                        <input
                                          type="text"
                                          className="url-input"
                                          value={rule.chain_survey_no_label || 'No thanks'}
                                          onChange={(e) => updateRule(index, 'chain_survey_no_label', e.target.value)}
                                          placeholder="No button label"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ─── END SURVEY TAB ─────────────────────────────── */}
                          {(activeConfigTab[index] ?? 'redirect') === 'end' && (
                            <div className="exp-tab-body">
                              <div className="exp-section-header exp-section-header--red">
                                <StopCircle size={16} />
                                <span>End the survey after this question</span>
                              </div>

                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={rule.end_here_enabled}
                                  onChange={(e) => updateRule(index, 'end_here_enabled', e.target.checked)}
                                />
                                Stop the survey here (don't show any more questions)
                              </label>

                              {rule.end_here_enabled && (
                                <div className="field-row exp-end-condition">
                                  <label>End when answer is:</label>
                                  {currentAnswerOptions.length > 0 ? (
                                    <select
                                      value={rule.end_here_condition || 'always'}
                                      onChange={(e) => updateRule(index, 'end_here_condition', e.target.value)}
                                      className="sbr-select"
                                    >
                                      <option value="always">Any answer (always end here)</option>
                                      {currentAnswerOptions.map((opt) => (
                                        <option key={opt} value={opt}>Only if answer is "{opt}"</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <>
                                      <input
                                        type="text"
                                        value={rule.end_here_condition === 'always' ? '' : (rule.end_here_condition || '')}
                                        onChange={(e) => updateRule(index, 'end_here_condition', e.target.value || 'always')}
                                        placeholder="Type a specific answer (leave blank = always end)"
                                        className="url-input"
                                      />
                                      <span className="exp-end-hint">
                                        Leave blank to always end, or type the exact answer value that should trigger the end
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ─── MULTI LAYER TAB ─────────────────────────── */}
                          {(activeConfigTab[index] ?? 'redirect') === 'passfail' && (() => {
                            const LAYER_TYPES = [
                              { type: 'result_page', variant: 'pass' as const, label: 'Pass Page', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✓' },
                              { type: 'result_page', variant: 'fail' as const, label: 'Fail Page', color: '#dc2626', bg: '#fff5f5', border: '#fecaca', icon: '✗' },
                              { type: 'spinner', variant: undefined, label: 'Spinner', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: '⟳' },
                              { type: 'chain_survey', variant: undefined, label: 'Chain Survey', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', icon: '→' },
                              { type: 'end_survey', variant: undefined, label: 'End Survey', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '⊙' },
                            ] as const;
                            const getLayerDef = (layer: any) => LAYER_TYPES.find(t => t.type === layer.type && (t.type !== 'result_page' || t.variant === layer.variant)) || LAYER_TYPES[0];
                            const getLayerSummary = (layer: any) => { if (layer.type==='result_page') return layer.title||(layer.variant==='pass'?'You qualify!':'Not this time'); if (layer.type==='spinner') return layer.text||'Verifying...'; if (layer.type==='chain_survey') return layer.chain_mode==='direct'?'Direct → survey':layer.chain_message||'Another survey waiting'; return 'Survey ends here'; };
                            const layers = rule.layers || [];
                            const expandedLi = expandedLayerIdx[index] ?? null;
                            return (
                              <div className="exp-tab-body">
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                                  <span style={{fontSize:12,fontWeight:700,color:'#6d28d9'}}>◈ Layer Sequence</span>
                                  <span style={{fontSize:11,color:'#94a3b8'}}>{layers.length===0?'No layers':`${layers.length} layer${layers.length>1?'s':''}`} — runs in order after answer</span>
                                </div>
                                {layers.length > 0 && (
                                  <div className="ml-flow">
                                    <div className="ml-flow-start"><div className="ml-flow-start-dot"/><span>Answer</span></div>
                                    {layers.map((layer: any, li: number) => {
                                      const def = getLayerDef(layer);
                                      const isOpen = expandedLi === li;
                                      return (
                                        <div key={li} className="ml-flow-item">
                                          <div className="ml-flow-connector"><div className="ml-flow-line"/><div className="ml-flow-arrow"/></div>
                                          <div className="ml-layer-card" style={{borderColor:def.border,background:isOpen?def.bg:'#fff'}}>
                                            <div className="ml-layer-header" onClick={()=>setExpandedLayerIdx(prev=>({...prev,[index]:isOpen?null:li}))}>
                                              <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                                                <span className="ml-layer-chip" style={{background:def.bg,color:def.color,borderColor:def.border}}>
                                                  <span style={{fontWeight:800,marginRight:3}}>{def.icon}</span>{def.label}
                                                </span>
                                                <span className="ml-layer-summary">{getLayerSummary(layer)}</span>
                                                {layer.condition!=='always'&&<span className="ml-layer-cond-badge">if "{layer.condition}"</span>}
                                              </div>
                                              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                                                <span style={{fontSize:9,color:'#94a3b8',display:'inline-block',transition:'transform 0.15s',transform:isOpen?'rotate(180deg)':'none'}}>▼</span>
                                                <button type="button" onClick={(e)=>{e.stopPropagation();const u=[...layers];u.splice(li,1);updateRule(index,'layers',u);}} className="ml-delete-btn">×</button>
                                              </div>
                                            </div>
                                            {isOpen&&(
                                              <div className="ml-layer-fields">
                                                {/* Condition selector only on the FIRST layer.
                                                    Layers 2+ always run after the previous layer — no answer check needed. */}
                                                {li === 0 && currentAnswerOptions.length > 0 && (
                                                  <div className="field-row">
                                                    <label>Trigger when answer is:</label>
                                                    <select className="sbr-select" value={layer.condition||'always'} onChange={(e)=>{const u=[...layers];u[li]={...u[li],condition:e.target.value};updateRule(index,'layers',u);}}>
                                                      <option value="always">Any answer</option>
                                                      {currentAnswerOptions.map(opt=><option key={opt} value={opt}>Only if "{opt}"</option>)}
                                                    </select>
                                                  </div>
                                                )}
                                                {li > 0 && (
                                                  <p style={{margin:'0 0 8px',fontSize:11,color:'#6366f1',background:'#eef2ff',padding:'6px 10px',borderRadius:6}}>
                                                    ↳ Runs automatically after the previous layer completes
                                                  </p>
                                                )}
                                                {layer.type==='result_page'&&(<>
                                                  <div className="field-row"><label>Title</label><input type="text" className="url-input" value={layer.title||''} onChange={(e)=>{const u=[...layers];u[li]={...u[li],title:e.target.value};updateRule(index,'layers',u);}} placeholder={layer.variant==='pass'?'You qualify!':'Not this time'}/></div>
                                                  <div className="field-row"><label>Subtitle</label><input type="text" className="url-input" value={layer.subtitle||''} onChange={(e)=>{const u=[...layers];u[li]={...u[li],subtitle:e.target.value};updateRule(index,'layers',u);}} placeholder={layer.variant==='pass'?'You meet all requirements.':"You don't meet the criteria."}/></div>
                                                  <div className="field-row"><label>Button label</label><input type="text" className="url-input" value={layer.cta_text||''} style={{maxWidth:180}} onChange={(e)=>{const u=[...layers];u[li]={...u[li],cta_text:e.target.value};updateRule(index,'layers',u);}} placeholder="Continue"/></div>
                                                </>)}
                                                {layer.type==='spinner'&&(
                                                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                                                    <div className="field-row" style={{flex:1,minWidth:140}}><label>Text shown</label><input type="text" className="url-input" value={layer.text||''} onChange={(e)=>{const u=[...layers];u[li]={...u[li],text:e.target.value};updateRule(index,'layers',u);}} placeholder="Verifying..."/></div>
                                                    <div className="field-row" style={{width:90}}><label>Duration (s)</label><input type="number" className="url-input" min={1} max={30} value={layer.duration??3} onChange={(e)=>{const u=[...layers];u[li]={...u[li],duration:Number(e.target.value)};updateRule(index,'layers',u);}}/></div>
                                                  </div>
                                                )}
                                                {layer.type==='chain_survey'&&(
                                                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                                    <div className="field-row"><label>Survey URL</label><SurveyUrlPicker value={layer.survey_url||''} surveys={userSurveys} currentSurveyId={surveyId} placeholder="Select or paste survey URL" onChange={(val)=>{const u=[...layers];u[li]={...u[li],survey_url:val};updateRule(index,'layers',u);}}/></div>
                                                    <div style={{display:'flex',gap:6}}>
                                                      {[{v:'ask',l:'Ask first'},{v:'direct',l:'Direct'}].map(m=>(
                                                        <button key={m.v} type="button" className={`exp-mode-btn ${(layer.chain_mode||'ask')===m.v?'active':''}`} style={{flex:1}} onClick={()=>{const u=[...layers];u[li]={...u[li],chain_mode:m.v};updateRule(index,'layers',u);}}>
                                                          {m.l}<span className="exp-mode-btn-desc">{m.v==='ask'?'Show Yes/No prompt':'Go straight'}</span>
                                                        </button>
                                                      ))}
                                                    </div>
                                                    {(layer.chain_mode||'ask')!=='direct'&&(<>
                                                      <div className="field-row"><label>Prompt message</label><input type="text" className="url-input" value={layer.chain_message||''} onChange={(e)=>{const u=[...layers];u[li]={...u[li],chain_message:e.target.value};updateRule(index,'layers',u);}} placeholder="Another survey is waiting!"/></div>
                                                      <div style={{display:'flex',gap:8}}>
                                                        <input type="text" className="url-input" value={layer.chain_yes_label||''} onChange={(e)=>{const u=[...layers];u[li]={...u[li],chain_yes_label:e.target.value};updateRule(index,'layers',u);}} placeholder="Yes (Continue)"/>
                                                        <input type="text" className="url-input" value={layer.chain_no_label||''} onChange={(e)=>{const u=[...layers];u[li]={...u[li],chain_no_label:e.target.value};updateRule(index,'layers',u);}} placeholder="No (No thanks)"/>
                                                      </div>
                                                    </>)}
                                                  </div>
                                                )}
                                                {layer.type==='end_survey'&&(<p style={{margin:0,fontSize:11,color:'#7c3aed',background:'#f5f3ff',padding:'8px 10px',borderRadius:6}}>Survey terminates here. No further layers or questions will run.</p>)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div className="ml-flow-connector"><div className="ml-flow-line"/><div className="ml-flow-arrow"/></div>
                                    <div className="ml-flow-end"><div className="ml-flow-end-dot"/><span>Next Question</span></div>
                                  </div>
                                )}
                                <div className="ml-add-row">
                                  <span className="ml-add-label">+ Add Layer</span>
                                  <div className="ml-add-chips">
                                    {LAYER_TYPES.map(t=>(
                                      <button key={`${t.type}-${t.variant||''}`} type="button" className="ml-add-chip" style={{'--chip-color':t.color,'--chip-bg':t.bg,'--chip-border':t.border} as any}
                                        onClick={()=>{
                                          const nl: any={type:t.type,condition:'always'};
                                          if(t.type==='result_page'){nl.variant=t.variant;nl.title='';nl.subtitle='';nl.cta_text='Continue';}
                                          if(t.type==='spinner'){nl.text='Verifying...';nl.duration=3;}
                                          if(t.type==='chain_survey'){nl.survey_url='';nl.chain_mode='ask';nl.chain_message='Another survey is waiting!';nl.chain_yes_label='Continue';nl.chain_no_label='No thanks';}
                                          updateRule(index,'layers',[...layers,nl]);
                                          setExpandedLayerIdx(prev=>({...prev,[index]:layers.length}));
                                        }}
                                      ><span style={{marginRight:4}}>{t.icon}</span>{t.label}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="sbr-summary">
        <div className="summary-item">
          <span className="summary-count">{rules.length}</span>
          <span className="summary-label">Total Questions</span>
        </div>
        <div className="summary-item">
          <span className="summary-count">{rules.filter(r => r.always_show).length}</span>
          <span className="summary-label">Always Shown</span>
        </div>
        <div className="summary-item">
          <span className="summary-count">{rules.filter(r => !r.always_show && r.depends_on).length}</span>
          <span className="summary-label">Conditional</span>
        </div>
        <div className="summary-item">
          <span className="summary-count redirect-count">{rules.filter(r => r.redirect_enabled).length}</span>
          <span className="summary-label">With Redirects</span>
        </div>
      </div>

      {hasChanges && (
        <div className="sbr-unsaved-warning">
          <AlertCircle size={16} />
          You have unsaved changes
        </div>
      )}
    </div>
  );
};

export default SimpleBranchingRules;
