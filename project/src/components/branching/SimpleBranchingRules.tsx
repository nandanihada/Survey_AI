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
  // Pass/Fail page
  pass_fail_enabled: boolean;
  pass_fail_type: 'pass' | 'fail' | null;
  pass_fail_condition: string; // 'always' | answer value
  pass_fail_title: string;
  pass_fail_message: string;
  pass_fail_icon: string; // emoji
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
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<Record<number, 'redirect' | 'chain' | 'end' | 'passfail'>>({});
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
          // Try fallback without auth header — some tokens may be stale
          const res2 = await fetch(`${baseUrl}/api/surveys/public`);
          if (!res2.ok) return;
          const data2 = await res2.json();
          const list2 = (data2.surveys || data2 || []).map((s: any) => {
            const sid = s.short_id || s.id || s._id;
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const frontendBase = isLocal ? 'http://localhost:5173' : 'https://survey.pepperwahl.com';
            return { id: sid, title: s.title || s.prompt?.slice(0, 40) || `Survey ${sid}`, url: `${frontendBase}/survey/${sid}` };
          });
          setUserSurveys(list2);
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
      const response = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules`);
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
          pass_fail_enabled: r.pass_fail_enabled || false,
          pass_fail_type: r.pass_fail_type || null,
          pass_fail_condition: r.pass_fail_condition || 'always',
          pass_fail_title: r.pass_fail_title || '',
          pass_fail_message: r.pass_fail_message || '',
          pass_fail_icon: r.pass_fail_icon || '',
        }));
        setRules(rulesWithRedirect);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, surveyId]);

  useEffect(() => {
    if (surveyId) fetchRules();
  }, [surveyId, fetchRules]);

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
      const response = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: data })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Branching rules saved!' });
        setHasChanges(false);
        onRulesSaved?.();  // notify parent to refresh flow diagram
      } else {
        setMessage({ type: 'error', text: 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
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
        fetch(`${baseUrl}/api/surveys/${surveyId}/branching-rules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
          pass_fail_enabled: r.pass_fail_enabled || false,
          pass_fail_type: r.pass_fail_type || null,
          pass_fail_condition: r.pass_fail_condition || 'always',
          pass_fail_title: r.pass_fail_title || '',
          pass_fail_message: r.pass_fail_message || '',
          pass_fail_icon: r.pass_fail_icon || '',
        }));
        setRules(rulesWithRedirect);
        setHasChanges(true);
        setMessage({ type: 'success', text: 'AI suggestions applied! Review and save.' });
      } else {
        setMessage({ type: 'error', text: 'AI suggestion failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
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
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
                              🏆 Pass / Fail
                              {rule.pass_fail_enabled && <span className="exp-tab-dot" style={{ background: '#f59e0b' }} />}
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

                          {/* ─── PASS/FAIL TAB ─────────────────────────────── */}
                          {(activeConfigTab[index] ?? 'redirect') === 'passfail' && (
                            <div className="exp-tab-body">
                              <div className="exp-section-header" style={{ background: '#fffbeb', color: '#92400e', borderLeft: '3px solid #f59e0b' }}>
                                🏆 Show a Pass or Fail result page after this question
                              </div>

                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={rule.pass_fail_enabled}
                                  onChange={(e) => updateRule(index, 'pass_fail_enabled', e.target.checked)}
                                />
                                Show a result page after this question
                              </label>

                              {rule.pass_fail_enabled && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {/* Pass or Fail type */}
                                  <div className="field-row">
                                    <label>Page type:</label>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                      {[
                                        { value: 'pass', label: '✅ Pass', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
                                        { value: 'fail', label: '❌ Fail', color: '#dc2626', bg: '#fff5f5', border: '#fecaca' },
                                      ].map(t => (
                                        <button
                                          key={t.value}
                                          type="button"
                                          onClick={() => updateRule(index, 'pass_fail_type', t.value)}
                                          style={{
                                            flex: 1, padding: '8px 14px', borderRadius: 8, border: `1.5px solid`,
                                            cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                            borderColor: rule.pass_fail_type === t.value ? t.border : '#e2e8f0',
                                            background: rule.pass_fail_type === t.value ? t.bg : '#f8fafc',
                                            color: rule.pass_fail_type === t.value ? t.color : '#64748b',
                                          }}
                                        >
                                          {t.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Condition */}
                                  {currentAnswerOptions.length > 0 && (
                                    <div className="field-row">
                                      <label>Show when answer is:</label>
                                      <select
                                        value={rule.pass_fail_condition || 'always'}
                                        onChange={(e) => updateRule(index, 'pass_fail_condition', e.target.value)}
                                        className="sbr-select"
                                      >
                                        <option value="always">Any answer</option>
                                        {currentAnswerOptions.map(opt => (
                                          <option key={opt} value={opt}>Only if answer is "{opt}"</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {/* Title */}
                                  <div className="field-row">
                                    <label>Title (e.g. "Congratulations!" or "Sorry, you didn't qualify")</label>
                                    <input
                                      type="text"
                                      className="url-input"
                                      value={rule.pass_fail_title || ''}
                                      onChange={(e) => updateRule(index, 'pass_fail_title', e.target.value)}
                                      placeholder={rule.pass_fail_type === 'fail' ? 'Sorry, you didn\'t qualify' : 'Congratulations!'}
                                    />
                                  </div>

                                  {/* Message */}
                                  <div className="field-row">
                                    <label>Message</label>
                                    <input
                                      type="text"
                                      className="url-input"
                                      value={rule.pass_fail_message || ''}
                                      onChange={(e) => updateRule(index, 'pass_fail_message', e.target.value)}
                                      placeholder={rule.pass_fail_type === 'fail' ? 'Unfortunately you don\'t meet the criteria.' : 'You meet all the requirements!'}
                                    />
                                  </div>

                                  {/* Icon */}
                                  <div className="field-row">
                                    <label>Icon emoji (optional)</label>
                                    <input
                                      type="text"
                                      className="url-input"
                                      value={rule.pass_fail_icon || ''}
                                      onChange={(e) => updateRule(index, 'pass_fail_icon', e.target.value)}
                                      placeholder={rule.pass_fail_type === 'fail' ? '❌' : '✅'}
                                      style={{ maxWidth: 80 }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

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
