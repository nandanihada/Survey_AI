/**
 * FunnelList — Funnel Surveys subtab
 * Fixes: correct edit route, open funnel stays in funnel tab,
 *        scoring/questions panels populated, question type rendering fixed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers, Plus, ChevronDown, ChevronRight, ExternalLink,
  Settings, BarChart3, Copy, Loader2, AlertCircle,
  Filter, Target, GitBranch, Edit3, Check, X, Trash2,
  ArrowRight, RefreshCw, Eye, Link2, Zap, Info
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

  const jobIds = Object.keys(funnel.job_surveys || {});

  useEffect(() => {
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
    fetchAll();
  }, [funnel.funnel_id]);

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
      <div className={`rounded-xl border p-3 text-xs ${isDarkMode ? 'bg-blue-950/30 border-blue-800/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
        <Info size={12} className="inline mr-1" />
        Each answer option in your screening surveys has AI-assigned points per job profile. Higher points = stronger match. Click any cell to edit.
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
                          const pts = q.option_scores?.[opt]?.[jid] ?? 0;
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
                                  onClick={() => { setEditingCell({ surveyId: sv.id, qId: q.id, option: opt, jobId: jid }); setEditVal(String(pts)); }}
                                  className={`w-8 h-6 rounded text-xs font-bold transition hover:ring-2 hover:ring-blue-400 ${
                                    pts >= 4 ? 'bg-green-100 text-green-700' :
                                    pts >= 2 ? 'bg-yellow-100 text-yellow-700' :
                                    pts > 0  ? 'bg-blue-50 text-blue-600' :
                                    isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {pts}
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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results: (SurveyDetail & { survey_type: string; survey_name: string })[] = [];
      for (const s of funnel.generated_surveys) {
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
                          {q.options.map(opt => (
                            <span key={opt} className={`text-[11px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                              {opt}
                            </span>
                          ))}
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
  const [editingRedirectJobId, setEditingRedirectJobId] = useState<string | null>(null);
  const [tempRedirectUrl, setTempRedirectUrl] = useState('');
  const [editingTransitionJobId, setEditingTransitionJobId] = useState<string | null>(null);
  const [tempTransition, setTempTransition] = useState<any>({});
  const [editingFallback, setEditingFallback] = useState(false);
  const [tempFallback, setTempFallback] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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
    const link = `${host}/survey/${firstScreening.survey_id}?funnel=${funnel.funnel_id}&layer=0&session=new`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                {funnel.generated_surveys.filter(s => s.type === 'screening').map(s => (
                  <div key={s.survey_id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      {(s.index ?? 0) + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textMain}`}>{s.name}</p>
                      <p className={`text-xs ${textMuted}`}>{s.question_count} questions</p>
                    </div>
                    <button onClick={() => window.open(`/edit/${s.survey_id}`, '_blank')}
                      className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                      <Edit3 size={12} /> Edit ↗
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Job surveys */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${textMuted}`}>
                <Target size={12} /> Phase 2 — Job Surveys
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

                      {/* Redirect URL */}
                      <div>
                        <p className={`text-xs font-medium mb-1 ${textMuted}`}>Redirect URL on pass</p>
                        {editingRedirectJobId === jobId ? (
                          <div className="flex gap-2">
                            <input value={tempRedirectUrl} onChange={e => setTempRedirectUrl(e.target.value)} placeholder="https://yoursite.com/apply" className={inputClass} />
                            <button onClick={async () => { await saveJobConfig(jobId, { redirect_url: tempRedirectUrl }); setEditingRedirectJobId(null); }} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg shrink-0">
                              {savingJobId === jobId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button onClick={() => setEditingRedirectJobId(null)} className={`px-2 py-1.5 text-xs rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className={`flex-1 text-xs truncate ${jobCfg.redirect_url ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : textMuted}`}>
                              {jobCfg.redirect_url || '(not set — click to add)'}
                            </p>
                            <button onClick={() => { setEditingRedirectJobId(jobId); setTempRedirectUrl(jobCfg.redirect_url || ''); }} className={`text-xs ${textMuted}`}><Edit3 size={12} /></button>
                          </div>
                        )}
                      </div>

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

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchFunnels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/funnels`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load funnels');
      const data = await res.json();
      setFunnels(data.funnels || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);

  const handleFunnelCreated = (funnelId: string) => {
    setAutoExpandFunnelId(funnelId);
    setShowCreator(false);
    fetchFunnels();
  };

  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${textMain}`}>Funnel Surveys</h2>
          <p className={`text-sm ${textMuted}`}>Multi-survey screening and routing funnels</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchFunnels} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreator(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            <Plus size={16} /> New Funnel
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>}
      {error && !loading && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${isDarkMode ? 'bg-red-950/30 border-red-800/40 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!loading && !error && funnels.length === 0 && (
        <div className={`rounded-2xl border-2 border-dashed p-12 text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <Layers size={40} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-semibold ${textMain}`}>No funnel surveys yet</p>
          <p className={`text-sm mt-1 mb-4 ${textMuted}`}>Create your first funnel — AI builds all surveys, scoring, and routing automatically.</p>
          <button onClick={() => setShowCreator(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            <Plus size={16} /> Create Funnel Survey
          </button>
        </div>
      )}

      {!loading && funnels.length > 0 && (
        <div className="space-y-3">
          {funnels.map(f => (
            <FunnelRow key={f.funnel_id} funnel={f} isDarkMode={isDarkMode} onRefresh={fetchFunnels} autoExpand={f.funnel_id === autoExpandFunnelId} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FunnelList;
