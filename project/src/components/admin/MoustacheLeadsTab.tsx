/**
 * MoustacheLeadsTab
 * Shows MoustacheLeads API integration stats:
 *  - Total requests received
 *  - How many generated (done), in-queue, processing, errored
 *  - Breakdown by survey vs funnel
 *  - Recent requests table with status, type, description, timestamps, result URL
 *  - Auto-refreshes every 10 seconds while mounted
 */
import React, { useEffect, useState, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import { RefreshCw, ExternalLink, CheckCircle, Clock, Loader, XCircle, Inbox } from 'lucide-react';

interface QueueItem {
  request_id: string;
  type: 'survey' | 'funnel';
  status: 'queued' | 'processing' | 'done' | 'error';
  description: string;
  queued_at: string;
  completed_at?: string;
  result?: {
    survey_url?: string;
    funnel_url?: string;
    title?: string;
    surveys_generated?: number;
  };
  error?: string;
}

interface Stats {
  total_received: number;
  total_done: number;
  total_error: number;
  total_queued: number;
  total_processing: number;
  surveys_generated: number;
  funnels_generated: number;
  recent_requests: QueueItem[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  done:       { label: 'Done',       bg: '#F0FDF4', color: '#16A34A', icon: <CheckCircle size={11} /> },
  queued:     { label: 'Queued',     bg: '#FFF7ED', color: '#EA580C', icon: <Clock size={11} /> },
  processing: { label: 'Processing', bg: '#EFF6FF', color: '#2563EB', icon: <Loader size={11} style={{ animation: 'spin 0.9s linear infinite' }} /> },
  error:      { label: 'Error',      bg: '#FEF2F2', color: '#DC2626', icon: <XCircle size={11} /> },
};

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#FDFCFA', border: '1px solid #EBE8E3', borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: accent || '#2D2520', margin: 0, lineHeight: 1.1 }}>{value.toLocaleString()}</p>
      {sub && <p style={{ fontSize: 10, color: '#C4A99A', margin: 0 }}>{sub}</p>}
    </div>
  );
}

