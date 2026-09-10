/**
 * FunnelList — Funnel Surveys subtab
 * Fixes: correct edit route, open funnel stays in funnel tab,
 *        scoring/questions panels populated, question type rendering fixed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers, Plus, ChevronDown, ChevronRight, ExternalLink, Search, Calendar,
  Settings, BarChart3, Copy, Loader2, AlertCircle, ChevronLeft,
  Filter, Target, GitBranch, Edit3, Check, X, Trash2,
  ArrowRight, RefreshCw, Eye, Link2, Zap, Info, Sparkles,
  Star, Tag, Folder, Copy as CopyIcon, GitFork, Shuffle, Shield
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';
import { useAuth } from '../contexts/AuthContext';
import FunnelCreator from './FunnelCreator';

// ─── Types ────────────────────────────────────────────────

interface OptionScore { [jobId: string]: number }

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
  funnel_role?: string;
  screening_rule?: {
    enabled: boolean;
    fail_condition: string;
    fail_value: string;
    fail_reason?: string;
  } | null;
  option_scores?: Record<string, OptionScore>;
}

interface SurveyDetail {
  id: string;
  title: string;
  questions: Question[];
  funnel_role?: string;
}

interface GeneratedSurvey {
  type: 'screening' | 'job';
  index?: number;
  job_id?: string;
  survey_id: string;
  name: string;
  question_count: number;
  is_router?: boolean;
}

interface Funnel {
  funnel_id: string;
  name: string;
  goal: string;
  status: string;
  created_at: string;
  total_surveys: number;
  fallback_url?: string;
  /** New: favourited by user */
  is_favourite?: boolean;
  /** New: exclusive folder */
  folder?: 'live' | 'client' | 'drafts' | 'archive' | null;
  /** New: tags list */
  tags?: string[];
  /** New: sent indicator — fielded journey */
  is_sent?: boolean;
  /** New: parent journey id for clone lineage */
  parent_funnel_id?: string | null;
  generated_surveys: GeneratedSurvey[];
  screening_surveys: Array<{ survey_id: string; name: string; index: number }>;
  anchor_config?: {
    enabled: boolean;
    question_text: string;
    options: string[];
    correct_answers: string[];
    redirect_url: string;
  } | null;
  router_survey_ids?: string[];
  job_surveys: Record<string, {
    survey_id: string;
    display_name: string;
    redirect_url: string;
    redirect_rules?: Array<{ operator: string; threshold: number; url: string; label: string }>;
    pass_criteria: string;
    transition_page: {
      enabled: boolean;
      heading: string;
      message: string;
      cta_text: string;
      auto_redirect_seconds: number;
    };
  }>;
}

// ─── Threshold Redirect Rules Component ──────────────────

// ─── Regenerate Screening Button ─────────────────────────
const RegenerateScreeningButton: React.FC<{
  funnelId: string;
  apiBase: string;
  authHeaders: () => Record<string, string>;
  onRefresh: () => void;
  compact?: boolean;
}> = ({ funnelId, apiBase, authHeaders, onRefresh, compact }) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnelId}/regenerate-screening`, {
        method: 'POST', headers: authHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Generated ${data.generated} screening survey${data.generated !== 1 ? 's' : ''}! Refreshing...`);
        onRefresh();
      } else {
        const msg = data.error || data.details?.join(', ') || 'Unknown error';
        alert('Failed to regenerate: ' + msg);
      }
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 font-medium disabled:opacity-60"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {loading ? 'Regenerating...' : 'Fix missing surveys'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium disabled:opacity-60 flex items-center gap-1.5"
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
      {loading ? 'Regenerating screening surveys...' : 'Regenerate screening surveys'}
    </button>
  );
};

const OPERATORS = ['>=', '>', '<=', '<', '=='];

