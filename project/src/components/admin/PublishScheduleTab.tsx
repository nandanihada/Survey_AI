/**
 * PublishScheduleTab
 * Shows all scheduled, done, failed and cancelled Moustache + LinkedIn publishes
 * in IST with filter controls and cancel capability.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Linkedin, RefreshCw, Trash2,
  CheckCircle, XCircle, Clock, AlertCircle, Loader2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleItem {
  _id: string;
  type: 'moustache' | 'linkedin';
  survey_id: string;
  survey_title: string;
  status: 'scheduled' | 'processing' | 'done' | 'failed' | 'cancelled';
  publish_at: string;
  scheduled_at: string;
  fired_at?: string;
  completed_at?: string;
  error?: string;
  result?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toIST = (iso: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  scheduled:  { bg: '#EFF8FF', color: '#0369A1', label: 'Scheduled' },
  processing: { bg: '#FEF9C3', color: '#92400E', label: 'Processing' },
  done:       { bg: '#F0FDF4', color: '#15803D', label: 'Done' },
  failed:     { bg: '#FEF2F2', color: '#DC2626', label: 'Failed' },
  cancelled:  { bg: '#F5F1E8', color: '#9B9189', label: 'Cancelled' },
};

// ─── Component ────────────────────────────────────────────────────────────────

const PublishScheduleTab: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const token   = () => localStorage.getItem('auth_token') || '';

  const [items, setItems]         = useState<ScheduleItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 20;

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType,   setFilterType]   = useState<string>('all');

  const [cancelling, setCancelling] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async (p = 1, status = filterStatus, type = filterType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), per_page: String(perPage),
        status, type,
      });
      const res  = await fetch(`${baseUrl}/api/admin/publish-schedule?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setPage(p);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [baseUrl, filterStatus, filterType]);

  useEffect(() => { fetchItems(1, filterStatus, filterType); }, [filterStatus, filterType]);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this scheduled publish?')) return;
    setCancelling(id);
    try {
      await fetch(`${baseUrl}/api/admin/publish-schedule/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
      });
      fetchItems(page, filterStatus, filterType);
    } catch { /* silent */ }
    finally { setCancelling(null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 3, background: '#F5F1E8', borderRadius: 9, padding: 3 }}>
          {(['all', 'moustache', 'linkedin'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: 'none',
                background: filterType === t ? '#FDFCFA' : 'transparent',
                color: filterType === t ? '#C4785C' : '#9B9189',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: filterType === t ? '0 1px 3px rgba(45,37,32,0.1)' : 'none',
              }}
            >
              {t === 'all' ? 'All' : t === 'moustache' ? '🟡 Moustache' : '🔵 LinkedIn'}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ fontSize: 12, border: '1px solid #EBE8E3', borderRadius: 9, padding: '6px 10px', background: '#FDFCFA', fontFamily: 'inherit', color: '#6B6158' }}
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="done">Done</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={() => fetchItems(page, filterStatus, filterType)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 9, padding: '6px 12px', fontSize: 12, color: '#6B6158', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <RefreshCw size={12} /> Refresh
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9B9189' }}>
          {total} total
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ border: '1px solid #EBE8E3', borderRadius: 12, overflow: 'hidden', background: '#FDFCFA' }}>

        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1fr 120px 160px 160px 100px 60px',
          padding: '9px 16px', background: '#F9F7F4', borderBottom: '1px solid #EBE8E3',
          fontSize: 10, fontWeight: 700, color: '#9B9189', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>Type</span>
          <span>Survey / Funnel</span>
          <span>Status</span>
          <span>Scheduled for (IST)</span>
          <span>Created at (IST)</span>
          <span>Result</span>
          <span></span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10, color: '#9B9189' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 12 }}>Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9B9189', fontSize: 13 }}>
            No scheduled publishes found
          </div>
        ) : items.map(item => {
          const s = STATUS_STYLE[item.status] || STATUS_STYLE.cancelled;
          return (
            <div key={item._id} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 120px 160px 160px 100px 60px',
              padding: '12px 16px', borderBottom: '1px solid #F5F1E8', alignItems: 'center',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FEF9F7'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {/* Type badge */}
              <div>
                {item.type === 'linkedin' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EFF8FF', border: '1px solid #BAE6FD', borderRadius: 7, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#0369A1' }}>
                    <Linkedin size={10} fill="#0369A1" /> LinkedIn
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#1A1A2E', borderRadius: 7, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#F5C842' }}>
                    <span style={{ fontWeight: 900 }}>M</span> Moustache
                  </span>
                )}
              </div>

              {/* Title + ID */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#2D2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.survey_title || item.survey_id}
                </p>
                <p style={{ fontSize: 10, color: '#9B9189', margin: 0 }}>ID: {item.survey_id}</p>
              </div>

              {/* Status */}
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, borderRadius: 8, padding: '3px 9px', fontSize: 10, fontWeight: 700 }}>
                  {item.status === 'scheduled'  && <Clock size={10} />}
                  {item.status === 'done'        && <CheckCircle size={10} />}
                  {item.status === 'failed'      && <XCircle size={10} />}
                  {item.status === 'cancelled'   && <XCircle size={10} />}
                  {item.status === 'processing'  && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                  {s.label}
                </span>
              </div>

              {/* Scheduled for */}
              <div style={{ fontSize: 11, color: '#6B6158' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={10} color="#C4785C" /> {toIST(item.publish_at)}
                </span>
              </div>

              {/* Created at */}
              <div style={{ fontSize: 11, color: '#9B9189' }}>
                {toIST(item.scheduled_at)}
              </div>

              {/* Result / error */}
              <div style={{ fontSize: 10, color: item.error ? '#DC2626' : '#9B9189', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.error || ''}>
                {item.status === 'done'   && item.result?.post_url
                  ? <a href={item.result.post_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0A66C2', fontSize: 10 }}>View post</a>
                  : item.status === 'done'   ? '✓ Published'
                  : item.status === 'failed' ? (item.error || 'Error')
                  : '—'
                }
              </div>

              {/* Cancel button */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {item.status === 'scheduled' && (
                  <button
                    onClick={() => cancel(item._id)}
                    disabled={cancelling === item._id}
                    title="Cancel"
                    style={{ background: 'none', border: '1px solid #EBE8E3', borderRadius: 7, padding: '4px 7px', cursor: 'pointer', color: '#C4A99A', display: 'flex', alignItems: 'center' }}
                  >
                    {cancelling === item._id
                      ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Trash2 size={12} />
                    }
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#9B9189' }}>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            <button disabled={page <= 1} onClick={() => fetchItems(page - 1, filterStatus, filterType)}
              style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EBE8E3', background: page <= 1 ? '#F5F1E8' : '#FDFCFA', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page <= 1 ? 0.4 : 1 }}>
              <ChevronLeft size={13} color="#6B6158" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
              return (
                <button key={pg} onClick={() => fetchItems(pg, filterStatus, filterType)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EBE8E3', background: page === pg ? '#C4785C' : '#FDFCFA', color: page === pg ? '#fff' : '#6B6158', cursor: 'pointer', fontSize: 12, fontWeight: page === pg ? 700 : 400, fontFamily: 'inherit' }}>
                  {pg}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => fetchItems(page + 1, filterStatus, filterType)}
              style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EBE8E3', background: page >= totalPages ? '#F5F1E8' : '#FDFCFA', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page >= totalPages ? 0.4 : 1 }}>
              <ChevronRight size={13} color="#6B6158" />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PublishScheduleTab;
