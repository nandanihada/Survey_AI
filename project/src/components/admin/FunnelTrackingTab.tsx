/**
 * FunnelTrackingTab — Full journey timeline for every funnel session.
 * List view, date-wise sorted, search + date filter, pagination, anchor badge.
 * No duplicate header — AdminDashboard already shows the tab title.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
  Check, X, Search, ArrowRight, Target, Filter,
  BarChart3, Link2, Brain, AlertCircle,
  Anchor, Calendar, Layers
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

interface LayerCompleted {
  layer: number;
  phase: 'screening' | 'job';
  survey_id: string;
  answers: Record<string, string>;
  scores_added?: Record<string, number>;
  completed_at: string;
}

interface JobAttempt {
  job_id: string;
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
  anchor_qualified?: boolean;
  anchor_answer?: string;
}

interface FunnelMeta {
  funnel_id: string;
  name: string;
  job_surveys?: Record<string, { display_name: string }>;
  screening_surveys?: Array<{ survey_id: string; name: string; index: number }>;
  generated_surveys?: Array<{ survey_id: string; name: string; type: string; job_id?: string }>;
  anchor_config?: {
    enabled: boolean;
    question_text: string;
    options: string[];
    correct_answers: string[];
    redirect_url: string;
  } | null;
}

interface FunnelSummary extends FunnelMeta {
  total_sessions: number;
  completed: number;
  terminated: number;
  no_match: number;
  completion_rate: number;
  created_at?: string;
}

const PER_PAGE = 20;

// ─── Helpers ─────────────────────────────────────────────

const fmt = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const timeDiff = (a?: string, b?: string) => {
  if (!a || !b) return null;
  const s = Math.floor(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const STATUS_PILL: Record<string, { bg: string; text: string; dot: string }> = {
  completed:  { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  terminated: { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
  no_match:   { bg: '#fef9c3', text: '#854d0e', dot: '#ca8a04' },
  job_phase:  { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  screening:  { bg: '#f3e8ff', text: '#6b21a8', dot: '#9333ea' },
};

// ─── Session Journey Timeline ─────────────────────────────

const SessionTimeline: React.FC<{ session: FunnelSession; meta: FunnelMeta }> = ({ session, meta }) => {
  const surveyNames: Record<string, string> = {};
  (meta.generated_surveys || []).forEach(s => { surveyNames[s.survey_id] = s.name; });
  (meta.screening_surveys || []).forEach(s => { surveyNames[s.survey_id] = s.name; });
  const jobName = (id: string) => meta.job_surveys?.[id]?.display_name || id;

  const scores   = session.cumulative_scores || {};
  const maxScore = Math.max(...Object.values(scores), 1);
  const anchor   = meta.anchor_config;
  const anchorOk = session.anchor_qualified === true;

  return (
    <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #f0ece8', background: '#fdfcfa' }}>

      {/* ── Meta row ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 16 }}>
        {[
          { k: 'User',     v: session.user_info?.email || session.user_info?.username || '—' },
          { k: 'Click ID', v: session.user_info?.click_id || '—' },
          { k: 'IP',       v: session.user_info?.ip_address || '—' },
          { k: 'Started',  v: fmt(session.created_at) },
          { k: 'Ended',    v: fmt(session.completed_at) },
          { k: 'Duration', v: timeDiff(session.created_at, session.completed_at || session.updated_at) || '—' },
        ].map(item => (
          <span key={item.k} style={{ fontSize: 11, color: '#6b5e57' }}>
            <span style={{ color: '#9b9189', marginRight: 3 }}>{item.k}:</span>
            <strong style={{ fontWeight: 600 }}>{item.v}</strong>
          </span>
        ))}
        {anchor?.enabled && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 20,
            background: anchorOk ? '#fef3c7' : '#f3f4f6',
            color: anchorOk ? '#92400e' : '#9ca3af',
            border: `1px solid ${anchorOk ? '#fcd34d' : '#e5e7eb'}`,
          }}>
            <Anchor size={9} />
            {anchorOk ? 'Anchor Qualified' : 'Anchor Not Qualified'}
            {session.anchor_answer && <span style={{ opacity: 0.7, fontWeight: 400 }}>· "{session.anchor_answer}"</span>}
          </span>
        )}
      </div>

      {/* ── Timeline ── */}
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* vertical line */}
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: '#e8e3de', borderRadius: 2 }} />

        {/* Screening layers */}
        {(session.layers_completed || []).filter(l => l.phase === 'screening').map((layer, li) => (
          <TimelineStep
            key={li}
            dot={{ bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }}
            dotLabel={String(layer.layer + 1)}
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Filter size={11} color="#3b82f6" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {surveyNames[layer.survey_id] || `Screening ${layer.layer + 1}`}
                  </span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>Screening</span>
                </div>
                <span style={{ fontSize: 10, color: '#9b9189', whiteSpace: 'nowrap' }}>{fmt(layer.completed_at)}</span>
              </div>
            }
          >
            {/* Answers */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '2px 8px', padding: '6px 10px' }}>
              {Object.entries(layer.answers || {}).slice(0, 12).map(([qid, ans]) => (
                <React.Fragment key={qid}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9b9189', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qid}</span>
                  <span style={{ fontSize: 11, color: '#3d3530', wordBreak: 'break-word' }}>{String(ans)}</span>
                </React.Fragment>
              ))}
            </div>
            {/* Scores */}
            {layer.scores_added && Object.keys(layer.scores_added).length > 0 && (
              <div style={{ padding: '6px 10px', borderTop: '1px solid #f0ece8', background: '#f8f6f4' }}>
                <div style={{ fontSize: 10, color: '#9b9189', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Scores added</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.entries(layer.scores_added).map(([dest, pts]) => (
                    <span key={dest} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700,
                      background: pts > 0 ? '#dcfce7' : '#f3f4f6', color: pts > 0 ? '#166534' : '#9ca3af' }}>
                      {dest}: +{pts}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TimelineStep>
        ))}

        {/* Scoring decision */}
        {Object.keys(scores).length > 0 && (
          <TimelineStep
            dot={{ bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' }}
            dotIcon={<BarChart3 size={8} color="#ca8a04" />}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={11} color="#ca8a04" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Scoring Decision</span>
              </div>
            }
          >
            <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([dest, score]) => {
                const isMatch = dest === session.matched_job;
                const pct = Math.min(100, Math.round((score / maxScore) * 100));
                return (
                  <div key={dest} style={{
                    flex: '1 1 130px', maxWidth: 180, padding: '7px 10px', borderRadius: 8,
                    background: isMatch ? '#f0fdf4' : '#f8f6f4',
                    border: `1px solid ${isMatch ? '#86efac' : '#e8e3de'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      {isMatch && <Check size={10} color="#16a34a" />}
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#3d3530', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {jobName(dest)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#e8e3de', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isMatch ? '#16a34a' : '#3b82f6', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#3d3530', minWidth: 20 }}>{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {session.job_queue && session.job_queue.length > 0 && (
              <div style={{ padding: '4px 10px 8px', fontSize: 10, color: '#9b9189' }}>
                Queue: {session.job_queue.map(j => jobName(j)).join(' → ')}
              </div>
            )}
          </TimelineStep>
        )}

        {/* Termination */}
        {session.status === 'terminated' && (
          <TimelineStep
            dot={{ bg: '#fee2e2', border: '#dc2626', text: '#991b1b' }}
            dotIcon={<X size={8} color="#dc2626" />}
            header={<span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Terminated</span>}
          >
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#9b9189' }}>{session.terminate_reason}</div>
          </TimelineStep>
        )}

        {/* Job attempts */}
        {(session.job_attempts || []).map((attempt, ai) => {
          const pass = attempt.ai_verdict === 'pass';
          return (
            <TimelineStep
              key={ai}
              dot={{ bg: pass ? '#dcfce7' : '#fee2e2', border: pass ? '#16a34a' : '#dc2626', text: pass ? '#166534' : '#991b1b' }}
              dotLabel={pass ? '✓' : '✗'}
              header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{jobName(attempt.job_id)}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700,
                      background: pass ? '#dcfce7' : '#fee2e2', color: pass ? '#166534' : '#991b1b' }}>
                      {pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700,
                      color: attempt.ai_confidence >= 70 ? '#16a34a' : attempt.ai_confidence >= 50 ? '#ca8a04' : '#dc2626' }}>
                      {attempt.ai_confidence}% conf.
                    </span>
                    <span style={{ fontSize: 10, color: '#9b9189' }}>{fmt(attempt.completed_at)}</span>
                  </div>
                </div>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '2px 8px', padding: '6px 10px' }}>
                {Object.entries(attempt.answers || {}).slice(0, 8).map(([qid, ans]) => (
                  <React.Fragment key={qid}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9b9189', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qid}</span>
                    <span style={{ fontSize: 11, color: '#3d3530', wordBreak: 'break-word' }}>{String(ans)}</span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ padding: '5px 10px', borderTop: '1px solid #f0ece8', background: '#f8f6f4', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Brain size={11} color="#9333ea" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#6b5e57', lineHeight: 1.5 }}>{attempt.ai_reason}</span>
              </div>
            </TimelineStep>
          );
        })}

        {/* Anchor redirect */}
        {anchorOk && anchor && (
          <TimelineStep
            dot={{ bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }}
            dotIcon={<Anchor size={8} color="#f59e0b" />}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Anchor size={11} color="#f59e0b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Redirected via Anchor Question</span>
              </div>
            }
          >
            <div style={{ padding: '8px 10px', fontSize: 11, color: '#6b5e57', lineHeight: 1.6 }}>
              <div>Failed all surveys but answered the anchor question correctly.</div>
              <div style={{ marginTop: 3 }}>
                Question: <strong>"{anchor.question_text}"</strong>
              </div>
              {session.anchor_answer && (
                <div>Answer: <strong style={{ color: '#d97706' }}>"{session.anchor_answer}"</strong> ✓ (qualifying)</div>
              )}
              {anchor.redirect_url && (
                <a href={anchor.redirect_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: 4, color: '#3b82f6', fontSize: 11, wordBreak: 'break-all' }}>
                  → {anchor.redirect_url}
                </a>
              )}
            </div>
          </TimelineStep>
        )}

        {/* Final redirect (normal job pass) */}
        {session.status === 'completed' && !anchorOk && (
          <TimelineStep
            dot={{ bg: '#dcfce7', border: '#16a34a', text: '#166534' }}
            dotIcon={<ArrowRight size={8} color="#16a34a" />}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={11} color="#16a34a" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>Final Redirect</span>
                {session.redirect_bucket && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                    {session.redirect_bucket}
                  </span>
                )}
                {session.ai_confidence !== undefined && (
                  <span style={{ fontSize: 10, color: '#9b9189' }}>Score: {session.ai_confidence}%</span>
                )}
              </div>
            }
          >
            <div style={{ padding: '8px 10px', fontSize: 11, color: '#6b5e57' }}>
              {session.redirect_reason && <div style={{ marginBottom: 4 }}>{session.redirect_reason}</div>}
              {session.final_redirect_url && (
                <a href={session.final_redirect_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#3b82f6', wordBreak: 'break-all' }}>
                  {session.final_redirect_url}
                </a>
              )}
            </div>
          </TimelineStep>
        )}

        {/* No match / all failed */}
        {(session.status === 'no_match' || session.status === 'all_failed') && !anchorOk && (
          <TimelineStep
            dot={{ bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' }}
            dotIcon={<AlertCircle size={8} color="#ca8a04" />}
            header={<span style={{ fontSize: 12, fontWeight: 700, color: '#854d0e' }}>No Match — Sent to Fallback</span>}
          >
            {(session.failed_jobs || []).length > 0 && (
              <div style={{ padding: '6px 10px', fontSize: 11, color: '#9b9189' }}>
                Failed: {session.failed_jobs!.map(j => jobName(j)).join(', ')}
              </div>
            )}
          </TimelineStep>
        )}
      </div>
    </div>
  );
};

// ─── Timeline Step wrapper ────────────────────────────────

const TimelineStep: React.FC<{
  dot: { bg: string; border: string; text: string };
  dotLabel?: string;
  dotIcon?: React.ReactNode;
  header: React.ReactNode;
  children?: React.ReactNode;
}> = ({ dot, dotLabel, dotIcon, header, children }) => (
  <div style={{ position: 'relative', marginBottom: 12 }}>
    {/* dot */}
    <div style={{
      position: 'absolute', left: -21, top: 10, width: 16, height: 16, borderRadius: '50%',
      background: dot.bg, border: `2px solid ${dot.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 800, color: dot.text, zIndex: 1,
    }}>
      {dotIcon || dotLabel || ''}
    </div>
    <div style={{ borderRadius: 10, border: '1px solid #e8e3de', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '8px 10px', background: '#f8f6f4', borderBottom: children ? '1px solid #f0ece8' : 'none' }}>
        {header}
      </div>
      {children}
    </div>
  </div>
);

// ─── Main Tab ─────────────────────────────────────────────

const FunnelTrackingTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  const apiBase = getApiBaseUrl();

  // Funnel list
  const [funnels,        setFunnels]        = useState<FunnelSummary[]>([]);
  const [funnelSearch,   setFunnelSearch]   = useState('');
  const [funnelPage,     setFunnelPage]     = useState(1);
  const [funnelTotal,    setFunnelTotal]    = useState(0);
  const [loadingFunnels, setLoadingFunnels] = useState(false);

  // Selected funnel + sessions
  const [selectedFunnel,  setSelectedFunnel]  = useState<FunnelSummary | null>(null);
  const [funnelMeta,      setFunnelMeta]      = useState<FunnelMeta | null>(null);
  const [sessions,        setSessions]        = useState<FunnelSession[]>([]);
  const [sessionSearch,   setSessionSearch]   = useState('');
  const [sessionPage,     setSessionPage]     = useState(1);
  const [sessionTotal,    setSessionTotal]    = useState(0);
  const [sessionDateFrom, setSessionDateFrom] = useState('');
  const [sessionDateTo,   setSessionDateTo]   = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const authH = useCallback(() => {
    const t = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  }, []);

  const fetchFunnels = useCallback(async (page = 1, search = '') => {
    setLoadingFunnels(true);
    try {
      const p = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (search) p.set('search', search);
      const res = await fetch(`${apiBase}/api/funnels?${p}`, { headers: authH() });
      if (!res.ok) return;
      const data = await res.json();
      setFunnels((data.funnels || []).map((f: any) => ({
        ...f, total_sessions: f.total_sessions ?? 0, completed: f.completed ?? 0,
        terminated: f.terminated ?? 0, no_match: f.no_match ?? 0, completion_rate: f.completion_rate ?? 0,
      })));
      setFunnelTotal(data.total || 0);
      setFunnelPage(page);
    } finally { setLoadingFunnels(false); }
  }, [apiBase, authH]);

  const fetchSessions = useCallback(async (
    funnelId: string, page = 1, search = '', dateFrom = '', dateTo = ''
  ) => {
    setLoadingSessions(true);
    setSessions([]);
    setExpandedSession(null);
    try {
      const p = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (search)   p.set('search',    search);
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo)   p.set('date_to',   dateTo);
      const [sessRes, metaRes] = await Promise.all([
        fetch(`${apiBase}/api/funnels/${funnelId}/sessions?${p}`, { headers: authH() }),
        fetch(`${apiBase}/api/funnels/${funnelId}`,                { headers: authH() }),
      ]);
      if (sessRes.ok) {
        const d = await sessRes.json();
        setSessions(d.sessions || []);
        setSessionTotal(d.total || 0);
        setSessionPage(page);
      }
      if (metaRes.ok) setFunnelMeta(await metaRes.json());
    } finally { setLoadingSessions(false); }
  }, [apiBase, authH]);

  useEffect(() => { fetchFunnels(1, ''); }, [fetchFunnels]);

  const selectFunnel = (f: FunnelSummary) => {
    setSelectedFunnel(f);
    setSessionSearch(''); setSessionDateFrom(''); setSessionDateTo('');
    fetchSessions(f.funnel_id, 1, '', '', '');
  };

  const applyFilters = () => {
    if (selectedFunnel) fetchSessions(selectedFunnel.funnel_id, 1, sessionSearch, sessionDateFrom, sessionDateTo);
  };

  const totalFunnelPages  = Math.max(1, Math.ceil(funnelTotal  / PER_PAGE));
  const totalSessionPages = Math.max(1, Math.ceil(sessionTotal / PER_PAGE));

  // ── Styles ──────────────────────────────────────────────

  const BG   = '#fdfcfa';
  const CARD = '#ffffff';
  const BORDER = '#e8e3de';
  const TEXT  = '#2d2520';
  const MUTED = '#9b9189';
  const BLUE  = '#3b7cef';

  const inputStyle: React.CSSProperties = {
    fontSize: 12, padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${BORDER}`, background: CARD, color: TEXT,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', gap: 0, background: BG }}>

      {/* ══ LEFT PANEL — Funnel list ══ */}
      <div style={{
        width: 260, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${BORDER}`,
      }}>

        {/* Search + refresh */}
        <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={12} color={MUTED} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={funnelSearch}
              onChange={e => setFunnelSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchFunnels(1, funnelSearch)}
              placeholder="Search funnels…"
              style={{ ...inputStyle, paddingLeft: 26 }}
            />
          </div>
          <button
            onClick={() => fetchFunnels(1, funnelSearch)}
            style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Refresh"
          >
            <RefreshCw size={13} color={MUTED} />
          </button>
        </div>

        {/* Count */}
        <div style={{ padding: '5px 12px 4px', fontSize: 10, color: MUTED }}>
          {funnelTotal} funnel{funnelTotal !== 1 ? 's' : ''}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          {loadingFunnels
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} color={BLUE} className="animate-spin" /></div>
            : funnels.length === 0
              ? <p style={{ textAlign: 'center', padding: 24, fontSize: 12, color: MUTED }}>No funnels</p>
              : funnels.map(f => {
                const isSelected = selectedFunnel?.funnel_id === f.funnel_id;
                return (
                  <button
                    key={f.funnel_id}
                    onClick={() => selectFunnel(f)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '11px 14px',
                      background: isSelected ? '#f0f4ff' : 'transparent',
                      borderLeft: isSelected ? `3px solid ${BLUE}` : '3px solid transparent',
                      borderTop: 'none', borderRight: 'none', borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {f.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: MUTED }}>{f.total_sessions} sessions</span>
                      <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>{f.completion_rate ?? 0}% done</span>
                      {f.anchor_config?.enabled && (
                        <Anchor size={9} color="#f59e0b" title="Has anchor question" />
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#c4b8b0', marginTop: 2 }}>{fmtDate(f.created_at)}</div>
                  </button>
                );
              })
          }
        </div>

        {/* Funnel pagination */}
        {totalFunnelPages > 1 && (
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button disabled={funnelPage <= 1} onClick={() => fetchFunnels(funnelPage - 1, funnelSearch)}
              style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: CARD, cursor: funnelPage <= 1 ? 'not-allowed' : 'pointer', opacity: funnelPage <= 1 ? 0.4 : 1 }}>
              <ChevronLeft size={13} color={TEXT} />
            </button>
            <span style={{ fontSize: 11, color: MUTED }}>{funnelPage} / {totalFunnelPages}</span>
            <button disabled={funnelPage >= totalFunnelPages} onClick={() => fetchFunnels(funnelPage + 1, funnelSearch)}
              style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: CARD, cursor: funnelPage >= totalFunnelPages ? 'not-allowed' : 'pointer', opacity: funnelPage >= totalFunnelPages ? 0.4 : 1 }}>
              <ChevronRight size={13} color={TEXT} />
            </button>
          </div>
        )}
      </div>

      {/* ══ RIGHT PANEL — Sessions ══ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {!selectedFunnel ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <Layers size={36} color="#d4cdc8" />
            <p style={{ fontSize: 13, color: MUTED }}>Select a funnel from the list to view sessions</p>
          </div>
        ) : (
          <>
            {/* ── Funnel header bar ── */}
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${BORDER}`, background: CARD, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{selectedFunnel.name}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    Created {fmtDate(selectedFunnel.created_at)}
                    {funnelMeta?.anchor_config?.enabled && (
                      <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#d97706', fontWeight: 600 }}>
                        <Anchor size={9} /> Anchor enabled
                      </span>
                    )}
                  </div>
                </div>
                {/* Stats pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total',      val: selectedFunnel.total_sessions, bg: '#f3f4f6', color: '#374151' },
                    { label: 'Completed',  val: selectedFunnel.completed,      bg: '#dcfce7', color: '#166534' },
                    { label: 'Terminated', val: selectedFunnel.terminated,     bg: '#fee2e2', color: '#991b1b' },
                    { label: 'No match',   val: selectedFunnel.no_match,       bg: '#fef9c3', color: '#854d0e' },
                  ].map(s => (
                    <span key={s.label} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
                      {s.val} {s.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Filter bar ── */}
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, background: '#faf8f6', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ flex: '1 1 180px', position: 'relative', minWidth: 0 }}>
                <Search size={12} color={MUTED} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  value={sessionSearch}
                  onChange={e => setSessionSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  placeholder="Email, session ID, status, job…"
                  style={{ ...inputStyle, paddingLeft: 26 }}
                />
              </div>

              {/* Date from */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Calendar size={12} color={MUTED} />
                <input type="date" value={sessionDateFrom} onChange={e => setSessionDateFrom(e.target.value)}
                  style={{ ...inputStyle, width: 130 }} />
                <span style={{ fontSize: 11, color: MUTED }}>–</span>
                <input type="date" value={sessionDateTo} onChange={e => setSessionDateTo(e.target.value)}
                  style={{ ...inputStyle, width: 130 }} />
              </div>

              <button onClick={applyFilters}
                style={{ padding: '7px 14px', borderRadius: 8, background: BLUE, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                Filter
              </button>

              {(sessionSearch || sessionDateFrom || sessionDateTo) && (
                <button onClick={() => { setSessionSearch(''); setSessionDateFrom(''); setSessionDateTo(''); fetchSessions(selectedFunnel.funnel_id, 1, '', '', ''); }}
                  style={{ padding: '7px 10px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                  Clear
                </button>
              )}
            </div>

            {/* ── Session count line ── */}
            {!loadingSessions && (
              <div style={{ padding: '5px 16px', borderBottom: `1px solid ${BORDER}`, background: '#fdfcfa', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: MUTED }}>{sessionTotal} session{sessionTotal !== 1 ? 's' : ''} · page {sessionPage} of {totalSessionPages}</span>
                <span style={{ fontSize: 10, color: MUTED }}>Newest first</span>
              </div>
            )}

            {/* ── Sessions list ── */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {loadingSessions && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Loader2 size={22} color={BLUE} className="animate-spin" />
                </div>
              )}

              {!loadingSessions && sessions.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
                  <p style={{ fontSize: 13, color: MUTED }}>No sessions match your filters.</p>
                </div>
              )}

              {!loadingSessions && sessions.map(s => {
                const sp = STATUS_PILL[s.status] || { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
                const anchorOk = s.anchor_qualified === true;
                const isOpen = expandedSession === s.funnel_session_id;

                return (
                  <div key={s.funnel_session_id} style={{ borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, overflow: 'hidden', boxShadow: '0 1px 3px rgba(45,37,32,0.04)' }}>
                    {/* Row */}
                    <div
                      onClick={() => setExpandedSession(isOpen ? null : s.funnel_session_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      {/* Status dot + pill */}
                      <span style={{
                        flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: sp.bg, color: sp.text, whiteSpace: 'nowrap',
                      }}>
                        {s.status.replace('_', ' ')}
                      </span>

                      {/* Identity & result */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.user_info?.email || s.user_info?.username || s.funnel_session_id.slice(0, 28) + '…'}
                        </div>
                        <div style={{ fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                          {s.matched_job
                            ? `✅ ${funnelMeta?.job_surveys?.[s.matched_job]?.display_name || s.matched_job}`
                            : s.terminate_reason
                              ? `❌ ${s.terminate_reason.slice(0, 60)}`
                              : (s.failed_jobs || []).length > 0
                                ? `Failed: ${s.failed_jobs!.slice(0, 3).join(', ')}`
                                : 'In progress'}
                        </div>
                      </div>

                      {/* Right badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {/* Anchor badge */}
                        {funnelMeta?.anchor_config?.enabled && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                            background: anchorOk ? '#fef3c7' : '#f3f4f6',
                            color: anchorOk ? '#92400e' : '#9ca3af',
                          }}>
                            <Anchor size={9} />
                            {anchorOk ? '✓' : '✗'}
                          </span>
                        )}

                        {/* Score chips */}
                        {s.cumulative_scores && Object.entries(s.cumulative_scores).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280' }}>
                            {k.slice(0, 8)}:{v}
                          </span>
                        ))}

                        {s.redirect_bucket && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                            {s.redirect_bucket}
                          </span>
                        )}

                        <span style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap' }}>{fmt(s.created_at)}</span>
                        {isOpen ? <ChevronDown size={13} color={MUTED} /> : <ChevronRight size={13} color={MUTED} />}
                      </div>
                    </div>

                    {/* Expanded timeline */}
                    {isOpen && funnelMeta && (
                      <SessionTimeline session={s} meta={funnelMeta} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Session pagination ── */}
            {totalSessionPages > 1 && !loadingSessions && (
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}`, background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexShrink: 0 }}>
                <button
                  disabled={sessionPage <= 1}
                  onClick={() => fetchSessions(selectedFunnel.funnel_id, sessionPage - 1, sessionSearch, sessionDateFrom, sessionDateTo)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, cursor: sessionPage <= 1 ? 'not-allowed' : 'pointer', opacity: sessionPage <= 1 ? 0.4 : 1, fontSize: 12, color: TEXT, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span style={{ fontSize: 12, color: MUTED }}>Page {sessionPage} of {totalSessionPages}</span>
                <button
                  disabled={sessionPage >= totalSessionPages}
                  onClick={() => fetchSessions(selectedFunnel.funnel_id, sessionPage + 1, sessionSearch, sessionDateFrom, sessionDateTo)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, cursor: sessionPage >= totalSessionPages ? 'not-allowed' : 'pointer', opacity: sessionPage >= totalSessionPages ? 0.4 : 1, fontSize: 12, color: TEXT, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FunnelTrackingTab;