const ThresholdRedirectRules: React.FC<{
  jobId: string;
  jobCfg: any;
  isDarkMode: boolean;
  inputClass: string;
  textMuted: string;
  textMain: string;
  onSave: (jobId: string, patch: any) => Promise<void>;
  saving: boolean;
}> = ({ jobId, jobCfg, isDarkMode, inputClass, textMuted, textMain, onSave, saving }) => {
  const existing = jobCfg.redirect_rules || (jobCfg.redirect_url ? [{ operator: '>=', threshold: 0, url: jobCfg.redirect_url, label: 'Default' }] : []);
  const [rules, setRules] = useState<Array<{ operator: string; threshold: number; url: string; label: string }>>(existing);
  const [editing, setEditing] = useState(false);

  const addRule = () => setRules(r => [...r, { operator: '>=', threshold: 70, url: '', label: 'Good match' }]);
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, field: string, val: string | number) =>
    setRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: val } : rule));

  const save = async () => {
    await onSave(jobId, { redirect_rules: rules, redirect_url: rules[0]?.url || '' });
    setEditing(false);
  };

  const borderCol = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const rowBg = isDarkMode ? 'bg-gray-750' : 'bg-gray-50';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-xs font-medium ${textMuted}`}>Redirect on pass (score-based)</p>
        <button
          onClick={() => setEditing(e => !e)}
          className={`text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
        >
          {editing ? 'Cancel' : rules.length > 0 ? <><Edit3 size={10} className="inline mr-0.5" />Edit rules</> : '+ Add rules'}
        </button>
      </div>

      {/* Show current rules (read mode) */}
      {!editing && rules.length > 0 && (
        <div className={`rounded-lg border overflow-hidden ${borderCol}`}>
          {rules.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b last:border-b-0 ${borderCol} ${rowBg}`}>
              <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                score {r.operator} {r.threshold}%
              </span>
              <span className={`flex-1 truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{r.url || '(no URL)'}</span>
              {r.label && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{r.label}</span>}
            </div>
          ))}
        </div>
      )}

      {!editing && rules.length === 0 && (
        <p className={`text-xs ${textMuted}`}>(not set — click to add)</p>
      )}

      {/* Edit mode */}
      {editing && (
        <div className={`rounded-xl border p-3 space-y-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Explanation */}
          <div className={`rounded-lg p-2 text-[10px] leading-relaxed ${isDarkMode ? 'bg-blue-950/40 border border-blue-800/40 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            <p className="font-semibold mb-0.5">How the score works</p>
            <p>After a user completes this survey, the AI evaluates their answers and gives a <strong>confidence score (0–100%)</strong> — how well they match this destination.</p>
            <p className="mt-1">Example: score ≥ 80% → strong match → send to fast-track URL. Score &lt; 50% → weak match → send to waitlist URL.</p>
            <p className="mt-1">Rules are checked <strong>in order</strong>. First match wins. If no rule matches, the user goes to the fallback URL.</p>
          </div>
          {rules.map((r, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded-lg border p-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <span className={`text-[10px] ${textMuted} shrink-0`}>If score</span>
              <select
                value={r.operator}
                onChange={e => updateRule(i, 'operator', e.target.value)}
                className={`text-xs rounded px-1 py-0.5 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <input
                type="number" min={0} max={100}
                value={r.threshold}
                onChange={e => updateRule(i, 'threshold', parseInt(e.target.value) || 0)}
                className={`w-12 text-xs rounded px-1 py-0.5 border text-center ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
              <span className={`text-[10px] ${textMuted} shrink-0`}>%  →</span>
              <input
                value={r.url}
                onChange={e => updateRule(i, 'url', e.target.value)}
                placeholder="https://yoursite.com/..."
                className={`flex-1 text-xs rounded px-2 py-0.5 border min-w-0 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 placeholder-gray-400'}`}
              />
              <input
                value={r.label}
                onChange={e => updateRule(i, 'label', e.target.value)}
                placeholder="Label e.g. Strong match"
                className={`w-24 text-xs rounded px-2 py-0.5 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 placeholder-gray-400'}`}
              />
              <button onClick={() => removeRule(i)} className="text-red-400 hover:text-red-500 shrink-0"><X size={12} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={addRule} className={`text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              + Add rule
            </button>
            <button onClick={save} className={`text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white ${saving ? 'opacity-60' : ''}`}>
              {saving ? <Loader2 size={11} className="animate-spin inline mr-1" /> : null}
              Save
            </button>
            <button onClick={() => setEditing(false)} className={`text-xs px-2 py-1.5 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface Props {
  isDarkMode?: boolean;
  onCreateNew?: () => void;
}

// ─── Scoring Details Panel ────────────────────────────────

const ScoringDetailsPanel: React.FC<{ funnel: Funnel; isDarkMode: boolean; apiBase: string; authHeaders: () => Record<string,string> }> = ({ funnel, isDarkMode, apiBase, authHeaders }) => {
  const [surveys, setSurveys] = useState<SurveyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{surveyId:string; qId:string; option:string; jobId:string} | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const jobIds = Object.keys(funnel.job_surveys || {});

  const fetchAll = async () => {
    setLoading(true);
    const results: SurveyDetail[] = [];
    for (const s of funnel.generated_surveys.filter(s => s.type === 'screening')) {
      try {
        const res = await fetch(`${apiBase}/api/surveys/${s.survey_id}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          results.push({ id: s.survey_id, title: s.name, questions: data.questions || [] });
        }
      } catch {}
    }
    setSurveys(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [funnel.funnel_id]);

  const generateScoring = async () => {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      // Kick off background job — returns immediately with a job_id
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/regenerate-scoring`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();

      if (data.error) {
        setGenerateMsg({ type: 'error', text: data.error });
        setGenerating(false);
        return;
      }

      const jobId = data.job_id;
      setGenerateMsg({ type: 'success', text: 'Scoring generation started — this may take 1–2 minutes for large funnels…' });

      // Poll every 3 seconds until done or error
      const poll = async () => {
        try {
          const pollRes = await fetch(
            `${apiBase}/api/funnels/${funnel.funnel_id}/scoring-job/${jobId}`,
            { headers: authHeaders() }
          );
          const pollData = await pollRes.json();

          if (pollData.status === 'done') {
            setGenerateMsg({ type: 'success', text: `Scoring generated — ${pollData.entries_applied} entries applied across ${pollData.surveys_updated} survey(s). Refreshing…` });
            await fetchAll();
            setGenerating(false);
            setTimeout(() => setGenerateMsg(null), 5000);
          } else if (pollData.status === 'error') {
            setGenerateMsg({ type: 'error', text: pollData.error || 'Generation failed. Please try again.' });
            setGenerating(false);
          } else {
            // Still running — poll again in 3 s
            setTimeout(poll, 3000);
          }
        } catch {
          setGenerateMsg({ type: 'error', text: 'Lost connection while waiting for scoring. Refresh the page to check if it completed.' });
          setGenerating(false);
        }
      };

      setTimeout(poll, 3000);

    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: `Network error: ${String(e).slice(0, 120)}` });
      setGenerating(false);
    }
  };

  const saveScore = async (surveyId: string, qId: string, option: string, jobId: string, val: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/update-score`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ survey_id: surveyId, question_id: qId, option, job_id: jobId, points: val })
      });
      if (res.ok) {
        setSurveys(prev => prev.map(sv => {
          if (sv.id !== surveyId) return sv;
          return {
            ...sv,
            questions: sv.questions.map(q => {
              if (q.id !== qId) return q;
              const scores = { ...(q.option_scores || {}) };
              scores[option] = { ...(scores[option] || {}), [jobId]: val };
              return { ...q, option_scores: scores };
            })
          };
        }));
      }
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const borderCol = isDarkMode ? 'border-gray-700' : 'border-gray-200';

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Info + Color Legend + Generate Scoring button */}
      <div className={`rounded-xl border p-3 text-xs ${isDarkMode ? 'bg-blue-950/30 border-blue-800/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span><Info size={12} className="inline mr-1" />Points per answer per destination. Click any cell to edit.</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Signal strength:</span>
            {[
              { label: 'Highest (5)', bg: 'bg-green-600', text: 'text-white' },
              { label: 'High (3-4)', bg: 'bg-green-200', text: 'text-green-800' },
              { label: 'Mid (2)', bg: 'bg-blue-200', text: 'text-blue-800' },
              { label: 'Low (1)', bg: 'bg-yellow-200', text: 'text-yellow-800' },
              { label: 'None (0)', bg: 'bg-red-100', text: 'text-red-500' },
            ].map(item => (
              <span key={item.label} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.bg} ${item.text}`}>
                {item.label}
              </span>
            ))}
          </div>
          {/* Generate Scoring button — right-aligned */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={generateScoring}
              disabled={generating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                generating
                  ? 'bg-purple-200 text-purple-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {generating
                ? <><Loader2 size={11} className="animate-spin" /> Generating…</>
                : <><Sparkles size={11} /> Generate Scoring</>
              }
            </button>
          </div>
        </div>
        {/* Feedback message */}
        {generateMsg && (
          <div className={`mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
            generateMsg.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {generateMsg.type === 'success' ? '✓ ' : '✕ '}{generateMsg.text}
          </div>
        )}
      </div>
      {surveys.map(sv => (
        <div key={sv.id}>
          <p className={`text-sm font-semibold mb-3 ${textMain}`}>{sv.title}</p>
          {sv.questions.filter(q => q.funnel_role !== 'neutral' && q.options && q.options.length > 0).map(q => (
            <div key={q.id} className={`mb-4 rounded-xl border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`px-3 py-2 flex items-center gap-2 ${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <span className={`text-xs font-medium flex-1 truncate ${textMain}`}>{q.question}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  q.funnel_role === 'screen' ? 'bg-red-100 text-red-700' :
                  q.funnel_role === 'both' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {q.funnel_role === 'screen' ? '🛡 Screen' : q.funnel_role === 'both' ? '🔀 Both' : '📊 Score'}
                </span>
                {q.screening_rule?.enabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                    ✕ Fail if "{q.screening_rule.fail_value}"
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                      <th className={`text-left px-3 py-1.5 font-semibold ${textMuted}`}>Answer</th>
                      {jobIds.map(jid => (
                        <th key={jid} className={`text-center px-2 py-1.5 font-semibold ${textMuted}`}>
                          {funnel.job_surveys[jid]?.display_name?.split('—')[0]?.trim() || jid}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(q.options || []).map((opt, oi) => (
                      <tr key={oi} className={`border-t ${borderCol} ${oi % 2 === 0 ? '' : isDarkMode ? 'bg-gray-750/50' : 'bg-gray-50/50'}`}>
                        <td className={`px-3 py-1.5 ${textMain}`}>{opt}</td>
                        {jobIds.map(jid => {
                          const rawScore = q.option_scores?.[opt]?.[jid];
                          // Guard: rawScore must be a number — if it's an object the data
                          // has an extra nesting level from a malformed AI response.
                          const pts: number | null =
                            rawScore === undefined || rawScore === null ? null
                            : typeof rawScore === 'object' ? null   // corrupt — ignore
                            : Number(rawScore);
                          const isEditing = editingCell?.surveyId === sv.id && editingCell?.qId === q.id && editingCell?.option === opt && editingCell?.jobId === jid;
                          return (
                            <td key={jid} className="px-2 py-1.5 text-center">
                              {isEditing ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    min={-5} max={10}
                                    value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    className={`w-14 text-center rounded px-1 py-0.5 border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') saveScore(sv.id, q.id, opt, jid, parseInt(editVal) || 0);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                  />
                                  <button onClick={() => saveScore(sv.id, q.id, opt, jid, parseInt(editVal) || 0)} className="text-green-500">
                                    {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingCell({ surveyId: sv.id, qId: q.id, option: opt, jobId: jid }); setEditVal(String(pts ?? 0)); }}
                                  title={pts === null ? 'Not yet scored — click to set' : `Score: ${pts}`}
                                  className={`w-8 h-6 rounded text-xs font-bold transition hover:ring-2 hover:ring-blue-400 ${
                                    pts === null        ? (isDarkMode ? 'bg-gray-700 text-gray-500 border border-dashed border-gray-600' : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300') :
                                    (pts as number) >= 5 ? 'bg-green-600 text-white' :
                                    (pts as number) >= 3 ? 'bg-green-200 text-green-800' :
                                    (pts as number) === 2 ? 'bg-blue-200 text-blue-800' :
                                    (pts as number) === 1 ? 'bg-yellow-200 text-yellow-800' :
                                    'bg-red-100 text-red-500'
                                  }`}
                                >
                                  {pts === null ? '–' : pts}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// ─── Questions Panel ──────────────────────────────────────

const QuestionsPanel: React.FC<{ funnel: Funnel; isDarkMode: boolean; apiBase: string; authHeaders: () => Record<string,string> }> = ({ funnel, isDarkMode, apiBase, authHeaders }) => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<(SurveyDetail & { survey_type: string; survey_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [predictingId, setPredictingId] = useState<string | null>(null);

  const refetchSurvey = async (surveyId: string) => {
    try {
      const res = await fetch(`${apiBase}/api/surveys/${surveyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSurveys(prev => prev.map(sv =>
          sv.id === surveyId ? { ...sv, questions: data.questions || [] } : sv
        ));
      }
    } catch {}
  };

  const predictSignals = async (surveyId: string) => {
    setPredictingId(surveyId);
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/predict-job-signals/${surveyId}`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.ok) {
        await refetchSurvey(surveyId);
      }
    } catch (e) {
      console.error('Predict signals error:', e);
    } finally {
      setPredictingId(null);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results: (SurveyDetail & { survey_type: string; survey_name: string })[] = [];

      // Build a combined list — generated_surveys first, then add any screening_surveys
      // not already covered (fixes old funnels where generated_surveys is missing screening entries)
      const genSurveys = [...funnel.generated_surveys];
      const genIds = new Set(genSurveys.map(s => s.survey_id));
      for (const ss of funnel.screening_surveys) {
        if (!genIds.has(ss.survey_id)) {
          genSurveys.push({ survey_id: ss.survey_id, name: ss.name, type: 'screening', index: ss.index, question_count: 0 });
        }
      }

      for (const s of genSurveys) {
        try {
          const res = await fetch(`${apiBase}/api/surveys/${s.survey_id}`, { headers: authHeaders() });
          if (res.ok) {
            const data = await res.json();
            results.push({
              id: s.survey_id,
              title: s.name,
              survey_name: s.name,
              survey_type: s.type,
              questions: data.questions || []
            });
          }
        } catch {}
      }
      setSurveys(results);
      if (results.length > 0) setExpandedSurvey(results[0].id);
      setLoading(false);
    };
    fetchAll();
  }, [funnel.funnel_id]);

  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-3">
      {/* Color legend */}
      <div className={`rounded-xl border p-2.5 text-[10px] ${isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Answer signal:</span>
          <span className="bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">●● Highest</span>
          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">● High</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">◐ Mid</span>
          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">○ Low</span>
          <span className="bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-semibold">– None</span>
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">✕ Screen fail</span>
        </div>
      </div>
      {surveys.map(sv => (
        <div key={sv.id} className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div
            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer ${isDarkMode ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
            onClick={() => setExpandedSurvey(expandedSurvey === sv.id ? null : sv.id)}
          >
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${sv.survey_type === 'screening' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {sv.survey_type === 'screening' ? 'S' : 'J'}
              </span>
              <span className={`text-sm font-medium ${textMain}`}>{sv.survey_name}</span>
              <span className={`text-xs ${textMuted}`}>{sv.questions.length} questions</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); window.open(`/edit/${sv.id}`, '_blank'); }}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
              >
                <Edit3 size={10} /> Edit ↗
              </button>
              {sv.survey_type === 'job' && (
                <button
                  onClick={e => { e.stopPropagation(); predictSignals(sv.id); }}
                  disabled={predictingId === sv.id}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg ${isDarkMode ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
                  title="Ask AI to predict which answers signal strong/weak fit — then shows color coding"
                >
                  {predictingId === sv.id
                    ? <><Loader2 size={10} className="animate-spin" /> Predicting...</>
                    : <>✨ Predict signals</>}
                </button>
              )}
              {expandedSurvey === sv.id ? <ChevronDown size={14} className={textMuted} /> : <ChevronRight size={14} className={textMuted} />}
            </div>
          </div>
          {expandedSurvey === sv.id && (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {sv.questions.map((q, qi) => (
                <div key={q.id} className={`px-4 py-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      {qi + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${textMain}`}>{q.question}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                          {q.type}
                        </span>
                        {q.funnel_role && q.funnel_role !== 'neutral' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            q.funnel_role === 'screen' ? 'bg-red-100 text-red-700' :
                            q.funnel_role === 'both' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {q.funnel_role === 'screen' ? '🛡 Screen' : q.funnel_role === 'both' ? '🔀 Both' : '📊 Score'}
                          </span>
                        )}
                        {q.screening_rule?.enabled && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                            ✕ Terminates if: "{q.screening_rule.fail_value}"
                          </span>
                        )}
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {q.options.map(opt => {
                            // For job surveys: show color based on option_scores if available
                            // For screening surveys with scoring: show max score across all destinations
                            const optScores = q.option_scores?.[opt];
                            const maxPts = optScores
                              ? Math.max(...Object.values(optScores).map(Number))
                              : null;
                            const isScreenFail = q.screening_rule?.enabled &&
                              q.screening_rule.fail_condition === 'equals' &&
                              opt.toLowerCase() === q.screening_rule.fail_value?.toLowerCase();

                            let badgeClass = isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
                            let signalDot = '';

                            if (isScreenFail) {
                              badgeClass = 'bg-red-100 text-red-700';
                              signalDot = '✕ ';
                            } else if (maxPts !== null) {
                              if (maxPts >= 5) { badgeClass = 'bg-green-600 text-white'; signalDot = '●● '; }
                              else if (maxPts >= 3) { badgeClass = 'bg-green-100 text-green-800'; signalDot = '● '; }
                              else if (maxPts === 2) { badgeClass = 'bg-blue-100 text-blue-800'; signalDot = '◐ '; }
                              else if (maxPts === 1) { badgeClass = 'bg-yellow-100 text-yellow-800'; signalDot = '○ '; }
                              else { badgeClass = 'bg-red-50 text-red-400'; signalDot = '– '; }
                            }

                            return (
                              <span
                                key={opt}
                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}
                                title={maxPts !== null ? `Max signal: ${maxPts} pts` : opt}
                              >
                                {signalDot}{opt}
                              </span>
                            );
                          })}
                          {/* Legend for job survey questions */}
                          {sv.survey_type === 'job' && !q.option_scores && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              (signal colors shown after AI scoring)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Router Surveys Panel ─────────────────────────────────

const RouterSurveysPanel: React.FC<{ funnel: Funnel; isDarkMode: boolean; apiBase: string; authHeaders: () => Record<string, string>; onRefresh: () => void }> = ({
  funnel, isDarkMode, onRefresh, apiBase, authHeaders
}) => {
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain  = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const inputClass = `w-full text-sm rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`;

  const anchor = funnel.anchor_config;
  const routerIds: string[] = funnel.router_survey_ids || [];

  // router surveys = screening surveys that are marked is_router
  const routerSurveys = funnel.generated_surveys.filter(s =>
    s.type === 'screening' && ((s as any).is_router || routerIds.includes(s.survey_id))
  );

  // Local state for editing anchor redirect URL
  const [editingRedirect, setEditingRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState((anchor?.redirect_url) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveRedirectUrl = async () => {
    setSaving(true);
    try {
      const newAnchor = { ...(anchor || {}), redirect_url: redirectUrl };
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ anchor_config: newAnchor })
      });
      setSaved(true);
      setEditingRedirect(false);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (!anchor || !anchor.enabled) {
    return (
      <div className={`rounded-xl border border-dashed px-5 py-8 text-center ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        <div className="text-3xl mb-2">⚓</div>
        <p className={`text-sm font-medium ${textMain}`}>No anchor question configured</p>
        <p className={`text-xs mt-1 ${textMuted}`}>
          An anchor question can be added when creating a new funnel. It lets you redirect users who fail all surveys but qualify on a key question.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Anchor question summary card */}
      <div className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? 'border-amber-700/50 bg-amber-950/20' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⚓</span>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>Anchor Question</p>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>Active</span>
        </div>

        <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm font-medium ${textMain}`}>{anchor.question_text}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(anchor.options || []).map((opt: string) => {
              const isCorrect = (anchor.correct_answers || []).includes(opt);
              return (
                <span key={opt} className={`text-xs px-2 py-0.5 rounded-full border ${
                  isCorrect
                    ? isDarkMode ? 'bg-green-900/50 border-green-700 text-green-300' : 'bg-green-100 border-green-300 text-green-700'
                    : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                }`}>
                  {isCorrect && '✓ '}{opt}
                </span>
              );
            })}
          </div>
          <p className={`text-xs mt-2 ${textMuted}`}>
            Qualifying answers: <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{(anchor.correct_answers || []).join(', ') || '(none set)'}</span>
          </p>
        </div>

        {/* Redirect URL */}
        <div>
          <p className={`text-xs font-semibold mb-1 ${textMuted}`}>Redirect URL for qualified users</p>
          {editingRedirect ? (
            <div className="flex gap-2">
              <input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://yoursite.com/special-offer" className={inputClass} />
              <button onClick={saveRedirectUrl} disabled={saving} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium disabled:opacity-50">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
              <button onClick={() => setEditingRedirect(false)} className={`px-2 py-1.5 text-xs rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}><X size={12} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className={`flex-1 text-xs truncate ${anchor.redirect_url ? (isDarkMode ? 'text-amber-300' : 'text-amber-700') : textMuted}`}>
                {anchor.redirect_url || '(not set)'}
              </p>
              {saved && <span className="text-xs text-green-500">Saved ✓</span>}
              <button onClick={() => { setEditingRedirect(true); setRedirectUrl(anchor.redirect_url || ''); }} className={`text-xs ${textMuted} hover:text-amber-500`}>
                <Edit3 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Router surveys list */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${textMuted}`}>
          <span>⚓</span> Router Surveys (contain the anchor question)
        </p>
        {routerSurveys.length === 0 ? (
          <div className={`rounded-xl border border-dashed px-4 py-3 text-center ${isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
            <p className="text-xs">No router surveys found. The anchor question is injected into all screening surveys at creation time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {routerSurveys.map(s => (
              <div key={s.survey_id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isDarkMode ? 'border-amber-700/40 bg-amber-950/10' : 'border-amber-200 bg-amber-50/50'}`}>
                <span className="text-base">⚓</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${textMain}`}>{s.name}</p>
                  <p className={`text-xs ${textMuted}`}>{(s as any).question_count || 0} questions (includes anchor)</p>
                </div>
                <button onClick={() => window.open(`/edit/${s.survey_id}`, '_blank')}
                  className={`flex items-center gap-1 text-xs shrink-0 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  <Edit3 size={12} /> Edit ↗
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works explainer */}
      <div className={`rounded-xl border p-3 text-xs space-y-1.5 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        <p className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>How anchor routing works</p>
        <p>1. The anchor question is embedded in every router survey and shown to all respondents.</p>
        <p>2. The answer is captured alongside all other answers during screening.</p>
        <p>3. If the user fails all destination surveys (or scores no match), the system checks their anchor answer.</p>
        <p>4. If the answer matches a qualifying answer → redirect to the anchor URL instead of the fallback.</p>
      </div>
    </div>
  );
};

// ─── Funnel Row ───────────────────────────────────────────

const FunnelRow: React.FC<{ funnel: Funnel; isDarkMode: boolean; onRefresh: () => void; autoExpand?: boolean; allFunnels?: Funnel[] }> = ({
  funnel, isDarkMode, onRefresh, autoExpand = false, allFunnels = []
}) => {
  const navigate = useNavigate();
  const apiBase = getApiBaseUrl();
  const [expanded, setExpanded] = useState(autoExpand);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'scoring' | 'questions' | 'router' | 'redirects'>('overview');
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [editingTransitionJobId, setEditingTransitionJobId] = useState<string | null>(null);
  const [tempTransition, setTempTransition] = useState<any>({});
  const [editingFallback, setEditingFallback] = useState(false);
  const [tempFallback, setTempFallback] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [deletingFunnel, setDeletingFunnel] = useState(false);
  // Phase 1 spinner config
  const [editingSpinnerSurveyId, setEditingSpinnerSurveyId] = useState<string | null>(null);
  const [tempSpinner, setTempSpinner] = useState<any>({});

  // ── Favourite ─────────────────────────────────────────────────────────────
  const [isFav, setIsFav] = useState<boolean>(funnel.is_favourite ?? false);
  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isFav;
    setIsFav(next);
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/favourite`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ is_favourite: next }),
      });
    } catch { setIsFav(!next); /* revert on error */ }
  };

  // ── Folder ────────────────────────────────────────────────────────────────
  const [folder, setFolder] = useState<string>(funnel.folder || '');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const FOLDERS = [
    { id: 'live',    label: 'Live studies' },
    { id: 'client',  label: 'Client work'  },
    { id: 'drafts',  label: 'Drafts'       },
    { id: 'archive', label: 'Archive'      },
  ] as const;
  const saveFolder = async (f: string) => {
    setFolder(f);
    setShowFolderPicker(false);
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/folder`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ folder: f }),
      });
    } catch { /* silent */ }
  };

  // ── Tags ──────────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<string[]>(funnel.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const addTag = async () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) { setTagInput(''); return; }
    const next = [...tags, t];
    setTags(next);
    setTagInput('');
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/tags`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ tags: next }),
      });
    } catch { setTags(tags); /* revert */ }
  };
  const removeTag = async (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/tags`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ tags: next }),
      });
    } catch { setTags(tags); }
  };

  // ── Clone modal ───────────────────────────────────────────────────────────
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneMode, setCloneMode] = useState<'duplicate' | 'rewrite'>('duplicate');
  const [showClonesDropdown, setShowClonesDropdown] = useState(false);
  // Clones of this journey (child funnels from allFunnels list)
  const clones = allFunnels.filter(f => f.parent_funnel_id === funnel.funnel_id);

  // ── Quick set-up detail modals ───────────────────────────────────────────
  const [detailModalIcon, setDetailModalIcon] = useState<string | null>(null);
  const [detailSelection, setDetailSelection] = useState<string>('');
  const holdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holdProgress, setHoldProgress] = useState(false);

  // Anchor modal specific state
  const [anchorQuestions, setAnchorQuestions] = useState<{
    surveyId: string; surveyName: string; surveyType: string;
    questionId: string; questionText: string; options: string[];
    correctAnswers: string[]; redirectUrl: string;
  }[]>([]);
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [selectedAnchorQId, setSelectedAnchorQId] = useState<string>('');
  const [anchorRedirectUrl, setAnchorRedirectUrl] = useState('');
  const [anchorScope, setAnchorScope] = useState<'all' | 'screeners' | 'tore'>('screeners');

  // ── Security question generator state ──────────────────────────────────
  const [secStep, setSecStep] = useState<'config' | 'review' | 'applying'>('config');
  const [secCount, setSecCount] = useState(2);
  const [secScope, setSecScope] = useState<'screeners' | 'all'>('screeners');
  const [secTermination, setSecTermination] = useState<'instant' | 'this_layer' | 'all_layers' | 'into_tor'>('instant');
  const [secTypes, setSecTypes] = useState<string[]>(['attention_check', 'knowledge_trap']);
  const [secLoading, setSecLoading] = useState(false);
  const [secGenerated, setSecGenerated] = useState<{
    id: string; type: string; question: string;
    options: string[]; correct_answer: string;
    fail_answers: string[]; explanation: string;
  }[]>([]);
  const [secSelected, setSecSelected] = useState<string[]>([]);
  const [secError, setSecError] = useState('');
  const [secApplied, setSecApplied] = useState(false);

  const loadExistingSecurityQuestions = async () => {
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/security-questions`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setSecGenerated(data.questions);
        setSecSelected(data.questions.map((q: any) => q.id));
        setSecTermination(data.security_config?.termination || 'instant');
        setSecStep('review');  // jump straight to review showing existing
      }
    } catch {}
  };

  const generateSecurityQuestions = async () => {
    setSecLoading(true);
    setSecError('');
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/generate-security-questions`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          count: secCount,
          scope: secScope,
          termination: secTermination,
          question_types: secTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setSecGenerated(data.questions || []);
      setSecSelected((data.questions || []).map((q: any) => q.id)); // select all by default
      setSecStep('review');
    } catch (e: any) {
      setSecError(e.message || 'Failed to generate questions');
    } finally {
      setSecLoading(false);
    }
  };

  const applySecurityQuestions = async () => {
    setSecStep('applying');
    try {
      const chosen = secGenerated.filter(q => secSelected.includes(q.id));
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/apply-security-questions`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ questions: chosen, scope: secScope, termination: secTermination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Apply failed');
      setSecApplied(true);
      setTimeout(() => { setDetailModalIcon(null); setSecApplied(false); onRefresh(); }, 1500);
    } catch (e: any) {
      setSecError(e.message || 'Failed to apply');
      setSecStep('review');
    }
  };

  const loadAnchorQuestions = async () => {
    setAnchorLoading(true);
    try {
      // Fetch ALL anchor-tagged questions across all surveys (global pool)
      const res = await fetch(`${apiBase}/api/anchor-questions`, { headers: authHeaders() });
      if (res.ok) {
        const { anchor_questions } = await res.json();
        setAnchorQuestions(anchor_questions || []);
      }
      // Pre-select if already configured on this funnel
      const existing = funnel.anchor_config;
      if (existing?.question_id) {
        setSelectedAnchorQId(existing.question_id);
        setAnchorRedirectUrl(existing.redirect_url || '');
      }
    } finally {
      setAnchorLoading(false);
    }
  };

  const openDetailModal = (iconId: string) => {
    const currentFixed = bulkSelections[iconId] || '';
    setDetailSelection(currentFixed);
    setDetailModalIcon(iconId);
    if (iconId === 'anchor') {
      loadAnchorQuestions();
    }
    if (iconId === 'security') {
      // Reset security flow then check for existing
      setSecStep('config');
      setSecGenerated([]);
      setSecSelected([]);
      setSecError('');
      loadExistingSecurityQuestions();
    }
  };

  const saveAnchorModal = () => {
    if (!selectedAnchorQId) return;
    const aq = anchorQuestions.find(q => q.questionId === selectedAnchorQId);
    if (!aq) return;
    const newAnchorConfig = {
      enabled: true,
      question_id: aq.questionId,
      question_text: aq.questionText,
      options: aq.options,
      correct_answers: aq.correctAnswers,
      redirect_url: anchorRedirectUrl || aq.redirectUrl,
      scope: anchorScope,
      source_survey_id: aq.surveyId,
    };
    fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ anchor_config: newAnchorConfig }),
    }).catch(() => {});
    setDetailModalIcon(null);
  };

  const saveDetailModal = () => {    if (!detailModalIcon) return;
    if (detailSelection) {
      const newSelections = { ...bulkSelections, [detailModalIcon]: detailSelection };
      setBulkSelections(newSelections);
      // Compute new quick_settings — auto-promote off → fixed
      const cur = quickSettings[detailModalIcon] || 'off';
      const newQS = cur === 'off'
        ? { ...quickSettings, [detailModalIcon]: 'fixed' as QuickState }
        : { ...quickSettings };
      if (cur === 'off') setQuickSettings(newQS);
      // Always persist both quick_settings AND bulk_settings.selections in one call
      fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({
          quick_settings: newQS,
          quick_scope: quickScope,
          bulk_settings: { scope: bulkScope, sections: bulkSectionState, selections: newSelections },
        }),
      }).catch(() => {});
    }
    setDetailModalIcon(null);
  };

  const useDefaultDetailModal = () => {
    if (!detailModalIcon) return;
    const newSelections = { ...bulkSelections };
    delete newSelections[detailModalIcon];
    setBulkSelections(newSelections);
    const updated = { ...quickSettings, [detailModalIcon]: 'off' as QuickState };
    setQuickSettings(updated);
    fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({
        quick_settings: updated,
        quick_scope: quickScope,
        bulk_settings: { scope: bulkScope, sections: bulkSectionState, selections: newSelections },
      }),
    }).catch(() => {});
    setDetailModalIcon(null);
  };

  // Detail options per icon
  const DETAIL_OPTIONS: Record<string, { label: string; icon: string; desc?: string }[]> = {
    heading: [
      { label: 'Manual', icon: 'H', desc: 'Keep the original heading text' },
      { label: 'Generate', icon: '✦', desc: 'AI rewrites per respondent' },
      { label: 'Short', icon: '◡', desc: 'Condense to a few words' },
      { label: 'Descriptive', icon: '≡', desc: 'Full descriptive heading' },
      { label: 'Question form', icon: '?', desc: 'Rephrase as a question' },
    ],
    template: [
      { label: 'Classic', icon: '⊞', desc: 'Cream paper, terracotta accent' },
      { label: 'Card stack', icon: '≡', desc: 'Blue theme, card-style options' },
      { label: 'One at a time', icon: '◡', desc: 'Green theme, minimal' },
      { label: 'Chat style', icon: '☺', desc: 'Purple theme, conversational' },
    ],
    motion: [
      { label: 'None', icon: '✕', desc: 'No animation' },
      { label: 'Fade', icon: '◑', desc: 'Smooth fade in' },
      { label: 'Slide', icon: '→', desc: 'Slide from left' },
      { label: 'Spring', icon: '∿', desc: 'Bouncy spring entrance' },
    ],
    pages: [
      // Loading
      { label: 'Spinner', icon: '◌', desc: 'Rotating ring' },
      { label: 'Bar', icon: '▬', desc: 'Progress fill bar' },
      { label: 'Message', icon: '💬', desc: 'Animated text dots' },
      { label: 'Skeleton', icon: '▒', desc: 'Placeholder blocks' },
      // Rating
      { label: 'Stars', icon: '★', desc: 'Five gold stars' },
      { label: 'Faces', icon: '☺', desc: 'Five emoji expressions' },
      { label: 'Slider', icon: '⟷', desc: 'Drag range 0–10' },
      { label: 'Numeric', icon: '#', desc: 'Tappable number buttons' },
      // Ending
      { label: 'Thanks', icon: '♡', desc: 'Animated thank-you screen' },
      { label: 'Reward', icon: '⊞', desc: 'Copyable reward code' },
      { label: 'Redirect', icon: '→', desc: 'Countdown then redirect' },
      { label: 'Screen-out', icon: '⊘', desc: 'Polite disqualification' },
    ],
    intro: [
      { label: 'None', icon: '✕', desc: 'No intro pages' },
      { label: 'At start', icon: '≡', desc: 'One description page before Q1' },
      { label: 'Between', icon: '≡', desc: 'Description page between sections' },
      { label: 'Both', icon: '≡', desc: 'At start and between sections' },
      { label: 'Summary', icon: '?', desc: 'Summary page before submission' },
    ],
    answer_type: [
      { label: 'Multiple choice', icon: '·', desc: 'Pick one option' },
      { label: 'Yes / No', icon: '◑', desc: 'Binary choice' },
      { label: 'Short answer', icon: '≡', desc: 'Free text input' },
      { label: 'Rating', icon: '★', desc: 'Star / face / slider rating' },
      { label: 'Scale', icon: '⟷', desc: '1–10 numeric scale' },
      { label: 'Dropdown', icon: '▾', desc: 'Select from dropdown' },
      { label: 'Matrix', icon: '⊞', desc: 'Grid of rows and columns' },
      { label: 'List', icon: '≡', desc: 'Numbered checklist' },
    ],
    security: [
      { label: 'Instant', icon: '⊙', desc: 'Terminate immediately on wrong answer' },
      { label: 'This layer', icon: '≡', desc: 'Terminate after this survey' },
      { label: 'All layers', icon: '≡', desc: 'Terminate after all screeners' },
      { label: 'Into Tor', icon: '→', desc: 'Send to destination before terminating' },
    ],
    images: [
      { label: 'Upload', icon: '↑', desc: 'Use uploaded question images (default)' },
      { label: 'Image 1', icon: '①', desc: 'Show only the 1st image per question' },
      { label: 'Image 2', icon: '②', desc: 'Show only the 2nd image per question' },
      { label: 'Image 3', icon: '③', desc: 'Show only the 3rd image per question' },
    ],
    anchor: [
      { label: 'Checkout', icon: '⚓', desc: 'Checkout behaviour question' },
      { label: 'Cart drop', icon: '⚓', desc: 'Cart abandonment question' },
      { label: 'Returns', icon: '⚓', desc: 'Returns behaviour question' },
      { label: 'Router', icon: '⊙', desc: 'Mark as router survey' },
    ],
    assurance: [
      { label: 'Off', icon: '⊙', desc: 'No confidentiality badge' },
      { label: 'On', icon: '⊙', desc: 'Show "Your answers stay confidential"' },
    ],
  };

  const DETAIL_SECTIONS: Record<string, { heading: string; items: string[] }[]> = {
    pages: [
      { heading: 'LOADING', items: ['Spinner', 'Bar', 'Message', 'Skeleton'] },
      { heading: 'RATING', items: ['Stars', 'Faces', 'Slider', 'Numeric'] },
      { heading: 'ENDING', items: ['Thanks', 'Reward', 'Redirect', 'Screen-out'] },
    ],
  };

  const DETAIL_NOTES: Record<string, string> = {
    security: 'Applies to every security layer in this survey. Instant is the safest default — a wrong trap answer makes the rest of the response worthless anyway.',
    anchor: 'One anchor per screening survey. Picking one here marks this survey as a router.',
  };
  // iconId = 'template' | 'motion' | 'pages' | 'intro' | 'answer_type' | 'security' | 'images' | 'anchor'
  type QuickState = 'off' | 'fixed' | 'shuffled';
  type QuickSettings = Record<string, QuickState>;
  const QUICK_CYCLE: QuickState[] = ['off', 'fixed', 'shuffled'];
  const QUICK_ICONS = [
    { id: 'template',    label: 'Template',    icon: '⊞', desc: 'Layout style per survey' },
    { id: 'motion',      label: 'Motion',      icon: '◑', desc: 'Animation between questions' },
    { id: 'pages',       label: 'Pages',       icon: '▣', desc: 'Loading, rating and ending pages' },
    { id: 'intro',       label: 'Intro',       icon: '≡', desc: 'Description pages' },
    { id: 'answer_type', label: 'Answer type', icon: '☰', desc: 'Question input types' },
    { id: 'security',    label: 'Security',    icon: '✓', desc: 'Trap question settings' },
    { id: 'images',      label: 'Images',      icon: '⊡', desc: 'Question images' },
    { id: 'anchor',      label: 'Anchor',      icon: '⚓', desc: 'Fallback question' },
    { id: 'assurance',   label: 'Assurance',   icon: '🛡', desc: 'Confidentiality badge' },
  ] as const;  const DEFAULT_QUICK: QuickSettings = Object.fromEntries(QUICK_ICONS.map(ic => [ic.id, 'off']));
  const [quickSettings, setQuickSettings] = useState<QuickSettings>(
    (funnel as any).quick_settings || DEFAULT_QUICK
  );
  const [quickScope, setQuickScope] = useState<'screeners' | 'tore' | 'both'>('both');
  const [quickHover, setQuickHover] = useState<string | null>(null);

  const cycleQuick = (id: string, e: React.MouseEvent) => {
    if (e.detail > 1) return; // guard: double/triple-tap does NOT cycle
    const cur = quickSettings[id] || 'off';
    const next = QUICK_CYCLE[(QUICK_CYCLE.indexOf(cur) + 1) % QUICK_CYCLE.length];
    const updated = { ...quickSettings, [id]: next };
    setQuickSettings(updated);
    // Persist to backend
    fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ quick_settings: updated, quick_scope: quickScope }),
    }).catch(() => {});
  };

  const DOT_COLOR: Record<QuickState, string> = {
    off:      '#9ca3af',
    fixed:    '#16a34a',
    shuffled: '#f59e0b',
  };

  // ── Bulk edit panel ───────────────────────────────────────────────────────
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkScope, setBulkScope] = useState<'screeners' | 'tore' | 'both'>('both');
  type BulkSectionState = 'off' | 'fixed' | 'shuffled';
  const BULK_SECTIONS = [
    {
      id: 'template', label: 'Template', icon: '⊞',
      options: ['Classic', 'Card stack', 'One at a time', 'Chat style'],
    },
    {
      id: 'motion', label: 'Motion', icon: '◑',
      options: ['None', 'Fade', 'Slide', 'Spring'],
    },
    {
      id: 'pages', label: 'Pages', icon: '▣',
      desc: '4 loading · 4 rating · 4 ending',
      options: ['Spinner', 'Progress bar', 'Message', 'Skeleton',
                'Stars', 'Faces', 'Slider', 'Numeric',
                'Thank you', 'Reward code', 'Redirect notice', 'Screen-out'],
    },
    {
      id: 'intro', label: 'Intro', icon: '≡',
      options: ['None', 'At start', 'Between', 'Both', 'Summary'],
    },
    {
      id: 'answer_type', label: 'Answer type', icon: '☰',
      options: ['Multiple choice', 'Yes/No', 'Short answer', 'Rating', 'Scale', 'Dropdown', 'Matrix', 'List'],
    },
    {
      id: 'security', label: 'Security', icon: '✓',
      options: ['Instant', 'This layer', 'All layers', 'Into Tor'],
    },
    {
      id: 'images', label: 'Images', icon: '⊡',
      options: ['None', 'Upload'],
    },
    {
      id: 'anchor', label: 'Anchor', icon: '⚓',
      options: ['Off', 'On'],
    },
  ] as const;
  const [bulkSectionState, setBulkSectionState] = useState<Record<string, BulkSectionState>>(
    (funnel as any).bulk_settings?.sections || Object.fromEntries(BULK_SECTIONS.map(s => [s.id, 'off']))
  );
  const [bulkSelections, setBulkSelections] = useState<Record<string, string>>(
    (funnel as any).bulk_settings?.selections || {}
  );
  const [applyingBulk, setApplyingBulk] = useState(false);

  const applyBulkEdit = async () => {
    setApplyingBulk(true);
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({
          bulk_settings: { scope: bulkScope, sections: bulkSectionState, selections: bulkSelections },
        }),
      });
      onRefresh();
      setShowBulkEdit(false);
    } catch { /* silent */ }
    finally { setApplyingBulk(false); }
  };
  const [clonePrompt, setClonePrompt] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<{type:'success'|'error'; text:string} | null>(null);
  const cloneJourney = async () => {
    setCloning(true);
    setCloneResult(null);
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/clone`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ mode: cloneMode, rewrite_prompt: clonePrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clone failed');
      const note = data.rewrite_note ? ` ${data.rewrite_note}` : '';
      setCloneResult({ type: 'success', text: `Journey cloned successfully${note}. ${data.surveys_cloned} survey${data.surveys_cloned !== 1 ? 's' : ''} copied${data.redirect_slots_cleared ? `, ${data.redirect_slots_cleared} redirect slot${data.redirect_slots_cleared !== 1 ? 's' : ''} cleared` : ''}.` });
      onRefresh();
      setTimeout(() => { setShowCloneModal(false); setCloneResult(null); }, 2500);
    } catch (err: any) {
      setCloneResult({ type: 'error', text: err.message || 'Clone failed' });
    } finally {
      setCloning(false);
    }
  };

  // ── Collaborators ──────────────────────────────────────────────────────────
  const [collaborators, setCollaborators] = useState<{id: string; name: string; email: string}[]>([]);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabLookup, setCollabLookup] = useState<{id: string; name: string; email: string} | null>(null);
  const [collabLookupError, setCollabLookupError] = useState('');
  const [collabLookupLoading, setCollabLookupLoading] = useState(false);
  const [collabAdding, setCollabAdding] = useState(false);
  const [collabLoaded, setCollabLoaded] = useState(false);

  const loadCollaborators = async () => {
    if (collabLoaded) return;
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/collaborators`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setCollaborators(data.collaborators || []); }
    } catch { /* silent */ }
    setCollabLoaded(true);
  };

  const lookupCollabUser = async () => {
    const email = collabEmail.trim().toLowerCase();
    if (!email) return;
    setCollabLookupLoading(true); setCollabLookup(null); setCollabLookupError('');
    try {
      const res = await fetch(`${apiBase}/api/surveys/user-lookup?email=${encodeURIComponent(email)}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.found) setCollabLookupError(data.message || 'No account found');
      else if (collaborators.some(c => c.id === data.user.id)) setCollabLookupError('Already added');
      else setCollabLookup(data.user);
    } catch { setCollabLookupError('Lookup failed'); }
    finally { setCollabLookupLoading(false); }
  };

  const addCollaborator = async () => {
    if (!collabLookup) return;
    setCollabAdding(true);
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/collaborators`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ user_id: collabLookup.id }),
      });
      if (res.ok) { setCollaborators(prev => [...prev, collabLookup]); setCollabLookup(null); setCollabEmail(''); }
      else { const d = await res.json(); setCollabLookupError(d.error || 'Failed to add'); }
    } catch { setCollabLookupError('Failed to add'); }
    finally { setCollabAdding(false); }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/collaborators/${collaboratorId}`, { method: 'DELETE', headers: authHeaders() });
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
    } catch { /* silent */ }
  };

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  // Auto-expand on mount if requested
  useEffect(() => { if (autoExpand) setExpanded(true); }, [autoExpand]);

  const saveJobConfig = async (jobId: string, patch: any) => {
    setSavingJobId(jobId);
    const updatedJobSurveys = { ...funnel.job_surveys, [jobId]: { ...funnel.job_surveys[jobId], ...patch } };
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ job_surveys: updatedJobSurveys })
      });
      onRefresh();
    } finally { setSavingJobId(null); }
  };

  const saveScreeningSpinner = async (surveyId: string, spinnerCfg: any) => {
    // Store spinner config per screening survey under funnel.screening_spinner_configs
    const existing = (funnel as any).screening_spinner_configs || {};
    const updated = { ...existing, [surveyId]: spinnerCfg };
    try {
      await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ screening_spinner_configs: updated })
      });
      onRefresh();
    } catch { /* silent */ }
  };

  const saveFallback = async () => {
    await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ fallback_url: tempFallback })
    });
    setEditingFallback(false);
    onRefresh();
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}/analytics`, { headers: authHeaders() });
      if (res.ok) setAnalytics(await res.json());
    } catch {}
  };

  const copyFunnelLink = () => {
    const firstScreening = funnel.screening_surveys?.[0];
    if (!firstScreening) return;
    const host = window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://survey.pepperwahl.com';
    const link = `${host}/survey/${firstScreening.survey_id}?f=${funnel.funnel_id}&ly=0&sn=new`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteFunnel = async () => {
    if (!window.confirm(`Are you sure you want to delete "${funnel.name}" and all its surveys? This cannot be undone.`)) return;
    setDeletingFunnel(true);
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnel.funnel_id}`, {
        method: 'DELETE', headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert('Delete failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setDeletingFunnel(false);
    }
  };

  useEffect(() => { if (expanded && !analytics) fetchAnalytics(); }, [expanded]);
  useEffect(() => { if (expanded && activeDetailTab === 'overview') loadCollaborators(); }, [expanded, activeDetailTab]);

  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const inputClass = `w-full text-sm rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
          <Layers size={18} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`font-semibold text-sm truncate ${textMain}`}>{funnel.name}</p>
            {/* Sent indicator */}
            {funnel.is_sent && (
              <span title={`Sent · collecting responses`} className="text-blue-500 flex-shrink-0">✈️</span>
            )}
            {/* Folder chip */}
            {folder && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                {FOLDERS.find(f => f.id === folder)?.label || folder}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <p className={`text-xs ${textMuted}`}>{funnel.goal}</p>
            {/* Tags */}
            {tags.map(t => (
              <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                t.startsWith('client:')
                  ? isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                  : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {funnel.total_surveys} surveys
          </span>
          <span className={`text-xs hidden sm:block ${textMuted}`}>
            {funnel.created_at ? new Date(funnel.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${funnel.status === 'active' ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700' : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
            {funnel.status}
          </span>
          {/* Favourite star */}
          <button
            onClick={toggleFav}
            title={isFav ? 'Remove from favourites' : 'Add to favourites'}
            className={`p-1 rounded-lg transition flex-shrink-0 ${isFav ? 'text-amber-400' : isDarkMode ? 'text-gray-600 hover:text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
          >
            <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          {/* Clone button */}
          <button
            onClick={e => { e.stopPropagation(); setShowCloneModal(true); }}
            title="Clone journey"
            className={`p-1 rounded-lg transition flex-shrink-0 ${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <GitFork size={14} />
          </button>
          {/* Clones dropdown — shown when this journey has clones */}
          {clones.length > 0 && (
            <div className="relative flex-shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setShowClonesDropdown(v => !v); }}
                title={`${clones.length} clone${clones.length > 1 ? 's' : ''}`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition border ${
                  showClonesDropdown
                    ? isDarkMode ? 'bg-blue-900/60 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-300'
                    : isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <GitFork size={11} />
                {clones.length} clone{clones.length > 1 ? 's' : ''}
                <ChevronDown size={10} className={`transition-transform ${showClonesDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showClonesDropdown && (
                <div
                  className={`absolute right-0 top-full mt-1 z-30 rounded-xl shadow-xl border py-1 min-w-[240px] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <p className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {clones.length} clone{clones.length > 1 ? 's' : ''} of this journey
                  </p>
                  {clones.map(c => (
                    <div key={c.funnel_id}
                      className={`px-3 py-2.5 flex items-start gap-2.5 border-l-2 border-l-blue-400 ml-2 mr-1 rounded-r-lg mb-0.5 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'}`}>
                      <GitFork size={12} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.status === 'active' ? isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700' : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            {c.status}
                          </span>
                          <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`/surveys?open=${c.funnel_id}`, '_blank')}
                        className={`text-[10px] flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        Open ↗
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); deleteFunnel(); }}
            disabled={deletingFunnel}
            title="Delete journey"
            className={`p-1 rounded-lg transition disabled:opacity-50 ${isDarkMode ? 'text-red-400 hover:bg-red-900/40 hover:text-red-300' : 'text-red-400 hover:bg-red-50 hover:text-red-600'}`}
          >
            {deletingFunnel ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
          {expanded ? <ChevronDown size={16} className={textMuted} /> : <ChevronRight size={16} className={textMuted} />}
        </div>
      </div>

      {expanded && (
        <div className={`border-t px-4 py-4 space-y-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>

          {/* Detail tabs */}
          <div className={`inline-flex rounded-xl border p-1 gap-1 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
            {(['overview', 'scoring', 'questions', 'router', 'redirects'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveDetailTab(tab as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${activeDetailTab === tab ? 'bg-blue-600 text-white' : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'overview' ? '📋 Overview' : tab === 'scoring' ? '📊 Matching' : tab === 'questions' ? '❓ Questions' : tab === 'router' ? '⚓ Entry point' : '↗ Redirects'}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeDetailTab === 'overview' && (
          <div className="space-y-5">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={copyFunnelLink}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy journey link'}
              </button>
              <button onClick={fetchAnalytics}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <BarChart3 size={12} /> Refresh analytics
              </button>
              {/* Clone journey */}
              <button onClick={() => setShowCloneModal(true)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <GitFork size={12} /> Clone journey
              </button>
              <button
                onClick={deleteFunnel}
                disabled={deletingFunnel}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border disabled:opacity-50 ${isDarkMode ? 'border-red-800/60 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                {deletingFunnel ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deletingFunnel ? 'Deleting...' : 'Delete journey'}
              </button>
              {/* Regenerate button — shown whenever Phase 1 screening is empty */}
              {funnel.generated_surveys.filter(s => s.type === 'screening').length === 0 && (
                <RegenerateScreeningButton
                  funnelId={funnel.funnel_id}
                  apiBase={apiBase}
                  authHeaders={authHeaders}
                  onRefresh={onRefresh}
                  compact
                />
              )}
              {/* Bulk edit — add to action row */}
              <button onClick={() => setShowBulkEdit(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-semibold">
                <Shuffle size={12} /> Bulk edit
              </button>
            </div>

            {/* Folder & Tags */}
            <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              {/* Folder picker */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${textMuted} flex items-center gap-1`}><Folder size={12} /> Folder:</span>
                {FOLDERS.map(f => (
                  <button key={f.id} onClick={() => saveFolder(folder === f.id ? '' : f.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                      folder === f.id
                        ? isDarkMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-600'
                        : isDarkMode ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400' : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >{f.label}</button>
                ))}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-semibold ${textMuted} flex items-center gap-1`}><Tag size={12} /> Tags:</span>
                {tags.map(t => (
                  <span key={t} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    t.startsWith('client:')
                      ? isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t}
                    <button onClick={() => removeTag(t)} className="ml-0.5 opacity-60 hover:opacity-100">
                      <X size={9} />
                    </button>
                  </span>
                ))}
                {showTagInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); } }}
                      placeholder="tag or client:name"
                      className={`text-[11px] px-2 py-0.5 rounded-lg border w-32 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`}
                    />
                    <button onClick={addTag} className="text-[11px] px-2 py-0.5 bg-blue-600 text-white rounded-lg">Add</button>
                    <button onClick={() => { setShowTagInput(false); setTagInput(''); }} className={`text-[11px] px-1.5 py-0.5 rounded-lg ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}><X size={11} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowTagInput(true)} className={`text-[11px] px-2 py-0.5 rounded-full border border-dashed transition-colors ${isDarkMode ? 'border-gray-600 text-gray-500 hover:text-gray-300' : 'border-gray-300 text-gray-400 hover:text-gray-600'}`}>
                    + tag
                  </button>
                )}
              </div>
            </div>

            {/* ── Quick set-up bar ── */}
            <div className={`rounded-xl border p-3 space-y-2.5 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className={`text-xs font-semibold ${textMain} flex items-center gap-1.5`}>
                  <Zap size={12} className="text-amber-500" /> Quick set-up
                </p>
                {/* Scope filter */}
                <div className={`inline-flex rounded-lg border p-0.5 gap-0.5 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                  {(['screeners', 'tore', 'both'] as const).map(sc => (
                    <button key={sc} onClick={() => setQuickScope(sc)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        quickScope === sc ? 'bg-blue-600 text-white' : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {sc === 'screeners' ? 'Screeners' : sc === 'tore' ? 'Tore' : 'Both'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8 icon buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {QUICK_ICONS.map(ic => {
                  const state = quickSettings[ic.id] || 'off';
                  // Map each icon id to a lucide component
                  const iconMap: Record<string, React.ReactNode> = {
                    template:    <Settings size={16} />,
                    motion:      <Zap size={16} />,
                    pages:       <Eye size={16} />,
                    intro:       <Info size={16} />,
                    answer_type: <Layers size={16} />,
                    security:    <GitBranch size={16} />,
                    images:      <Link2 size={16} />,
                    anchor:      <Target size={16} />,
                    assurance:   <Shield size={16} />,
                  };
                  return (
                    <div key={ic.id} className="relative flex flex-col items-center"
                      onMouseEnter={() => setQuickHover(ic.id)}
                      onMouseLeave={() => { setQuickHover(null); setHoldProgress(false); if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; } }}>
                      <button
                        onClick={e => {
                          if (e.detail >= 3) { openDetailModal(ic.id); }
                          else { cycleQuick(ic.id, e); }
                        }}
                        onPointerDown={e => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setHoldProgress(true);
                          holdTimerRef.current = setTimeout(() => {
                            setHoldProgress(false);
                            openDetailModal(ic.id);
                          }, 500);
                        }}
                        onPointerUp={() => {
                          setHoldProgress(false);
                          if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
                        }}
                        onPointerLeave={() => {
                          setHoldProgress(false);
                          if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
                        }}
                        title={`${ic.label} · ${state} · tap to cycle · hold for settings`}
                        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors overflow-hidden ${
                          state !== 'off'
                            ? isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-800 text-white'
                            : isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {/* Hold sweep animation */}
                        {holdProgress && quickHover === ic.id && (
                          <span className="absolute inset-0 rounded-xl border-2 border-blue-500 animate-[hold-sweep_0.5s_linear_forwards]" style={{
                            background: 'linear-gradient(90deg, rgba(59,130,246,0.2) var(--sweep, 0%), transparent var(--sweep, 0%))',
                          }} />
                        )}
                        {iconMap[ic.id] || ic.icon}
                      </button>
                      {/* State dot */}
                      <span className="w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0"
                        style={{ background: DOT_COLOR[state] }} />
                      {/* Tooltip */}
                      {quickHover === ic.id && (
                        <div className={`absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 rounded-lg px-2 py-1 text-[10px] font-semibold whitespace-nowrap shadow-lg ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-900 text-white'}`}>
                          {ic.label}
                          <br />
                          <span className="font-normal opacity-75">{state}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* State legend */}
                <div className={`ml-auto flex items-center gap-3 text-[10px] ${textMuted}`}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Off</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> Fixed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Shuffled</span>
                </div>
              </div>
            </div>

            {/* Analytics */}
            {analytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ label: 'Total sessions', value: analytics.total_sessions }, { label: 'Completed', value: analytics.completed }, { label: 'Screened out', value: analytics.terminated }, { label: 'Unrouted', value: analytics.no_match }]
                  .map(item => (
                    <div key={item.label} className={`rounded-xl p-3 text-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <p className={`text-xl font-bold ${textMain}`}>{item.value}</p>
                      <p className={`text-xs ${textMuted}`}>{item.label}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* Screening surveys */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${textMuted}`}>
                <Filter size={12} /> Phase 1 — Screening
              </p>
              <div className="space-y-2">
                {(() => {
                  // Combine all sources: generated_surveys(screening) + screening_surveys fallback
                  const fromGenerated = funnel.generated_surveys.filter(s => s.type === 'screening');
                  const fallback = funnel.screening_surveys.filter(ss =>
                    !fromGenerated.some(g => g.survey_id === ss.survey_id)
                  ).map((s, i) => ({
                    survey_id: s.survey_id,
                    name: s.name,
                    question_count: 0,
                    index: s.index ?? i,
                    type: 'screening' as const
                  }));
                  const displayList = [...fromGenerated, ...fallback];
                  if (displayList.length === 0) {
                    return (
                      <div className={`rounded-xl border border-dashed px-4 py-3 text-center ${isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                        <p className="text-xs mb-2">Screening surveys not linked. Click Fix below.</p>
                        <RegenerateScreeningButton
                          funnelId={funnel.funnel_id}
                          apiBase={apiBase}
                          authHeaders={authHeaders}
                          onRefresh={onRefresh}
                        />
                      </div>
                    );
                  }
                  return displayList.map(s => (
                    <div key={s.survey_id} className={`rounded-xl border p-3 space-y-2.5 ${isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      {/* Survey header */}
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          {(s.index ?? 0) + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${textMain}`}>{s.name}</p>
                          {'question_count' in s && (s as any).question_count > 0 && (
                            <p className={`text-xs ${textMuted}`}>{(s as any).question_count} questions</p>
                          )}
                        </div>
                        <button onClick={() => window.open(`/edit/${s.survey_id}`, '_blank')}
                          className={`flex items-center gap-1 text-xs flex-shrink-0 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                          <Edit3 size={12} /> Edit ↗
                        </button>
                      </div>

                      {/* Between-survey spinner config */}
                      <div>
                        <button onClick={() => { setEditingSpinnerSurveyId(editingSpinnerSurveyId === s.survey_id ? null : s.survey_id); setTempSpinner({}); }}
                          className={`flex items-center gap-1.5 text-xs ${textMuted} hover:text-gray-700`}>
                          <span>⟳</span> Loading style when moving to next survey
                          <ChevronDown size={12} className={`transition-transform ${editingSpinnerSurveyId === s.survey_id ? 'rotate-180' : ''}`} />
                        </button>
                        {editingSpinnerSurveyId === s.survey_id && (() => {
                          const existingCfg = ((funnel as any).screening_spinner_configs || {})[s.survey_id] || {};
                          const currentStyle = tempSpinner.loading_style ?? existingCfg.loading_style ?? 'spinner';
                          return (
                            <div className={`mt-2 space-y-2 rounded-xl border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                              <p className={`text-xs font-semibold ${textMuted} mb-1.5`}>Loading style</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {([
                                  { v:'spinner',  l:'Spinner',      icon:'⟳', desc:'Rotating ring' },
                                  { v:'progress', l:'Progress bar', icon:'▬', desc:'Fill bar' },
                                  { v:'message',  l:'Message',      icon:'💬', desc:'Text only' },
                                  { v:'skeleton', l:'Skeleton',     icon:'▒', desc:'Placeholder' },
                                ] as const).map(st => {
                                  const active = currentStyle === st.v;
                                  return (
                                    <button key={st.v} type="button"
                                      onClick={() => setTempSpinner((p: any) => ({ ...p, loading_style: st.v }))}
                                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                        active
                                          ? isDarkMode ? 'bg-indigo-900/60 border-indigo-500 text-indigo-300' : 'bg-indigo-50 border-indigo-400 text-indigo-700'
                                          : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span className="text-sm leading-none">{st.icon}</span>
                                      <span className="flex flex-col items-start leading-tight">
                                        <span>{st.l}</span>
                                        <span className={`text-[10px] font-normal ${active ? 'opacity-70' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{st.desc}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Mini preview */}
                              <div className={`rounded-lg border flex items-center justify-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} style={{ height: 56 }}>
                                {currentStyle === 'spinner' && (
                                  <div style={{ position:'relative',width:28,height:28 }}>
                                    <div style={{ position:'absolute',inset:0,borderRadius:'50%',border:'3px solid #e5e7eb',borderTopColor:'#6366f1',animation:'spin 1s linear infinite' }} />
                                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                  </div>
                                )}
                                {currentStyle === 'progress' && (
                                  <div style={{ width:'70%',height:6,background:'#e5e7eb',borderRadius:99,overflow:'hidden' }}>
                                    <div style={{ width:'60%',height:'100%',background:'linear-gradient(90deg,#6366f1,#8b5cf6)',borderRadius:99,animation:'progressAnim 1.5s ease-in-out infinite' }} />
                                    <style>{`@keyframes progressAnim{0%{width:0%}100%{width:100%}}`}</style>
                                  </div>
                                )}
                                {currentStyle === 'message' && (
                                  <div style={{ display:'flex',gap:5,alignItems:'center' }}>
                                    {[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:'50%',background:'#6366f1',animation:`dotBounce 0.9s ${i*0.18}s ease-in-out infinite` }}/>)}
                                    <style>{`@keyframes dotBounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
                                  </div>
                                )}
                                {currentStyle === 'skeleton' && (
                                  <div style={{ width:'70%',display:'flex',flexDirection:'column',gap:5 }}>
                                    {[100,80,60].map((w,i)=><div key={i} style={{ height:i===0?10:7,width:`${w}%`,background:'#e5e7eb',borderRadius:4,animation:`skeletonPulse 1.4s ${i*0.2}s ease-in-out infinite` }}/>)}
                                    <style>{`@keyframes skeletonPulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={async () => { await saveScreeningSpinner(s.survey_id, { ...existingCfg, ...tempSpinner }); setEditingSpinnerSurveyId(null); setTempSpinner({}); }}
                                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-medium"
                              >
                                Save loading style
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Job surveys */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${textMuted}`}>
                <Target size={12} /> Phase 2 — Tore
              </p>
              <div className="space-y-3">
                {funnel.generated_surveys.filter(s => s.type === 'job').map((s, i) => {
                  const jobId = s.job_id || '';
                  const jobCfg = funnel.job_surveys?.[jobId] || {} as any;
                  const transition = jobCfg.transition_page || {};
                  return (
                    <div key={s.survey_id} className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>{i + 1}</span>
                          <div>
                            <p className={`text-sm font-semibold ${textMain}`}>{s.name}</p>
                            <p className={`text-xs ${textMuted}`}>{s.question_count} questions</p>
                          </div>
                        </div>
                        <button onClick={() => window.open(`/edit/${s.survey_id}`, '_blank')}
                          className={`flex items-center gap-1 text-xs shrink-0 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                          <Edit3 size={12} /> Edit ↗
                        </button>
                      </div>

                      {/* Threshold-based Redirect Rules */}
                      <ThresholdRedirectRules
                        jobId={jobId}
                        jobCfg={jobCfg}
                        isDarkMode={isDarkMode}
                        inputClass={inputClass}
                        textMuted={textMuted}
                        textMain={textMain}
                        onSave={saveJobConfig}
                        saving={savingJobId === jobId}
                      />

                      {/* Transition page */}
                      <div>
                        <button onClick={() => setEditingTransitionJobId(editingTransitionJobId === jobId ? null : jobId)}
                          className={`flex items-center gap-1.5 text-xs ${textMuted} hover:text-gray-700`}>
                          <ArrowRight size={12} /> Screen-out page
                          <ChevronDown size={12} className={`transition-transform ${editingTransitionJobId === jobId ? 'rotate-180' : ''}`} />
                        </button>
                        {editingTransitionJobId === jobId && (
                          <div className={`mt-2 space-y-2 rounded-xl border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div>
                              <p className={`text-xs ${textMuted} mb-1`}>Heading</p>
                              <input defaultValue={transition.heading || 'We found another great opportunity for you!'} onChange={e => setTempTransition((p: any) => ({ ...p, heading: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                              <p className={`text-xs ${textMuted} mb-1`}>Message</p>
                              <textarea rows={2} defaultValue={transition.message || "You didn't qualify, but we have another opportunity."} onChange={e => setTempTransition((p: any) => ({ ...p, message: e.target.value }))} className={`${inputClass} resize-none`} />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <p className={`text-xs ${textMuted} mb-1`}>Button text</p>
                                <input defaultValue={transition.cta_text || 'See Next Opportunity →'} onChange={e => setTempTransition((p: any) => ({ ...p, cta_text: e.target.value }))} className={inputClass} />
                              </div>
                              <div className="w-24">
                                <p className={`text-xs ${textMuted} mb-1`}>Auto-redirect (s)</p>
                                <input type="number" min={0} max={30} defaultValue={transition.auto_redirect_seconds ?? 5} onChange={e => setTempTransition((p: any) => ({ ...p, auto_redirect_seconds: parseInt(e.target.value) }))} className={inputClass} />
                              </div>
                            </div>
                            {/* ── Between-survey loading style ── */}
                            <div>
                              <p className={`text-xs font-semibold ${textMuted} mb-1.5`}>Loading style between surveys</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {([
                                  { v: 'spinner',  l: 'Spinner',      icon: '⟳', desc: 'Rotating ring' },
                                  { v: 'progress', l: 'Progress bar', icon: '▬', desc: 'Fill bar' },
                                  { v: 'message',  l: 'Message',      icon: '💬', desc: 'Text only' },
                                  { v: 'skeleton', l: 'Skeleton',     icon: '▒', desc: 'Placeholder' },
                                ] as const).map(s => {
                                  const current = tempTransition.loading_style ?? transition.loading_style ?? 'spinner';
                                  const active = current === s.v;
                                  return (
                                    <button key={s.v} type="button"
                                      onClick={() => setTempTransition((p: any) => ({ ...p, loading_style: s.v }))}
                                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                        active
                                          ? isDarkMode ? 'bg-indigo-900/60 border-indigo-500 text-indigo-300' : 'bg-indigo-50 border-indigo-400 text-indigo-700'
                                          : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-650' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span className="text-base leading-none">{s.icon}</span>
                                      <span className="flex flex-col items-start leading-tight">
                                        <span>{s.l}</span>
                                        <span className={`text-[10px] font-normal ${active ? 'opacity-70' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.desc}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Live mini-preview */}
                              <div className={`mt-2 rounded-lg border flex items-center justify-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} style={{ height: 64 }}>
                                {(() => {
                                  const style = tempTransition.loading_style ?? transition.loading_style ?? 'spinner';
                                  if (style === 'spinner') return (
                                    <div style={{ position: 'relative', width: 30, height: 30 }}>
                                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
                                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                    </div>
                                  );
                                  if (style === 'progress') return (
                                    <div style={{ width: '70%', height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                      <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99, animation: 'progressAnim 1.5s ease-in-out infinite' }} />
                                      <style>{`@keyframes progressAnim{0%{width:0%}100%{width:100%}}`}</style>
                                    </div>
                                  );
                                  if (style === 'message') return (
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                      {[0,1,2].map(i => (
                                        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: `dotBounce 0.9s ${i*0.18}s ease-in-out infinite` }} />
                                      ))}
                                      <style>{`@keyframes dotBounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
                                    </div>
                                  );
                                  // skeleton
                                  return (
                                    <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                      {[100, 80, 60].map((w, i) => (
                                        <div key={i} style={{ height: i === 0 ? 10 : 7, width: `${w}%`, background: '#e5e7eb', borderRadius: 4, animation: 'skeletonPulse 1.4s ease-in-out infinite', animationDelay: `${i*0.2}s` }} />
                                      ))}
                                      <style>{`@keyframes skeletonPulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <button onClick={async () => { await saveJobConfig(jobId, { transition_page: { ...transition, ...tempTransition } }); setEditingTransitionJobId(null); setTempTransition({}); }}
                              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium">
                              {savingJobId === jobId ? <Loader2 size={12} className="animate-spin inline" /> : 'Save screen-out page'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fallback URL */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${textMuted}`}>
                <X size={12} /> Fallback (unrouted / all screened out)
              </p>
              {editingFallback ? (
                <div className="flex gap-2">
                  <input value={tempFallback} onChange={e => setTempFallback(e.target.value)} placeholder="https://yoursite.com/no-match" className={inputClass} />
                  <button onClick={saveFallback} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg"><Check size={12} /></button>
                  <button onClick={() => setEditingFallback(false)} className={`px-2 py-1.5 text-xs rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}><X size={12} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className={`flex-1 text-xs truncate ${textMuted}`}>{funnel.fallback_url || '(not set)'}</p>
                  <button onClick={() => { setEditingFallback(true); setTempFallback(funnel.fallback_url || ''); }} className={`text-xs ${textMuted}`}><Edit3 size={12} /></button>
                </div>
              )}
            </div>
          </div>
          )}

          {/* ── COLLABORATORS section (inside overview) ── */}
          {activeDetailTab === 'overview' && (
            <div className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs font-semibold flex items-center gap-1.5 ${textMain}`}>
                👥 Share this funnel
              </p>
              <p className={`text-[11px] ${textMuted}`}>Add a registered user — this funnel will appear in their dashboard too.</p>

              {/* Email lookup */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={collabEmail}
                  onChange={e => { setCollabEmail(e.target.value); setCollabLookup(null); setCollabLookupError(''); }}
                  onKeyDown={e => e.key === 'Enter' && lookupCollabUser()}
                  placeholder="Enter email address"
                  className={`flex-1 text-xs rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
                <button
                  onClick={lookupCollabUser}
                  disabled={collabLookupLoading || !collabEmail.trim()}
                  className="px-3 py-2 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
                >{collabLookupLoading ? '…' : 'Find'}</button>
              </div>

              {collabLookupError && <p className="text-[11px] text-red-500">{collabLookupError}</p>}

              {collabLookup && (
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${isDarkMode ? 'bg-green-900/20 border-green-800/40' : 'bg-green-50 border-green-200'}`}>
                  <div>
                    <p className={`text-xs font-semibold ${textMain}`}>{collabLookup.name || collabLookup.email}</p>
                    <p className={`text-[11px] ${textMuted}`}>{collabLookup.email}</p>
                  </div>
                  <button
                    onClick={addCollaborator}
                    disabled={collabAdding}
                    className="px-3 py-1.5 bg-green-600 text-white text-[11px] font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                  >{collabAdding ? 'Adding…' : '+ Add'}</button>
                </div>
              )}

              {/* Current collaborators */}
              {collaborators.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className={`text-[11px] font-medium ${textMuted}`}>Shared with:</p>
                  {collaborators.map(c => (
                    <div key={c.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
                      <div>
                        <p className={`text-xs font-medium ${textMain}`}>{c.name || c.email}</p>
                        <p className={`text-[11px] ${textMuted}`}>{c.email}</p>
                      </div>
                      <button
                        onClick={() => removeCollaborator(c.id)}
                        className={`p-1 rounded transition-colors ${isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SCORING TAB ── */}
          {activeDetailTab === 'scoring' && (
            <ScoringDetailsPanel funnel={funnel} isDarkMode={isDarkMode} apiBase={apiBase} authHeaders={authHeaders} />
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeDetailTab === 'questions' && (
            <QuestionsPanel funnel={funnel} isDarkMode={isDarkMode} apiBase={apiBase} authHeaders={authHeaders} />
          )}

          {/* ── ROUTER SURVEYS TAB ── */}
          {activeDetailTab === 'router' && (
            <RouterSurveysPanel funnel={funnel} isDarkMode={isDarkMode} apiBase={apiBase} authHeaders={authHeaders} onRefresh={onRefresh} />
          )}

          {/* ── REDIRECTS TAB ── */}
          {activeDetailTab === 'redirects' && (() => {
            // Collect all redirect slots across all surveys in this journey
            const rows: { surveyName: string; surveyId: string; onMatch: string; screenOut: string }[] = [];
            const allSurveys = [
              ...funnel.generated_surveys.filter(s => s.type === 'screening').map(s => ({ ...s, phase: 'screening' as const })),
              ...funnel.generated_surveys.filter(s => s.type === 'job').map(s => ({ ...s, phase: 'job' as const })),
            ];
            allSurveys.forEach(s => {
              const jobCfg = s.phase === 'job' ? (funnel.job_surveys?.[s.job_id || ''] || {} as any) : null;
              rows.push({
                surveyName: s.name,
                surveyId: s.survey_id,
                onMatch: s.phase === 'screening' ? '—' : (jobCfg?.redirect_url || ''),
                screenOut: s.phase === 'screening' ? '' : (jobCfg?.transition_page?.screen_out_url || ''),
              });
            });
            const filled = rows.filter(r => r.onMatch && r.onMatch !== '—').length;
            const total_slots = rows.filter(r => r.onMatch !== '—').length;
            const notSet = rows.filter(r => r.onMatch !== '—' && !r.onMatch).length;
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className={`text-xs font-semibold ${textMain}`}>{filled}/{total_slots} slots filled</p>
                  {notSet > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{notSet} not set</span>}
                </div>
                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                        <th className={`text-left px-3 py-2 font-semibold ${textMuted}`}>Survey</th>
                        <th className={`text-left px-3 py-2 font-semibold ${textMuted}`}>On match</th>
                        <th className={`text-right px-3 py-2`}>
                          <button onClick={() => window.open(`/edit/${rows[0]?.surveyId}`, '_blank')} className="text-blue-500 text-[10px] hover:underline">Edit ↗</button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                          <td className={`px-3 py-2 ${textMain}`}>{r.surveyName}</td>
                          <td className="px-3 py-2">
                            {r.onMatch === '—' ? (
                              <span className={`${textMuted}`}>—</span>
                            ) : r.onMatch ? (
                              <a href={r.onMatch} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block max-w-[200px]">{r.onMatch}</a>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">Not set</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => window.open(`/edit/${r.surveyId}`, '_blank')} className={`text-[10px] ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>Edit ↗</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Bulk edit panel ── */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { if (!applyingBulk) setShowBulkEdit(false); }}>
          <div
            className={`w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  <Shuffle size={16} className="text-blue-500" /> Bulk edit
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Applies to surveys still following the journey default. Individually-set surveys keep their settings.
                </p>
              </div>
              <button onClick={() => setShowBulkEdit(false)} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={16} />
              </button>
            </div>

            {/* Scope switcher */}
            <div className={`px-5 py-3 border-b flex items-center gap-3 flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scope:</span>
              <div className={`inline-flex rounded-xl border p-1 gap-1 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                {(['screeners', 'tore', 'both'] as const).map(sc => {
                  const count = sc === 'screeners'
                    ? funnel.generated_surveys.filter(s => s.type === 'screening').length
                    : sc === 'tore'
                    ? funnel.generated_surveys.filter(s => s.type === 'job').length
                    : funnel.generated_surveys.length;
                  return (
                    <button key={sc} onClick={() => setBulkScope(sc)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        bulkScope === sc ? 'bg-blue-600 text-white' : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {sc === 'screeners' ? 'Screeners' : sc === 'tore' ? 'Tore' : 'Both'} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable settings list */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {BULK_SECTIONS.map(section => {
                const sState: BulkSectionState = bulkSectionState[section.id] || 'off';
                const selected = bulkSelections[section.id] || '';
                return (
                  <div key={section.id} className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{section.icon}</span>
                        <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{section.label}</span>
                        {'desc' in section && <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{(section as any).desc}</span>}
                      </div>
                      {/* Off / Fixed / Shuffled toggle */}
                      <div className={`inline-flex rounded-lg border p-0.5 gap-0.5 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        {(['off', 'fixed', 'shuffled'] as const).map(st => (
                          <button key={st} onClick={() => setBulkSectionState(prev => ({ ...prev, [section.id]: st }))}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${
                              sState === st
                                ? st === 'off' ? 'bg-gray-500 text-white' : st === 'fixed' ? 'bg-green-600 text-white' : 'bg-amber-400 text-white'
                                : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                            }`}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* State explainer */}
                    {sState === 'shuffled' && (
                      <p className={`text-[11px] ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        A different option per respondent — selection below is ignored.
                      </p>
                    )}
                    {sState === 'off' && (
                      <p className={`text-[11px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Nothing applied — surveys use their own settings.</p>
                    )}

                    {/* Options — shown when fixed */}
                    {sState === 'fixed' && (
                      <div className="flex flex-wrap gap-1.5">
                        {section.options.map(opt => (
                          <button key={opt} onClick={() => setBulkSelections(prev => ({ ...prev, [section.id]: opt }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                              selected === opt
                                ? isDarkMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-600'
                                : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'
                            }`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <p className={`text-[11px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Flow and Clone are not included — branching rules differ per survey and can't be bulk-applied.
              </p>
            </div>

            {/* Sticky footer */}
            <div className={`flex items-center gap-3 px-5 py-4 border-t flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button onClick={() => setShowBulkEdit(false)} disabled={applyingBulk}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button onClick={applyBulkEdit} disabled={applyingBulk}
                className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {applyingBulk ? <><Loader2 size={12} className="animate-spin" /> Applying…</> : `Apply to ${bulkScope === 'screeners' ? 'screeners' : bulkScope === 'tore' ? 'Tore' : 'all surveys'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick set-up detail modal ── */}
      {detailModalIcon && (() => {
        const ic = [...QUICK_ICONS].find(i => i.id === detailModalIcon);
        const opts = DETAIL_OPTIONS[detailModalIcon] || [];
        const sections = DETAIL_SECTIONS[detailModalIcon] || null;
        const note = DETAIL_NOTES[detailModalIcon] || null;
        const currentState = quickSettings[detailModalIcon] || 'off';

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setDetailModalIcon(null); setHoldProgress(false); }}>
            <div
              className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div>
                  <h3 className={`text-sm font-bold ${textMain}`}>{ic?.label} settings</h3>
                  <p className={`text-[11px] mt-0.5 ${textMuted}`}>Hold or triple-click an icon to open · tap to cycle Off → Fixed → Shuffled</p>
                </div>
                <button onClick={() => setDetailModalIcon(null)}
                  className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X size={16} />
                </button>
              </div>

              {/* Context banner */}
              <div className={`mx-5 mt-4 px-3 py-2 rounded-lg text-[11px] flex items-start gap-2 flex-shrink-0 ${
                detailModalIcon === 'security'
                  ? isDarkMode ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-100'
                  : isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                {detailModalIcon === 'security' ? (
                  <span>
                    AI generates trap questions from your survey content and injects them into every survey in scope.
                    Wrong answers trigger the termination behaviour you select.
                  </span>
                ) : (
                  <span>
                    Editing from Quick set-up — this applies to <strong>every survey</strong> in scope ({quickScope}).
                    Currently: <strong>{currentState === 'off' ? 'off' : currentState === 'fixed' ? `fixed (${bulkSelections[detailModalIcon] || 'none selected'})` : 'shuffled'}</strong>.
                    Saving a selection sets it to <em>Fixed</em>.
                  </span>
                )}
              </div>

              {/* Options grid — scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* ── Security: 2-step config + review ── */}
                {detailModalIcon === 'security' ? (
                  <div className="space-y-4">
                    {secStep === 'config' && (
                      <>
                        {/* How many */}
                        <div>
                          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>How many questions total</p>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              {[1,2,3,4,5,6,8,10].map(n => (
                                <button key={n} onClick={() => setSecCount(n)}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${secCount === n ? 'bg-red-500 border-red-500 text-white' : isDarkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className={`text-[10px] mt-1.5 ${textMuted}`}>Distributed uniformly across surveys in scope — each survey gets roughly the same number.</p>
                        </div>

                        {/* Scope */}
                        <div>
                          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>Apply to</p>
                          <div className="flex gap-2">
                            {([['screeners','Screeners only'],['all','All surveys']] as const).map(([v,l]) => (
                              <button key={v} onClick={() => setSecScope(v)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${secScope === v ? 'bg-red-500 border-red-500 text-white' : isDarkMode ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Termination */}
                        <div>
                          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>On wrong answer</p>
                          <div className="space-y-1.5">
                            {([
                              ['instant','Instant','Terminate immediately'],
                              ['this_layer','This layer','Terminate after this survey'],
                              ['all_layers','All layers','Terminate after all screeners'],
                              ['into_tor','Into Tor','Send to destination first'],
                            ] as const).map(([v,l,d]) => (
                              <button key={v} onClick={() => setSecTermination(v)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${secTermination === v ? isDarkMode ? 'border-red-500 bg-red-900/20' : 'border-red-400 bg-red-50' : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${secTermination === v ? 'bg-red-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                                <div>
                                  <p className={`text-xs font-semibold ${textMain}`}>{l}</p>
                                  <p className={`text-[10px] ${textMuted}`}>{d}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Question type */}
                        <div>
                          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>Question type</p>
                          <div className="space-y-1.5">
                            {([
                              ['attention_check','🎯 Attention check','Simple instruction — catches bots and random clickers'],
                              ['knowledge_trap','🧠 Knowledge trap','Topic-relevant question only genuine respondents get right'],
                              ['consistency_check','🔄 Consistency check','Rephrased repeat — catches contradictory answers'],
                            ]).map(([v,l,d]) => {
                              const active = secTypes.includes(v);
                              return (
                                <button key={v} onClick={() => setSecTypes(prev => active ? prev.filter(t => t !== v) : [...prev, v])}
                                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${active ? isDarkMode ? 'border-red-500 bg-red-900/20' : 'border-red-400 bg-red-50' : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-red-500 border-red-500' : isDarkMode ? 'border-gray-500' : 'border-gray-300'}`}>
                                    {active && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                  </div>
                                  <div>
                                    <p className={`text-xs font-semibold ${textMain}`}>{l}</p>
                                    <p className={`text-[10px] ${textMuted}`}>{d}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {secError && <p className="text-xs text-red-500">{secError}</p>}
                      </>
                    )}

                    {secStep === 'review' && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${textMain}`}>
                            {secGenerated.length} question{secGenerated.length !== 1 ? 's' : ''} ready
                          </p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => { setSecStep('config'); setSecGenerated([]); setSecSelected([]); }} className={`text-[11px] ${textMuted} hover:text-red-500`}>← Back</button>
                            <button onClick={() => setSecStep('config')} className="text-[11px] text-red-500 font-semibold hover:text-red-600 flex items-center gap-1">
                              <RefreshCw size={10} /> Regenerate
                            </button>
                          </div>
                        </div>

                        {/* Termination selector — editable from review */}
                        <div className={`rounded-xl p-3 ${isDarkMode ? 'bg-gray-700/60' : 'bg-gray-50 border border-gray-100'}`}>
                          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>On wrong answer</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {([
                              ['instant','⚡ Instant','Stop immediately'],
                              ['this_layer','📄 This layer','After this survey'],
                              ['all_layers','🗂 All layers','After all screeners'],
                              ['into_tor','→ Into Tor','Send to destination first'],
                            ] as const).map(([v,l,d]) => (
                              <button key={v} onClick={() => setSecTermination(v)}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${secTermination === v ? isDarkMode ? 'border-red-500 bg-red-900/20' : 'border-red-400 bg-red-50' : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${secTermination === v ? 'bg-red-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                                <div>
                                  <p className={`text-[11px] font-semibold ${textMain}`}>{l}</p>
                                  <p className={`text-[10px] ${textMuted}`}>{d}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {secGenerated.map(q => {
                            const isSelected = secSelected.includes(q.id);
                            return (
                              <div key={q.id}
                                onClick={() => setSecSelected(prev => isSelected ? prev.filter(id => id !== q.id) : [...prev, q.id])}
                                className={`rounded-xl border p-3 cursor-pointer transition-all ${isSelected ? isDarkMode ? 'border-red-500 bg-red-900/20' : 'border-red-400 bg-red-50' : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex items-start gap-2 mb-2">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? 'bg-red-500 border-red-500' : isDarkMode ? 'border-gray-500' : 'border-gray-300'}`}>
                                    {isSelected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                  </div>
                                  <div className="flex-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-1.5 ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                      {q.type.replace(/_/g,' ')}
                                    </span>
                                    <p className={`text-xs font-semibold mt-1 ${textMain}`}>{q.question}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 ml-6">
                                  {q.options.map(opt => {
                                    const isCorrect = opt === q.correct_answer;
                                    return (
                                      <span key={opt} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        isCorrect
                                          ? isDarkMode ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-200'
                                          : isDarkMode ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
                                      }`}>
                                        {isCorrect ? '✓ ' : '✗ '}{opt}
                                      </span>
                                    );
                                  })}
                                </div>
                                {q.explanation && (
                                  <p className={`text-[10px] mt-2 ml-6 ${textMuted}`}>💡 {q.explanation}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {secError && <p className="text-xs text-red-500">{secError}</p>}
                      </>
                    )}

                    {secStep === 'applying' && (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        {secApplied ? (
                          <>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-green-900/40' : 'bg-green-100'}`}>
                              <Check size={22} className="text-green-500" />
                            </div>
                            <p className={`text-sm font-semibold ${textMain}`}>Security questions applied!</p>
                          </>
                        ) : (
                          <>
                            <Loader2 size={24} className="animate-spin text-red-500" />
                            <p className={`text-sm ${textMuted}`}>Injecting into surveys…</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : detailModalIcon === 'anchor' ? (
                  <div className="space-y-4">
                    {/* Scope */}
                    <div>
                      <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>Inject into</p>
                      <div className="flex gap-2">
                        {([
                          { id: 'screeners', label: 'Screeners only' },
                          { id: 'tore',      label: 'Tore only' },
                          { id: 'all',       label: 'All surveys' },
                        ] as const).map(s => (
                          <button key={s.id} onClick={() => setAnchorScope(s.id)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              anchorScope === s.id
                                ? isDarkMode ? 'bg-amber-600 border-amber-600 text-white' : 'bg-amber-500 border-amber-500 text-white'
                                : isDarkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}>{s.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Anchor question list */}
                    <div>
                      <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>Select anchor question</p>
                      {anchorLoading ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                          <Loader2 size={14} className="animate-spin text-amber-500" />
                          <span className={`text-xs ${textMuted}`}>Loading anchor questions…</span>
                        </div>
                      ) : anchorQuestions.length === 0 ? (
                        <div className={`rounded-xl border border-dashed px-4 py-6 text-center ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <div className="text-2xl mb-2">⚓</div>
                          <p className={`text-xs font-medium ${textMain}`}>No anchor questions found</p>
                          <p className={`text-[11px] mt-1 ${textMuted}`}>
                            Open any survey in the editor, select a question, and toggle the <strong>Anchor Question</strong> switch in the right sidebar. It will appear here across all your funnels.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {anchorQuestions.map(aq => {
                            const isSelected = selectedAnchorQId === aq.questionId;
                            return (
                              <button key={aq.questionId}
                                onClick={() => {
                                  setSelectedAnchorQId(isSelected ? '' : aq.questionId);
                                  if (!isSelected && !anchorRedirectUrl) setAnchorRedirectUrl(aq.redirectUrl);
                                }}
                                className={`w-full p-3 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? isDarkMode ? 'border-amber-500 bg-amber-900/20' : 'border-amber-400 bg-amber-50'
                                    : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-base mt-0.5">⚓</span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold truncate ${textMain}`}>{aq.questionText}</p>
                                    <p className={`text-[10px] mt-0.5 ${textMuted}`}>
                                      {aq.surveyName} · {aq.surveyType === 'job' ? 'Tore' : 'Screener'}
                                    </p>
                                    {aq.correctAnswers.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {aq.options.map(opt => {
                                          const isCorrect = aq.correctAnswers.includes(opt);
                                          return (
                                            <span key={opt} className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                              isCorrect
                                                ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                                                : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                              {isCorrect ? '✓ ' : ''}{opt}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && <Check size={14} className="text-amber-500 flex-shrink-0" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Redirect URL override */}
                    {selectedAnchorQId && (
                      <div>
                        <p className={`text-[10px] font-bold tracking-widest uppercase mb-1.5 ${textMuted}`}>Redirect URL (on qualify)</p>
                        <input
                          type="url"
                          value={anchorRedirectUrl}
                          onChange={e => setAnchorRedirectUrl(e.target.value)}
                          placeholder="https://partner.com/fallback-offer"
                          className={`w-full text-xs rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                            isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                        <p className={`text-[10px] mt-1 ${textMuted}`}>
                          Overrides the URL set on the question. Leave blank to use the question's own redirect URL.
                        </p>
                      </div>
                    )}

                    {/* Info note */}
                    <div className={`rounded-lg p-3 text-[11px] leading-relaxed ${isDarkMode ? 'bg-amber-900/20 text-amber-300 border border-amber-800/40' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                      💡 The anchor question is injected (as a copy) into the selected surveys. When a respondent fails all Tore surveys, their answer is checked — if it matches a qualifying answer, they get redirected to the anchor URL instead of screen-out.
                    </div>
                  </div>
                ) : sections ? (
                  // Sectioned layout (e.g. pages = LOADING / RATING / ENDING)
                  sections.map(sec => (
                    <div key={sec.heading}>
                      <p className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${textMuted}`}>{sec.heading}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {opts.filter(o => sec.items.includes(o.label)).map(opt => (
                          <button key={opt.label}
                            onClick={() => setDetailSelection(prev => prev === opt.label ? '' : opt.label)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              detailSelection === opt.label
                                ? isDarkMode ? 'border-blue-500 bg-blue-900/30' : 'border-blue-500 bg-blue-50'
                                : isDarkMode ? 'border-gray-600 hover:border-gray-500 bg-gray-750' : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                                detailSelection === opt.label
                                  ? isDarkMode ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-700'
                                  : isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>{opt.icon}</span>
                              <span className={`text-xs font-semibold ${textMain}`}>{opt.label}</span>
                              {detailSelection === opt.label && (
                                <Check size={12} className="ml-auto text-blue-500" />
                              )}
                            </div>
                            {opt.desc && <p className={`text-[10px] leading-tight ${textMuted}`}>{opt.desc}</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // Flat grid
                  <div className="grid grid-cols-2 gap-2">
                    {opts.map(opt => (
                      <button key={opt.label}
                        onClick={() => setDetailSelection(prev => prev === opt.label ? '' : opt.label)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          detailSelection === opt.label
                            ? isDarkMode ? 'border-blue-500 bg-blue-900/30' : 'border-blue-500 bg-blue-50'
                            : isDarkMode ? 'border-gray-600 hover:border-gray-500 bg-gray-750' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                            detailSelection === opt.label
                              ? isDarkMode ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-700'
                              : isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>{opt.icon}</span>
                          <span className={`text-xs font-semibold ${textMain}`}>{opt.label}</span>
                          {detailSelection === opt.label && (
                            <Check size={12} className="ml-auto text-blue-500" />
                          )}
                        </div>
                        {opt.desc && <p className={`text-[10px] leading-tight ${textMuted}`}>{opt.desc}</p>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Note */}
                {note && (
                  <div className={`rounded-lg p-3 text-[11px] leading-relaxed ${isDarkMode ? 'bg-gray-700/60 text-gray-400' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    💡 {note}
                  </div>
                )}

                {/* Template-specific: consecutive survey grouping */}
                {detailModalIcon === 'template' && (
                  <div className={`rounded-lg p-3 space-y-2 ${isDarkMode ? 'bg-gray-700/60' : 'bg-gray-50 border border-gray-100'}`}>
                    <p className={`text-xs font-semibold ${textMain}`}>Consecutive grouping</p>
                    <p className={`text-[11px] ${textMuted}`}>
                      When <strong>Shuffled</strong>, you can lock N consecutive surveys to use the same template — so a respondent sees the same look for 2–3 surveys in a row before it switches.
                    </p>
                    <div className="flex items-center gap-2">
                      <label className={`text-[11px] font-medium ${textMuted}`}>Surveys per group</label>
                      <select
                        value={(bulkSelections as any)[`${detailModalIcon}_group`] || '1'}
                        onChange={e => setBulkSelections(prev => ({ ...prev, [`${detailModalIcon}_group`]: e.target.value }))}
                        className={`text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                      >
                        {['1','2','3','4','5'].map(n => <option key={n} value={n}>{n === '1' ? '1 (every survey different)' : `${n} surveys same`}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`flex items-center gap-3 px-5 py-4 border-t flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                {detailModalIcon === 'security' ? (
                  secStep === 'config' ? (
                    <>
                      <button onClick={() => setDetailModalIcon(null)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Cancel
                      </button>
                      <button onClick={generateSecurityQuestions} disabled={secLoading || secTypes.length === 0}
                        className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                        {secLoading ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate with AI</>}
                      </button>
                    </>
                  ) : secStep === 'review' ? (
                    <>
                      <button onClick={() => setSecStep('config')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        ← Reconfigure
                      </button>
                      <button onClick={applySecurityQuestions} disabled={secSelected.length === 0}
                        className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                        <Check size={13} /> Inject {secSelected.length} question{secSelected.length !== 1 ? 's' : ''}
                      </button>
                    </>
                  ) : null
                ) : detailModalIcon === 'anchor' ? (
                  <>
                    <button onClick={useDefaultDetailModal}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      Use default (off)
                    </button>
                    <button onClick={saveAnchorModal} disabled={!selectedAnchorQId}
                      className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                      <Check size={13} /> Save anchor config
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={useDefaultDetailModal}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      Use default (off)
                    </button>
                    <button onClick={saveDetailModal} disabled={!detailSelection}
                      className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                      <Check size={13} /> Done — set fixed
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Clone modal ── */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (!cloning) setShowCloneModal(false); }}>
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold ${textMain}`}>Clone journey</h3>
              <button onClick={() => setShowCloneModal(false)} className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={16} /></button>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'duplicate', label: 'Duplicate', desc: 'Exact copy — questions, weights, flow, pages' },
                { id: 'rewrite',   label: 'Duplicate & rewrite', desc: 'Same structure, new subject via a prompt' },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setCloneMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition-colors ${cloneMode === m.id ? isDarkMode ? 'border-blue-500 bg-blue-900/30' : 'border-blue-500 bg-blue-50' : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className={`text-xs font-semibold ${textMain}`}>{m.label}</p>
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Rewrite prompt */}
            {cloneMode === 'rewrite' && (
              <div>
                <label className={`block text-xs font-medium ${textMuted} mb-1`}>Rewrite subject</label>
                <textarea
                  rows={2}
                  value={clonePrompt}
                  onChange={e => setClonePrompt(e.target.value)}
                  placeholder="e.g. Same study, but for Flipkart instead of Amazon"
                  className={`w-full text-xs rounded-lg px-3 py-2 border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>
            )}

            {/* Info note */}
            <div className={`rounded-lg p-3 text-[11px] ${isDarkMode ? 'bg-gray-700/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
              ⚠️ Redirect slots arrive empty — fill them in the Redirects tab after cloning. Saved as <strong>draft</strong>, never active.
            </div>

            {cloneResult && (
              <p className={`text-xs font-medium ${cloneResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{cloneResult.text}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCloneModal(false)} disabled={cloning}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button onClick={cloneJourney} disabled={cloning || (cloneMode === 'rewrite' && !clonePrompt.trim())}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {cloning ? <><Loader2 size={12} className="animate-spin" /> {cloneMode === 'rewrite' ? 'Rewriting with AI…' : 'Cloning…'}</> : <><GitFork size={12} /> {cloneMode === 'rewrite' ? 'Duplicate & rewrite' : 'Clone'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main FunnelList ──────────────────────────────────────

const FunnelList: React.FC<Props> = ({ isDarkMode = false, onCreateNew }) => {
  const apiBase = getApiBaseUrl();
  const [searchParams] = useSearchParams();

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [autoExpandFunnelId, setAutoExpandFunnelId] = useState<string | null>(
    searchParams.get('open') || null
  );
  // ── Favourites filter ─────────────────────────────────────────────────────
  const [favOnly, setFavOnly] = useState(false);
  // ── Pagination & filters ──────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const perPage                        = 20;
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchFunnels = useCallback(async (p = 1, s = '', df = '', dt = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (s) params.set('search', s);
      if (df) params.set('date_from', df);
      if (dt) params.set('date_to', dt);
      const res = await fetch(`${apiBase}/api/funnels?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load funnels');
      const data = await res.json();
      setFunnels(data.funnels || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchFunnels(1, '', '', ''); }, [fetchFunnels]);

  const handleFunnelCreated = (funnelId: string) => {
    setAutoExpandFunnelId(funnelId);
    setShowCreator(false);
    fetchFunnels(1, search, dateFrom, dateTo);
  };

  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain  = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const cardBg    = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  if (showCreator) {
    return (
      <div>
        <div className={`max-w-2xl mx-auto rounded-2xl border p-6 ${cardBg}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-xl font-bold ${textMain}`}>Create Journey</h2>
              <p className={`text-sm ${textMuted}`}>Describe your journey and AI will build everything</p>
            </div>
            <button onClick={() => setShowCreator(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X size={20} />
            </button>
          </div>
          <FunnelCreator isDarkMode={isDarkMode} onFunnelCreated={handleFunnelCreated} onCancel={() => setShowCreator(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-lg font-bold ${textMain}`}>Journeys</h2>
          <p className={`text-sm ${textMuted}`}>{total} journey{total !== 1 ? 's' : ''} · page {page} of {totalPages}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Favourites filter pill */}
          <button onClick={() => setFavOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              favOnly
                ? 'bg-amber-400 text-white border-amber-400'
                : isDarkMode ? 'border-gray-600 text-gray-400 hover:border-amber-400 hover:text-amber-400' : 'border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-500'
            }`}>
            <Star size={12} fill={favOnly ? 'currentColor' : 'none'} /> Favourites
          </button>
          <button onClick={() => fetchFunnels(page, search, dateFrom, dateTo)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreator(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            <Plus size={16} /> New Journey
          </button>
        </div>
      </div>

      {/* ── Search + date filters ── */}
      <div className={`rounded-xl border p-3 flex flex-wrap gap-3 items-end ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className={`w-full pl-8 pr-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800'}`}
            placeholder="Search journeys…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); fetchFunnels(1, searchInput, dateFrom, dateTo); } }}
          />
        </div>
        <button onClick={() => { setSearch(searchInput); fetchFunnels(1, searchInput, dateFrom, dateTo); }}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          Search
        </button>
        {search && (
          <button onClick={() => { setSearch(''); setSearchInput(''); fetchFunnels(1, '', dateFrom, dateTo); }}
            className={`px-3 py-2 rounded-lg text-sm border ${isDarkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
            Clear
          </button>
        )}
        <div className="flex items-center gap-2">
          <label className={`text-xs font-medium flex items-center gap-1 ${textMuted}`}><Calendar size={12} /> From</label>
          <input type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); fetchFunnels(1, search, e.target.value, dateTo); }}
            className={`px-2 py-1.5 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className={`text-xs font-medium flex items-center gap-1 ${textMuted}`}><Calendar size={12} /> To</label>
          <input type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); fetchFunnels(1, search, dateFrom, e.target.value); }}
            className={`px-2 py-1.5 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); fetchFunnels(1, search, '', ''); }}
            className={`px-3 py-1.5 rounded-lg text-xs border ${isDarkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}>
            Clear dates
          </button>
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      )}
      {error && !loading && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${isDarkMode ? 'bg-red-950/30 border-red-800/40 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {!loading && !error && funnels.length === 0 && (
        <div className={`rounded-2xl border-2 border-dashed p-12 text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <Layers size={40} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-semibold ${textMain}`}>
            {search || dateFrom || dateTo ? 'No journeys match your filters' : 'No journeys yet'}
          </p>
          {!search && !dateFrom && !dateTo && (
            <>
              <p className={`text-sm mt-1 mb-4 ${textMuted}`}>Create your first journey — AI builds all surveys, scoring, and routing automatically.</p>
              <button onClick={() => setShowCreator(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                <Plus size={16} /> Create Journey
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Funnel rows ── */}
      {!loading && funnels.length > 0 && (
        <div className="space-y-3">
          {funnels
            .filter(f => !favOnly || f.is_favourite)
            .map(f => (
            <FunnelRow
              key={f.funnel_id}
              funnel={f}
              isDarkMode={isDarkMode}
              onRefresh={() => fetchFunnels(page, search, dateFrom, dateTo)}
              autoExpand={f.funnel_id === autoExpandFunnelId}
              allFunnels={funnels}
            />
          ))}
          {favOnly && funnels.filter(f => f.is_favourite).length === 0 && (
            <div className={`text-center py-8 text-sm ${textMuted}`}>No favourite journeys yet — click the ⭐ on any journey.</div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className={`flex items-center justify-between pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <span className={`text-sm ${textMuted}`}>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => fetchFunnels(page - 1, search, dateFrom, dateTo)}
              className={`p-1.5 rounded-lg border text-sm disabled:opacity-40 ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = totalPages <= 5 ? i + 1
                : page <= 3 ? i + 1
                : page >= totalPages - 2 ? totalPages - 4 + i
                : page - 2 + i;
              return (
                <button
                  key={pg}
                  onClick={() => fetchFunnels(pg, search, dateFrom, dateTo)}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium ${
                    page === pg
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDarkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => fetchFunnels(page + 1, search, dateFrom, dateTo)}
              className={`p-1.5 rounded-lg border text-sm disabled:opacity-40 ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FunnelList;
