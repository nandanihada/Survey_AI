/**
 * FunnelTrackingTab — Admin view of all funnel sessions
 * Shows every respondent's journey through a funnel:
 * which surveys they completed, scores, job matches, pass/fail outcomes.
 */
import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronRight,
  Check, X, Filter, Target, ArrowRight, BarChart3, Search
} from 'lucide-react';

interface FunnelSession {
  funnel_session_id: string;
  funnel_id: string;
  funnel_name?: string;
  status: 'screening' | 'job_phase' | 'completed' | 'terminated' | 'no_match';
  user_info?: { email?: string; username?: string; ip_address?: string; click_id?: string };
  cumulative_scores?: Record<string, number>;
  job_queue?: string[];
  queue_position?: number;
  failed_jobs?: string[];
  matched_job?: string;
  terminate_reason?: string;
  layers_completed?: Array<{
    layer: number;
    phase: string;
    survey_id: string;
    answers: Record<string, string>;
    scores_added?: Record<string, number>;
    screening_passed?: boolean;
    completed_at: string;
  }>;
  job_attempts?: Array<{
    job_id: string;
    ai_verdict: string;
    ai_reason: string;
    ai_confidence: number;
    completed_at: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

interface FunnelSummary {
  funnel_id: string;
  name: string;
  total_sessions: number;
  completed: number;
  terminated: number;
  no_match: number;
  completion_rate: number;
  job_match_distribution: Record<string, number>;
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-700',
  no_match: 'bg-yellow-100 text-yellow-700',
  job_phase: 'bg-blue-100 text-blue-700',
  screening: 'bg-purple-100 text-purple-700',
};

const FunnelTrackingTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  const apiBase = getApiBaseUrl();
  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
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
        // Fetch analytics for each funnel
        const summaries: FunnelSummary[] = [];
        for (const f of data.funnels || []) {
          try {
            const ar = await fetch(`${apiBase}/api/funnels/${f.funnel_id}/analytics`, { headers: authHeaders() });
            if (ar.ok) {
              const a = await ar.json();
              summaries.push({ funnel_id: f.funnel_id, name: f.name, ...a });
            } else {
              summaries.push({ funnel_id: f.funnel_id, name: f.name, total_sessions: 0, completed: 0, terminated: 0, no_match: 0, completion_rate: 0, job_match_distribution: {} });
            }
          } catch {
            summaries.push({ funnel_id: f.funnel_id, name: f.name, total_sessions: 0, completed: 0, terminated: 0, no_match: 0, completion_rate: 0, job_match_distribution: {} });
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
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnelId}/sessions`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => { fetchFunnels(); }, []);
  useEffect(() => { if (selectedFunnel) fetchSessions(selectedFunnel); }, [selectedFunnel]);

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.funnel_session_id.includes(q) ||
      s.user_info?.email?.toLowerCase().includes(q) ||
      s.user_info?.username?.toLowerCase().includes(q) ||
      s.matched_job?.toLowerCase().includes(q) ||
      s.status.includes(q)
    );
  });

  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const rowBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${textMain}`}>Funnel Tracking</h2>
          <p className={`text-sm ${textMuted}`}>Full journey tracking for every funnel respondent</p>
        </div>
        <button onClick={fetchFunnels} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}