const MoustacheLeadsTab: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/external/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Stats = await res.json();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const fmt = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const resultUrl = (item: QueueItem) =>
    item.result?.survey_url || item.result?.funnel_url || null;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5F1E8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2D2520', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 8, background: '#1A1A2E', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14 }}>M</span>
            </span>
            MoustacheLeads API
          </p>
          <p style={{ fontSize: 11, color: '#9B9189', margin: '3px 0 0' }}>
            External survey generation requests — auto-refreshes every 10s
            {lastRefreshed && <> · Last updated {lastRefreshed.toLocaleTimeString()}</>}
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 13px', fontSize: 11, fontWeight: 600,
            background: '#F5F1E8', border: '1px solid #EBE8E3',
            borderRadius: 8, cursor: 'pointer', color: '#6B6158',
            fontFamily: 'inherit', opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #EBE8E3', borderTopColor: '#C4785C', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 12, color: '#9B9189' }}>Loading stats…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <XCircle size={28} color="#EBE8E3" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>
          <button onClick={() => fetchStats()} style={{ marginTop: 12, padding: '6px 16px', fontSize: 11, fontWeight: 600, background: '#C4785C', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && stats && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12, padding: '16px 20px 12px' }}>
            <StatCard label="Requests Received"  value={stats.total_received}    sub="All time" />
            <StatCard label="Generated"          value={stats.total_done}        sub="Surveys + funnels" accent="#16A34A" />
            <StatCard label="Surveys Generated"  value={stats.surveys_generated} sub="survey type" />
            <StatCard label="Funnels Generated"  value={stats.funnels_generated} sub="funnel type" />
            <StatCard label="In Queue"           value={stats.total_queued}      sub="Waiting" accent="#EA580C" />
            <StatCard label="Processing"         value={stats.total_processing}  sub="Active now" accent="#2563EB" />
            <StatCard label="Errors"             value={stats.total_error}       sub="Failed" accent={stats.total_error > 0 ? '#DC2626' : undefined} />
          </div>

          {/* API Key info box */}
          <div style={{ margin: '0 20px 16px', padding: '12px 16px', background: '#F5F1E8', borderRadius: 10, border: '1px solid #EBE8E3', fontSize: 11, color: '#6B6158', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>API Key:</span>
            <code style={{ fontFamily: 'monospace', letterSpacing: 1, background: '#EBE8E3', padding: '2px 8px', borderRadius: 5 }}>
              pw_moustache_secret_key_2025
            </code>
            <span style={{ color: '#C4A99A', marginLeft: 4 }}>
              — Send as <code style={{ background: '#EBE8E3', padding: '1px 5px', borderRadius: 4 }}>X-API-Key</code> header
            </span>
          </div>

          {/* Recent requests table */}
          <div style={{ margin: '0 20px 20px', border: '1px solid #EBE8E3', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#FAF8F5', borderBottom: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#2D2520', margin: 0 }}>Recent Requests</p>
              <p style={{ fontSize: 10, color: '#9B9189', margin: 0 }}>Showing last 20</p>
            </div>

            {stats.recent_requests.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <Inbox size={28} color="#EBE8E3" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 12, color: '#9B9189' }}>No requests yet</p>
                <p style={{ fontSize: 10, color: '#C4A99A', marginTop: 4 }}>
                  MoustacheLeads hasn't sent any requests to this server yet.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #EBE8E3' }}>
                      {['Request ID', 'Type', 'Status', 'Description', 'Queued At', 'Completed At', 'Result'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_requests.map((item) => {
                      const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.queued;
                      const url = resultUrl(item);
                      return (
                        <tr
                          key={item.request_id}
                          style={{ borderBottom: '1px solid #F5F1E8', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FEF9F7'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                        >
                          {/* Request ID */}
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, background: '#F5F1E8', padding: '2px 7px', borderRadius: 5, color: '#6B6158' }}>
                              {item.request_id}
                            </span>
                          </td>

                          {/* Type */}
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: item.type === 'funnel' ? '#EFF6FF' : '#FEF0EC',
                              color: item.type === 'funnel' ? '#2563EB' : '#C4785C',
                            }}>
                              {item.type === 'funnel' ? '🔀' : '📋'} {item.type}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                              background: sc.bg, color: sc.color,
                            }}>
                              {sc.icon} {sc.label}
                            </span>
                          </td>

                          {/* Description */}
                          <td style={{ padding: '11px 14px', maxWidth: 280 }}>
                            <p style={{ margin: 0, color: '#2D2520', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={item.description}>
                              {item.description}
                            </p>
                            {item.error && (
                              <p style={{ margin: '2px 0 0', color: '#DC2626', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={item.error}>
                                ✕ {item.error}
                              </p>
                            )}
                            {item.result?.title && (
                              <p style={{ margin: '2px 0 0', color: '#9B9189', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{item.result.title}"
                              </p>
                            )}
                          </td>

                          {/* Queued At */}
                          <td style={{ padding: '11px 14px', color: '#9B9189', whiteSpace: 'nowrap', fontSize: 11 }}>
                            {fmt(item.queued_at)}
                          </td>

                          {/* Completed At */}
                          <td style={{ padding: '11px 14px', color: '#9B9189', whiteSpace: 'nowrap', fontSize: 11 }}>
                            {fmt(item.completed_at)}
                          </td>

                          {/* Result URL */}
                          <td style={{ padding: '11px 14px' }}>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#C4785C', textDecoration: 'none' }}
                              >
                                <ExternalLink size={10} /> Open
                              </a>
                            ) : (
                              <span style={{ color: '#C4A99A', fontSize: 10 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PowerShell / curl test commands */}
          <div style={{ margin: '0 20px 24px', border: '1px solid #EBE8E3', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1A1A2E', borderBottom: '1px solid #2D2D4E' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#F5C842', margin: 0 }}>Test Commands (run in PowerShell)</p>
            </div>
            <div style={{ background: '#1A1A2E', padding: '14px 16px', overflowX: 'auto' }}>
              <pre style={{ fontSize: 11, color: '#94A3B8', margin: 0, lineHeight: 1.8, fontFamily: 'Consolas, monospace' }}>{`# 1. Submit a survey request (returns request_id immediately)
curl.exe -X POST http://localhost:5000/api/external/generate \`
  -H "X-API-Key: pw_moustache_secret_key_2025" \`
  -H "Content-Type: application/json" \`
  -d '{"type":"survey","description":"Payday loan survey for salaried employees","question_count":8}'

# 2. Poll status using the request_id from above
curl.exe -X GET http://localhost:5000/api/external/status/mq_XXXXXXXXXX \`
  -H "X-API-Key: pw_moustache_secret_key_2025"

# 3. Submit multiple requests at once (processed one-by-one)
curl.exe -X POST http://localhost:5000/api/external/generate \`
  -H "X-API-Key: pw_moustache_secret_key_2025" \`
  -H "Content-Type: application/json" \`
  -d '{"type":"funnel","description":"Match users to best insurance plan"}'`}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MoustacheLeadsTab;
