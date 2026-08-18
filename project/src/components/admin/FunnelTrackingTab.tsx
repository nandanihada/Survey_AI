/**
 * FunnelTrackingTab — Full journey timeline for every funnel session.
 * Shows: each survey → answers + scores → decision → job survey → pass/fail → final redirect
 */
import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight,
  Check, X, Search, ArrowRight, Target, Filter,
  BarChart3, Clock, User, Link2, Brain, AlertCircle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

interface RedirectRule { operator: string; threshold: number; url: string; label: string }

interface LayerCompleted {
  layer: number;
  phase: 'screening' | 'job';
  survey_id: string;
  survey_name?: string;
  answers: Record<string, string>;
  scores_added?: Record<string, number>;
  screening_passed?: boolean;
  completed_at: string;
}

interface JobAttempt {
  job_id: string;
  survey_id: string;
  answers: Record<string, string>;
  ai_verdict: 'pass' | 'fail';
  ai_reason: string;
  ai_confidence: number;
  completed_at: string;
}

interface FunnelSession {
  funnel_session_id: string;
  funnel_id: string;
  status: string;
  user_info?: { email?: string; username?: string; ip_address?: string; click_id?: string };
  cumulative_scores?: Record<string, number>;
  job_queue?: string[];
  queue_position?: number;
  failed_jobs?: string[];
  matched_job?: string;
  terminate_reason?: string;
  final_redirect_url?: string;
  redirect_bucket?: string;
  redirect_reason?: string;
  ai_confidence?: number;
  layers_completed?: LayerCompleted[];
  job_attempts?: JobAttempt[];
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

interface FunnelMeta {
  funnel_id: string;
  name: string;
  job_surveys?: Record<string, { display_name: string; redirect_rules?: RedirectRule[] }>;
  screening_surveys?: Array<{ survey_id: string; name: string; index: number }>;
  generated_surveys?: Array<{ survey_id: string; name: string; type: string; job_id?: string }>;
}

interface FunnelSummary extends FunnelMeta {
  total_sessions: number;
  completed: number;
  terminated: number;
  no_match: number;
  completion_rate: number;
  job_match_distribution: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────

const formatTime = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const timeDiff = (a?: string, b?: string) => {
  if (!a || !b) return null;
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-700',
  no_match: 'bg-yellow-100 text-yellow-700',
  job_phase: 'bg-blue-100 text-blue-700',
  screening: 'bg-purple-100 text-purple-700',
};

// ─── Session Journey Timeline ─────────────────────────────

const SessionTimeline: React.FC<{
  session: FunnelSession;
  funnelMeta: FunnelMeta;
  isDarkMode: boolean;
}> = ({ session, funnelMeta, isDarkMode }) => {
  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const rowBg = isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const divider = isDarkMode ? 'border-gray-700' : 'border-gray-100';

  // Build survey name lookup
  const surveyNames: Record<string, string> = {};
  (funnelMeta.generated_surveys || []).forEach(s => { surveyNames[s.survey_id] = s.name; });
  (funnelMeta.screening_surveys || []).forEach(s => { surveyNames[s.survey_id] = s.name; });

  const jobDisplayName = (jobId: string) =>
    funnelMeta.job_surveys?.[jobId]?.display_name || jobId;

  const scoreBar = (score: number, max: number) => {
    const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
    return (
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-[10px] font-bold ${textMain}`}>{score}</span>
      </div>
    );
  };

  const layers = session.layers_completed || [];
  const jobAttempts = session.job_attempts || [];
  const scores = session.cumulative_scores || {};
  const maxScore = Math.max(...Object.values(scores), 1);

  return (
    <div className={`border-t px-4 py-4 space-y-0 ${divider}`}>

      {/* User info strip */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        {[
          { icon: <User size={10} />, label: 'User', val: session.user_info?.email || session.user_info?.username || '—' },
          { icon: <Link2 size={10} />, label: 'Click ID', val: session.user_info?.click_id || '—' },
          { icon: <Clock size={10} />, label: 'Started', val: formatTime(session.created_at) },
          { icon: <Clock size={10} />, label: 'Completed', val: formatTime(session.completed_at) },
          { icon: <Clock size={10} />, label: 'Duration', val: timeDiff(session.created_at, session.completed_at || session.updated_at) || '—' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <span className={textMuted}>{item.icon}</span>
            <span className={textMuted}>{item.label}:</span>
            <span className={`font-medium ${textMain}`}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* Timeline steps */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className={`absolute left-2 top-2 bottom-2 w-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

        {/* ── Screening layers ── */}
        {layers.filter(l => l.phase === 'screening').map((layer, li) => (
          <div key={li} className="relative mb-4">
            {/* Timeline dot */}
            <div className={`absolute -left-4 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${isDarkMode ? 'bg-blue-900 border-blue-500 text-blue-300' : 'bg-blue-50 border-blue-400 text-blue-700'}`}>
              {layer.layer + 1}
            </div>
            <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between px-3 py-2 ${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Filter size={12} className="text-blue-500" />
                  <span className={`text-sm font-semibold ${textMain}`}>
                    {surveyNames[layer.survey_id] || `Screening Survey ${layer.layer + 1}`}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    Screening
                  </span>
                </div>
                <span className={`text-[10px] ${textMuted}`}>{formatTime(layer.completed_at)}</span>
              </div>

              {/* Answers */}
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {Object.entries(layer.answers || {}).slice(0, 10).map(([qid, ans]) => (
                  <div key={qid} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                    <span className={`w-16 shrink-0 font-mono ${textMuted}`}>{qid}</span>
                    <span className={`flex-1 ${textMain}`}>{String(ans)}</span>
                  </div>
                ))}
              </div>

              {/* Scores added this layer */}
              {layer.scores_added && Object.keys(layer.scores_added).length > 0 && (
                <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-[10px] font-semibold uppercase ${textMuted} mb-1`}>Scores added</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(layer.scores_added).map(([dest, pts]) => (
                      <span key={dest} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pts > 0 ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700' : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                        {dest}: +{pts}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ── Scoring Decision ── */}
        {Object.keys(scores).length > 0 && (
          <div className="relative mb-4">
            <div className={`absolute -left-4 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDarkMode ? 'bg-yellow-900 border-yellow-500' : 'bg-yellow-50 border-yellow-400'}`}>
              <BarChart3 size={8} className="text-yellow-500" />
            </div>
            <div className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={12} className="text-yellow-500" />
                <span className={`text-sm font-semibold ${textMain}`}>Scoring Decision</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([dest, score]) => (
                  <div key={dest} className={`rounded-lg p-2 ${
                    dest === session.matched_job
                      ? isDarkMode ? 'bg-green-900/40 border border-green-600/40' : 'bg-green-50 border border-green-200'
                      : isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      {dest === session.matched_job && <Check size={10} className="text-green-500" />}
                      <span className={`text-[10px] font-semibold truncate ${textMain}`}>{jobDisplayName(dest)}</span>
                    </div>
                    {scoreBar(score, maxScore)}
                  </div>
                ))}
              </div>
              {session.job_queue && session.job_queue.length > 0 && (
                <p className={`text-xs mt-2 ${textMuted}`}>
                  Queue order: {session.job_queue.map(j => jobDisplayName(j)).join(' → ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Termination ── */}
        {session.status === 'terminated' && (
          <div className="relative mb-4">
            <div className="absolute -left-4 top-1.5 w-4 h-4 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center">
              <X size={8} className="text-white" />
            </div>
            <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? 'bg-red-950/30 border-red-800/40' : 'bg-red-50 border-red-200'}`}>
              <span className="text-red-500 text-sm font-semibold">Terminated</span>
              <p className={`text-xs mt-0.5 ${textMuted}`}>{session.terminate_reason}</p>
            </div>
          </div>
        )}

        {/* ── Job attempts ── */}
        {jobAttempts.map((attempt, ai) => (
          <div key={ai} className="relative mb-4">
            <div className={`absolute -left-4 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
              attempt.ai_verdict === 'pass'
                ? isDarkMode ? 'bg-green-900 border-green-500 text-green-300' : 'bg-green-50 border-green-400 text-green-700'
                : isDarkMode ? 'bg-red-900 border-red-500 text-red-300' : 'bg-red-50 border-red-400 text-red-700'
            }`}>
              {attempt.ai_verdict === 'pass' ? '✓' : '✗'}
            </div>
            <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`flex items-center justify-between px-3 py-2 ${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Target size={12} className={attempt.ai_verdict === 'pass' ? 'text-green-500' : 'text-red-500'} />
                  <span className={`text-sm font-semibold ${textMain}`}>{jobDisplayName(attempt.job_id)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${attempt.ai_verdict === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {attempt.ai_verdict === 'pass' ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${attempt.ai_confidence >= 70 ? 'text-green-600' : attempt.ai_confidence >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {attempt.ai_confidence}% confidence
                  </span>
                  <span className={`text-[10px] ${textMuted}`}>{formatTime(attempt.completed_at)}</span>
                </div>
              </div>

              {/* Job survey answers */}
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {Object.entries(attempt.answers || {}).slice(0, 8).map(([qid, ans]) => (
                  <div key={qid} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                    <span className={`w-16 shrink-0 font-mono ${textMuted}`}>{qid}</span>
                    <span className={`flex-1 ${textMain}`}>{String(ans)}</span>
                  </div>
                ))}
              </div>

              {/* AI reasoning */}
              <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start gap-1.5">
                  <Brain size={11} className={isDarkMode ? 'text-purple-400 shrink-0 mt-0.5' : 'text-purple-600 shrink-0 mt-0.5'} />
                  <p className={`text-xs ${textMuted}`}>{attempt.ai_reason}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ── Final redirect ── */}
        {(session.status === 'completed' || session.final_redirect_url) && (
          <div className="relative mb-2">
            <div className={`absolute -left-4 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDarkMode ? 'bg-green-900 border-green-500' : 'bg-green-50 border-green-400'}`}>
              <ArrowRight size={8} className="text-green-500" />
            </div>
            <div className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'bg-green-950/30 border-green-800/40' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Link2 size={12} className="text-green-500" />
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                  Final Redirect
                </span>
                {session.redirect_bucket && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
                    {session.redirect_bucket}
                  </span>
                )}
                {session.ai_confidence !== undefined && (
                  <span className={`text-[10px] ${textMuted}`}>
                    Score: {session.ai_confidence}%
                  </span>
                )}
              </div>
              {session.redirect_reason && (
                <p className={`text-xs mb-1 ${textMuted}`}>{session.redirect_reason}</p>
              )}
              {session.final_redirect_url && (
                <a
                  href={session.final_redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs break-all ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {session.final_redirect_url}
                </a>
              )}
            </div>
          </div>
        )}

        {/* No match */}
        {session.status === 'no_match' && (
          <div className="relative mb-2">
            <div className={`absolute -left-4 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDarkMode ? 'bg-yellow-900 border-yellow-500' : 'bg-yellow-50 border-yellow-400'}`}>
              <AlertCircle size={8} className="text-yellow-500" />
            </div>
            <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? 'bg-yellow-950/30 border-yellow-800/40' : 'bg-yellow-50 border-yellow-200'}`}>
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>No Match</span>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                Failed: {(session.failed_jobs || []).map(j => jobDisplayName(j)).join(', ') || '—'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Tab ─────────────────────────────────────────────

const FunnelTrackingTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  const apiBase = getApiBaseUrl();
  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
  const [funnelMeta, setFunnelMeta] = useState<FunnelMeta | null>(null);
  const [sessions, setSessions] = useState<FunnelSession[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchFunnels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/funnels`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const summaries: FunnelSummary[] = [];
        for (const f of data.funnels || []) {
          try {
            const ar = await fetch(`${apiBase}/api/funnels/${f.funnel_id}/analytics`, { headers: authHeaders() });
            const a = ar.ok ? await ar.json() : {};
            summaries.push({ ...f, ...a });
          } catch {
            summaries.push({ ...f, total_sessions: 0, completed: 0, terminated: 0, no_match: 0, completion_rate: 0, job_match_distribution: {} });
          }
        }
        setFunnels(summaries);
        if (summaries.length > 0 && !selectedFunnel) {
          setSelectedFunnel(summaries[0].funnel_id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (funnelId: string) => {
    setLoadingSessions(true);
    setSessions([]);
    // Fetch both sessions and full funnel meta in parallel
    const [sessRes, metaRes] = await Promise.all([
      fetch(`${apiBase}/api/funnels/${funnelId}/sessions`, { headers: authHeaders() }),
      fetch(`${apiBase}/api/funnels/${funnelId}`, { headers: authHeaders() })
    ]);
    if (sessRes.ok) setSessions((await sessRes.json()).sessions || []);
    if (metaRes.ok) setFunnelMeta(await metaRes.json());
    setLoadingSessions(false);
  };

  useEffect(() => { fetchFunnels(); }, []);
  useEffect(() => { if (selectedFunnel) fetchSessions(selectedFunnel); }, [selectedFunnel]);

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.funnel_session_id.includes(q) ||
      (s.user_info?.email || '').toLowerCase().includes(q) ||
      (s.user_info?.username || '').toLowerCase().includes(q) ||
      (s.matched_job || '').toLowerCase().includes(q) ||
      s.status.includes(q)
    );
  });

  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${textMain}`}>Funnel Tracking</h2>
          <p className={`text-sm ${textMuted}`}>Full journey per respondent — surveys, scores, decisions, redirects</p>
        </div>
        <button onClick={fetchFunnels} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}

      {!loading && funnels.length > 0 && (
        <>
          {/* Funnel selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funnels.map(f => (
              <button
                key={f.funnel_id}
                onClick={() => setSelectedFunnel(f.funnel_id)}
                className={`text-left rounded-xl border p-3 transition ${selectedFunnel === f.funnel_id ? 'ring-2 ring-blue-500 ' + cardBg : cardBg + ' hover:border-blue-300'}`}
              >
                <p className={`text-sm font-semibold truncate ${textMain}`}>{f.name}</p>
                <div className="flex gap-3 mt-1">
                  <span className={`text-xs ${textMuted}`}>{f.total_sessions} sessions</span>
                  <span className="text-xs text-green-600">{f.completion_rate}% complete</span>
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          {selectedFunnel && (() => {
            const sf = funnels.find(f => f.funnel_id === selectedFunnel);
            if (!sf) return null;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: sf.total_sessions, color: textMain },
                  { label: 'Completed', value: sf.completed, color: 'text-green-600' },
                  { label: 'Terminated', value: sf.terminated, color: 'text-red-500' },
                  { label: 'No match', value: sf.no_match, color: 'text-yellow-600' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl border p-3 text-center ${cardBg}`}>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className={`text-xs ${textMuted}`}>{item.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Search */}
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <Search size={14} className={textMuted} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email, session ID, job match, status..."
              className={`flex-1 text-sm bg-transparent outline-none ${textMain} placeholder:text-gray-400`}
            />
          </div>

          {/* Sessions */}
          {loadingSessions && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-500" size={20} /></div>}

          {!loadingSessions && filtered.length === 0 && (
            <p className={`text-center py-6 text-sm ${textMuted}`}>No sessions yet for this funnel.</p>
          )}

          {!loadingSessions && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.funnel_session_id} className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                  {/* Session row */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}
                    onClick={() => setExpandedSession(expandedSession === s.funnel_session_id ? null : s.funnel_session_id)}
                  >
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textMain}`}>
                        {s.user_info?.email || s.user_info?.username || s.funnel_session_id.slice(0, 20) + '...'}
                      </p>
                      <p className={`text-xs ${textMuted}`}>
                        {s.matched_job ? `✅ ${funnelMeta?.job_surveys?.[s.matched_job]?.display_name || s.matched_job}` :
                         s.terminate_reason ? `❌ ${s.terminate_reason.slice(0, 50)}` :
                         s.failed_jobs?.length ? `Failed: ${s.failed_jobs.join(', ')}` :
                         'In progress'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Score summary */}
                      {s.cumulative_scores && Object.keys(s.cumulative_scores).length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {Object.entries(s.cumulative_scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => (
                            <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              {k.slice(0, 6)}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Redirect bucket */}
                      {s.redirect_bucket && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          {s.redirect_bucket}
                        </span>
                      )}
                      <span className={`text-[10px] ${textMuted}`}>{formatTime(s.updated_at)}</span>
                      {expandedSession === s.funnel_session_id
                        ? <ChevronDown size={14} className={textMuted} />
                        : <ChevronRight size={14} className={textMuted} />}
                    </div>
                  </div>

                  {/* Journey timeline */}
                  {expandedSession === s.funnel_session_id && funnelMeta && (
                    <SessionTimeline session={s} funnelMeta={funnelMeta} isDarkMode={isDarkMode} />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && funnels.length === 0 && (
        <div className={`rounded-2xl border-2 border-dashed p-8 text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={textMuted}>No funnels found. Create a funnel survey to start tracking.</p>
        </div>
      )}
    </div>
  );
};

export default FunnelTrackingTab;