      {!loading && funnels.length === 0 && (
        <div className={`rounded-2xl border-2 border-dashed p-8 text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={textMuted}>No funnels found. Create a funnel survey to start tracking.</p>
        </div>
      )}

      {funnels.length > 0 && (
        <>
          {/* Funnel selector + stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funnels.map(f => (
              <button
                key={f.funnel_id}
                onClick={() => setSelectedFunnel(f.funnel_id)}
                className={`text-left rounded-xl border p-3 transition ${selectedFunnel === f.funnel_id ? 'ring-2 ring-blue-500 ' + cardBg : cardBg + ' hover:border-blue-300'}`}
              >
                <p className={`text-sm font-semibold truncate ${textMain}`}>{f.name}</p>
                <div className="flex gap-3 mt-1.5">
                  <span className={`text-xs ${textMuted}`}>{f.total_sessions} sessions</span>
                  <span className="text-xs text-green-600">{f.completion_rate}% complete</span>
                </div>
              </button>
            ))}
          </div>

          {/* Stats row for selected funnel */}
          {selectedFunnel && (() => {
            const sf = funnels.find(f => f.funnel_id === selectedFunnel);
            if (!sf) return null;
            return (
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3`}>
                {[
                  { label: 'Total', value: sf.total_sessions, color: 'text-gray-700' },
                  { label: 'Completed', value: sf.completed, color: 'text-green-700' },
                  { label: 'Terminated', value: sf.terminated, color: 'text-red-600' },
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

          {/* Job match distribution */}
          {selectedFunnel && (() => {
            const sf = funnels.find(f => f.funnel_id === selectedFunnel);
            const dist = sf?.job_match_distribution || {};
            if (Object.keys(dist).length === 0) return null;
            const total = Object.values(dist).reduce((a, b) => a + b, 0);
            return (
              <div className={`rounded-xl border p-4 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>Job Match Distribution</p>
                <div className="space-y-2">
                  {Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([jobId, count]) => (
                    <div key={jobId} className="flex items-center gap-2">
                      <p className={`text-xs w-32 truncate ${textMain}`}>{jobId}</p>
                      <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${total ? (count / total * 100) : 0}%` }} />
                      </div>
                      <span className={`text-xs w-8 text-right ${textMuted}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Search */}
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <Search size={14} className={textMuted} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email, session ID, job match..."
              className={`flex-1 text-sm bg-transparent outline-none ${textMain} placeholder:${textMuted}`}
            />
          </div>

          {/* Sessions table */}
          {loadingSessions && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-500" size={20} /></div>}

          {!loadingSessions && filtered.length === 0 && (
            <p className={`text-center py-6 text-sm ${textMuted}`}>No sessions yet for this funnel.</p>
          )}

          {!loadingSessions && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.funnel_session_id} className={`rounded-xl border overflow-hidden ${rowBg}`}>
                  {/* Session row header */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                    onClick={() => setExpandedSession(expandedSession === s.funnel_session_id ? null : s.funnel_session_id)}
                  >
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${textMain}`}>
                        {s.user_info?.email || s.user_info?.username || s.funnel_session_id.slice(0, 16) + '...'}
                      </p>
                      <p className={`text-[10px] ${textMuted}`}>
                        {s.matched_job ? `✅ Matched: ${s.matched_job}` :
                         s.terminate_reason ? `❌ ${s.terminate_reason.slice(0, 40)}` :
                         s.failed_jobs?.length ? `Failed: ${s.failed_jobs.join(', ')}` :
                         'In progress'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.cumulative_scores && (
                        <div className="hidden sm:flex gap-1">
                          {Object.entries(s.cumulative_scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => (
                            <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                              {k.slice(0, 4)}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className={`text-[10px] ${textMuted}`}>
                        {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : ''}
                      </span>
                      {expandedSession === s.funnel_session_id ? <ChevronDown size={14} className={textMuted} /> : <ChevronRight size={14} className={textMuted} />}
                    </div>
                  </div>

                  {/* Expanded session detail */}
                  {expandedSession === s.funnel_session_id && (
                    <div className={`border-t px-4 py-4 space-y-4 text-xs ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>

                      {/* User info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Email', value: s.user_info?.email || '—' },
                          { label: 'Username', value: s.user_info?.username || '—' },
                          { label: 'Click ID', value: s.user_info?.click_id || '—' },
                          { label: 'IP', value: s.user_info?.ip_address || '—' },
                        ].map(item => (
                          <div key={item.label}>
                            <p className={textMuted}>{item.label}</p>
                            <p className={`font-medium truncate ${textMain}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Cumulative scores */}
                      {s.cumulative_scores && Object.keys(s.cumulative_scores).length > 0 && (
                        <div>
                          <p className={`font-semibold mb-2 ${textMuted}`}>Final Scores</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(s.cumulative_scores).sort((a, b) => b[1] - a[1]).map(([jobId, score]) => (
                              <div key={jobId} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                                s.matched_job === jobId ? 'bg-green-100 text-green-700' : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {s.matched_job === jobId && <Check size={10} />}
                                <span>{jobId}</span>
                                <span className="font-bold">{score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Screening layers */}
                      {(s.layers_completed || []).filter(l => l.phase === 'screening').length > 0 && (
                        <div>
                          <p className={`font-semibold mb-2 ${textMuted}`}>Screening Answers</p>
                          {(s.layers_completed || []).filter(l => l.phase === 'screening').map(layer => (
                            <div key={layer.layer} className={`rounded-lg border p-2 mb-2 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                              <p className={`font-medium mb-1 ${textMain}`}>Layer {layer.layer + 1}</p>
                              <div className="grid grid-cols-2 gap-1">
                                {Object.entries(layer.answers || {}).slice(0, 8).map(([qid, ans]) => (
                                  <div key={qid} className="flex gap-1">
                                    <span className={textMuted}>{qid}:</span>
                                    <span className={`truncate font-medium ${textMain}`}>{String(ans)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Job attempts */}
                      {(s.job_attempts || []).length > 0 && (
                        <div>
                          <p className={`font-semibold mb-2 ${textMuted}`}>Job Survey Attempts</p>
                          <div className="space-y-2">
                            {(s.job_attempts || []).map((attempt, i) => (
                              <div key={i} className={`flex items-start gap-3 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold ${attempt.ai_verdict === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {attempt.ai_verdict === 'pass' ? '✓' : '✗'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium ${textMain}`}>{attempt.job_id}</p>
                                  <p className={textMuted}>{attempt.ai_reason}</p>
                                  <p className={`mt-0.5 ${textMuted}`}>Confidence: {attempt.ai_confidence}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FunnelTrackingTab;
