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
  ArrowRight, RefreshCw, Eye, Link2, Zap, Info, Sparkles
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
}

interface Funnel {
  funnel_id: string;
  name: string;
  goal: string;
  status: string;
  created_at: string;
  total_surveys: number;
  fallback_url?: string;
  generated_surveys: GeneratedSurvey[];
  screening_surveys: Array<{ survey_id: string; name: string; index: number }>;
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

// ─── Funnel Row ───────────────────────────────────────────

const FunnelRow: React.FC<{ funnel: Funnel; isDarkMode: boolean; onRefresh: () => void; autoExpand?: boolean }> = ({
  funnel, isDarkMode, onRefresh, autoExpand = false
}) => {
  const navigate = useNavigate();
  const apiBase = getApiBaseUrl();
  const [expanded, setExpanded] = useState(autoExpand);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'scoring' | 'questions'>('overview');
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [editingTransitionJobId, setEditingTransitionJobId] = useState<string | null>(null);
  const [tempTransition, setTempTransition] = useState<any>({});
  const [editingFallback, setEditingFallback] = useState(false);
  const [tempFallback, setTempFallback] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [deletingFunnel, setDeletingFunnel] = useState(false);

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
          <p className={`font-semibold text-sm truncate ${textMain}`}>{funnel.name}</p>
          <p className={`text-xs truncate ${textMuted}`}>{funnel.goal}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {funnel.total_surveys} surveys
          </span>
          <span className={`text-xs hidden sm:block ${textMuted}`}>
            {funnel.created_at ? new Date(funnel.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${funnel.status === 'active' ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700' : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
            {funnel.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); deleteFunnel(); }}
            disabled={deletingFunnel}
            title="Delete funnel"
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
            {(['overview', 'scoring', 'questions'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveDetailTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${activeDetailTab === tab ? 'bg-blue-600 text-white' : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'overview' ? '📋 Overview' : tab === 'scoring' ? '📊 AI Scoring' : '❓ Questions'}
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
                {copied ? 'Copied!' : 'Copy funnel link'}
              </button>
              <button onClick={fetchAnalytics}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <BarChart3 size={12} /> Refresh analytics
              </button>
              <button
                onClick={deleteFunnel}
                disabled={deletingFunnel}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border disabled:opacity-50 ${isDarkMode ? 'border-red-800/60 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                {deletingFunnel ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deletingFunnel ? 'Deleting...' : 'Delete Funnel'}
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
            </div>

            {/* Analytics */}
            {analytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ label: 'Total sessions', value: analytics.total_sessions }, { label: 'Completed', value: analytics.completed }, { label: 'Terminated', value: analytics.terminated }, { label: 'No match', value: analytics.no_match }]
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
                    <div key={s.survey_id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        {(s.index ?? 0) + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textMain}`}>{s.name}</p>
                        {'question_count' in s && (s as any).question_count > 0 && (
                          <p className={`text-xs ${textMuted}`}>{(s as any).question_count} questions</p>
                        )}
                      </div>
                      <button onClick={() => window.open(`/edit/${s.survey_id}`, '_blank')}
                        className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                        <Edit3 size={12} /> Edit ↗
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Job surveys */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${textMuted}`}>
                <Target size={12} /> Phase 2 — Destination Surveys
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
                          <ArrowRight size={12} /> Transition page on fail
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
                            <button onClick={async () => { await saveJobConfig(jobId, { transition_page: { ...transition, ...tempTransition } }); setEditingTransitionJobId(null); setTempTransition({}); }}
                              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium">
                              {savingJobId === jobId ? <Loader2 size={12} className="animate-spin inline" /> : 'Save transition page'}
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
                <X size={12} /> Fallback (no match / all fail)
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

          {/* ── SCORING TAB ── */}
          {activeDetailTab === 'scoring' && (
            <ScoringDetailsPanel funnel={funnel} isDarkMode={isDarkMode} apiBase={apiBase} authHeaders={authHeaders} />
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeDetailTab === 'questions' && (
            <QuestionsPanel funnel={funnel} isDarkMode={isDarkMode} apiBase={apiBase} authHeaders={authHeaders} />
          )}
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
              <h2 className={`text-xl font-bold ${textMain}`}>Create Funnel Survey</h2>
              <p className={`text-sm ${textMuted}`}>Describe your funnel and AI will build everything</p>
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
          <h2 className={`text-lg font-bold ${textMain}`}>Funnel Surveys</h2>
          <p className={`text-sm ${textMuted}`}>{total} funnel{total !== 1 ? 's' : ''} · page {page} of {totalPages}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchFunnels(page, search, dateFrom, dateTo)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreator(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            <Plus size={16} /> New Funnel
          </button>
        </div>
      </div>

      {/* ── Search + date filters ── */}
      <div className={`rounded-xl border p-3 flex flex-wrap gap-3 items-end ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className={`w-full pl-8 pr-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800'}`}
            placeholder="Search funnels…"
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
            {search || dateFrom || dateTo ? 'No funnels match your filters' : 'No funnel surveys yet'}
          </p>
          {!search && !dateFrom && !dateTo && (
            <>
              <p className={`text-sm mt-1 mb-4 ${textMuted}`}>Create your first funnel — AI builds all surveys, scoring, and routing automatically.</p>
              <button onClick={() => setShowCreator(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                <Plus size={16} /> Create Funnel Survey
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Funnel rows ── */}
      {!loading && funnels.length > 0 && (
        <div className="space-y-3">
          {funnels.map(f => (
            <FunnelRow
              key={f.funnel_id}
              funnel={f}
              isDarkMode={isDarkMode}
              onRefresh={() => fetchFunnels(page, search, dateFrom, dateTo)}
              autoExpand={f.funnel_id === autoExpandFunnelId}
            />
          ))}
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
