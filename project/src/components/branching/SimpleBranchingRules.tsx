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
  AlertCircle, Check, HelpCircle, ExternalLink, Link, ChevronDown, ChevronUp
} from 'lucide-react';
import './SimpleBranchingRules.css';

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
  // End here settings
  end_here_enabled: boolean;
  end_here_condition: string;  // 'always' or specific answer value
}

interface Props {
  surveyId: string;
  onClose?: () => void;
  onRulesSaved?: () => void;  // Called after successful save — triggers flow diagram refresh
}

const SimpleBranchingRules: React.FC<Props> = ({ surveyId, onClose, onRulesSaved }) => {
  const baseUrl = getApiBaseUrl();
  
  const [rules, setRules] = useState<BranchingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const rulesRef = React.useRef<BranchingRule[]>([]);

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
          end_here_enabled: r.end_here_enabled || false,
          end_here_condition: r.end_here_condition || 'always'
        }));
        setRules(rulesWithRedirect);
      } else {
        setMessage({ type: 'error', text: 'Failed to load branching rules' });
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
          end_here_condition: r.end_here_condition || 'always'
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
                  <tr className={`${rule.always_show ? 'always-show' : 'conditional'} ${isExpanded ? 'expanded' : ''}`}>
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
                  
                  {/* Expanded Row - Redirect Configuration */}
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan={8}>
                        <div className="redirect-config-panel">
                          <div className="redirect-header">
                            <Link size={18} />
                            <h4>Redirect After This Question</h4>
                          </div>
                          
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

                              {/* URL input */}
                              <div className="field-row">
                                <label>Redirect URL <span style={{color:'#94a3b8',fontWeight:400}}>(where to send the user)</span></label>
                                <input
                                  type="text"
                                  value={rule.redirect_url || ''}
                                  onChange={(e) => updateRule(index, 'redirect_url', e.target.value)}
                                  placeholder="https://moustache.com/offer?click_id={click_id}&return_url={return_url}"
                                  className="url-input"
                                />
                              </div>

                              {/* Color picker */}
                              <div className="field-row field-row-inline">
                                <label>Node color in flow diagram:</label>
                                <div className="color-picker-row">
                                  {['#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#10b981','#3b82f6','#f97316'].map(c => (
                                    <button
                                      key={c}
                                      className={`color-swatch ${rule.redirect_color === c ? 'selected' : ''}`}
                                      style={{ background: c }}
                                      onClick={() => updateRule(index, 'redirect_color', c)}
                                      title={c}
                                    />
                                  ))}
                                  <input
                                    type="color"
                                    value={rule.redirect_color || '#f59e0b'}
                                    onChange={(e) => updateRule(index, 'redirect_color', e.target.value)}
                                    className="color-input-custom"
                                    title="Custom color"
                                  />
                                </div>
                              </div>

                              {/* Placeholders */}
                              <div className="placeholder-help">
                                <strong>Placeholders (auto-filled per user):</strong>
                                <code title="User's tracking ID">{'{click_id}'}</code>
                                <code title="User's answer to this question">{'{answer}'}</code>
                                <code title="The return link — put this in your URL so the partner page can show a Continue button">{'{return_url}'}</code>
                                <code title="Session ID">{'{session_id}'}</code>
                              </div>

                              {/* Redirect condition */}
                              {currentAnswerOptions.length > 0 && (
                                <div className="field-row">
                                  <label>Redirect when answer is:</label>
                                  <select
                                    value={rule.redirect_condition || 'always'}
                                    onChange={(e) => updateRule(index, 'redirect_condition', e.target.value)}
                                    className="sbr-select"
                                  >
                                    <option value="always">Any answer (always redirect)</option>
                                    {currentAnswerOptions.map((opt) => (
                                      <option key={opt} value={opt}>Only if answer is "{opt}"</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Resume / return link section */}
                              <div className="resume-section">
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={rule.allow_resume}
                                    onChange={(e) => updateRule(index, 'allow_resume', e.target.checked)}
                                  />
                                  <span>Allow user to return and continue the survey after the redirect</span>
                                </label>

                                {rule.allow_resume && (
                                  <div className="resume-explanation">
                                    <div className="resume-how-row">
                                      <span className="resume-step">1</span>
                                      <span>When the user is redirected, a unique <strong>return link</strong> is automatically added to your redirect URL as the <code>{'{return_url}'}</code> value.</span>
                                    </div>
                                    <div className="resume-how-row">
                                      <span className="resume-step">2</span>
                                      <span>The partner page (e.g. Moustache) reads <code>return_url</code> from the URL and shows a <strong>"Continue Survey"</strong> button to the user.</span>
                                    </div>
                                    <div className="resume-how-row">
                                      <span className="resume-step">3</span>
                                      <span>User clicks it → lands back on the next question with all previous answers saved.</span>
                                    </div>

                                    <div className="resume-url-example">
                                      <div className="resume-url-label">
                                        <strong>What the return link looks like (per user, generated at runtime):</strong>
                                      </div>
                                      <code className="resume-url-value">
                                        https://survey.pepperwahl.com/survey/{surveyId}?resume=TOKEN&q={index + 2}
                                      </code>
                                      <p className="resume-url-note">
                                        ⚠️ This link is unique per user and only generated when they actually take the survey — you cannot use it at setup time. Add <code>{'{return_url}'}</code> to your redirect URL above and it gets filled in automatically.
                                      </p>
                                    </div>

                                    <div className="resume-expiry-row">
                                      <span>⏱️ Return link expires after:</span>
                                      <select
                                        value={rule.resume_expiry_hours || 24}
                                        onChange={(e) => updateRule(index, 'resume_expiry_hours', Number(e.target.value))}
                                        className="sbr-select expiry-select"
                                      >
                                        <option value={1}>1 hour</option>
                                        <option value={6}>6 hours</option>
                                        <option value={24}>24 hours</option>
                                        <option value={72}>3 days</option>
                                        <option value={168}>7 days</option>
                                        <option value={720}>30 days</option>
                                        <option value={0}>Never expires</option>
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}

                          {/* ── End Survey Here section ── */}
                          <div className="end-here-section">
                            <div className="end-here-header">
                              <span className="end-here-icon">🛑</span>
                              <span className="end-here-title">End Survey After This Question</span>
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
                              <div className="field-row" style={{ marginTop: 10 }}>
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
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <input
                                      type="text"
                                      value={rule.end_here_condition === 'always' ? '' : (rule.end_here_condition || '')}
                                      onChange={(e) => updateRule(index, 'end_here_condition', e.target.value || 'always')}
                                      placeholder="Type a specific answer (leave blank = always end)"
                                      className="url-input"
                                      style={{ fontSize: '0.82rem' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                      Leave blank to always end, or type the exact answer value that should trigger the end
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
