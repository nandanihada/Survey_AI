/**
 * SurveyClickTrackingTab
 * Admin view of per-survey link click data.
 * - Left panel is sticky (doesn't scroll with records)
 * - Surveys sorted by latest click by default, toggle available
 * - Location shown from stored geo data
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  MousePointerClick, CheckCircle, XCircle, RefreshCw, Search,
  ChevronDown, ChevronRight, BarChart2, Clock, Monitor, Smartphone,
  Tablet, ArrowDown, ArrowUp
} from 'lucide-react';

const baseUrl = getApiBaseUrl();

// ── Helpers ─────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    let s = iso;
    if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-', 10)) s += 'Z';
    return new Date(s).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) + ' IST';
  } catch { return iso || '—'; }
}

function deviceIcon(type?: string) {
  if (type === 'mobile') return <Smartphone size={12} />;
  if (type === 'tablet') return <Tablet size={12} />;
  return <Monitor size={12} />;
}

// ── Types ────────────────────────────────────────────────────────────────

interface SurveyMeta {
  _id: string;
  title: string;
  survey_status: string;
  total_clicks: number;
  unique_visitors: number;
  submitted: number;
  conversion_rate: number;
  last_click: string | null;
}

interface ClickRecord {
  _id: string;
  survey_id: string;
  click_id?: string;
  user_id?: string;
  username?: string;
  aff_sub?: string;
  first_click_time?: string;
  last_click_time?: string;
  click_count: number;
  ip_address?: string;
  user_agent?: string;
  submission_status: 'submitted' | 'not_submitted';
  submission_count: number;
  last_submission_time?: string;
  device_info?: { device_type?: string; browser?: string };
  location?: { city?: string; region?: string; country?: string };
  url_params?: Record<string, string>;
  evaluation_results?: Array<{ submission_time: string; status: string; score: number }>;
  click_history?: Array<{ timestamp: string; ip_address: string; url_params: Record<string, string> }>;
}

interface Summary {
  total_clicks: number;
  unique_users: number;
  submitted: number;
  not_submitted: number;
  conversion_rate: number;
}

type StatusFilter = 'all' | 'submitted' | 'not_submitted';
type SortOrder = 'last_click' | 'most_clicks' | 'name';

// ── Survey list panel (sticky, doesn't scroll with records) ──────────────

function SurveyListPanel({
  surveys,
  selected,
  onSelect,
  loading,
  searchQ,
  setSearchQ,
  sortOrder,
  setSortOrder,
}: {
  surveys: SurveyMeta[];
  selected: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  searchQ: string;
  setSearchQ: (q: string) => void;
  sortOrder: SortOrder;
  setSortOrder: (s: SortOrder) => void;
}) {
  // Filter then sort
  const filtered = surveys
    .filter(s =>
      s.title?.toLowerCase().includes(searchQ.toLowerCase()) ||
      s._id?.toLowerCase().includes(searchQ.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'last_click') {
        const ta = a.last_click ? new Date(a.last_click).getTime() : 0;
        const tb = b.last_click ? new Date(b.last_click).getTime() : 0;
        return tb - ta;
      }
      if (sortOrder === 'most_clicks') return b.total_clicks - a.total_clicks;
      return (a.title || '').localeCompare(b.title || '');
    });

  return (
    // position: sticky keeps the panel in place while the right side scrolls
    <div style={{
      width: 260, minWidth: 260,
      borderRight: '1px solid #EBE8E3',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0,
      height: '100%', overflow: 'hidden',
    }}>
      {/* Search */}
      <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid #F5F1E8', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#C4A99A', pointerEvents: 'none' }} />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search surveys…"
            style={{ width: '100%', paddingLeft: 26, paddingRight: 8, paddingTop: 6, paddingBottom: 6, fontSize: 11, border: '1px solid #EBE8E3', borderRadius: 8, background: '#FAF8F5', color: '#3D3530', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Sort toggle */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #F5F1E8', display: 'flex', gap: 4, flexShrink: 0 }}>
        {([
          { id: 'last_click', label: 'Latest click' },
          { id: 'most_clicks', label: 'Most clicks' },
          { id: 'name', label: 'A–Z' },
        ] as { id: SortOrder; label: string }[]).map(opt => (
          <button
            key={opt.id}
            onClick={() => setSortOrder(opt.id)}
            style={{
              flex: 1, padding: '4px 4px', fontSize: 9.5, fontWeight: sortOrder === opt.id ? 700 : 500,
              border: '1px solid', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              borderColor: sortOrder === opt.id ? '#C4785C' : '#EBE8E3',
              background: sortOrder === opt.id ? '#FEF0EC' : '#FDFCFA',
              color: sortOrder === opt.id ? '#C4785C' : '#9B9189',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.id === 'last_click' && <ArrowDown size={8} style={{ display: 'inline', marginRight: 2 }} />}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <div className="animate-spin" style={{ width: 20, height: 20, border: '2px solid #EBE8E3', borderTopColor: '#C4785C', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '40px 12px', textAlign: 'center', color: '#C4A99A', fontSize: 11 }}>
            No surveys with click data yet
          </div>
        )}
        {!loading && filtered.map(s => {
          const isSelected = selected === s._id;
          const lastClickStr = s.last_click ? formatDate(s.last_click) : null;
          return (
            <button
              key={s._id}
              onClick={() => onSelect(s._id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: isSelected ? '#FEF0EC' : 'transparent',
                borderLeft: isSelected ? '3px solid #C4785C' : '3px solid transparent',
                borderBottom: '1px solid #F5F1E8',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#FEF9F7'; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <p style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#C4785C' : '#2D2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title || 'Untitled'}
              </p>
              <p style={{ fontSize: 9.5, color: '#9B9189', margin: '2px 0 0', fontFamily: 'monospace' }}>{s._id}</p>
              {/* Last click time */}
              {lastClickStr && (
                <p style={{ fontSize: 9.5, color: '#C4A99A', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={8} />
                  {lastClickStr}
                </p>
              )}
              <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9.5, background: '#F5F1E8', color: '#6B6158', padding: '1px 5px', borderRadius: 7 }}>
                  {s.unique_visitors} visitor{s.unique_visitors !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 9.5, background: s.submitted > 0 ? '#ECFDF5' : '#F5F1E8', color: s.submitted > 0 ? '#059669' : '#9B9189', padding: '1px 5px', borderRadius: 7 }}>
                  {s.submitted} done
                </span>
                <span style={{ fontSize: 9.5, background: '#FEF0EC', color: '#C4785C', padding: '1px 5px', borderRadius: 7 }}>
                  {s.conversion_rate}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Click records table ──────────────────────────────────────────────────

function ClickRecordsTable({ records, loading }: { records: ClickRecord[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return (
    <div style={{ padding: '60px 0', textAlign: 'center' }}>
      <div className="animate-spin" style={{ width: 28, height: 28, border: '2.5px solid #EBE8E3', borderTopColor: '#C4785C', borderRadius: '50%', margin: '0 auto 10px' }} />
      <p style={{ fontSize: 12, color: '#9B9189' }}>Loading clicks…</p>
    </div>
  );

  if (records.length === 0) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#9B9189', fontSize: 13 }}>
      No click records match the current filter
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #EBE8E3' }}>
            {['User / ID', 'Location', 'IP Address', 'Device', 'Clicks', 'First Click', 'Last Click', 'Status', 'Submits', ''].map(h => (
              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9B9189', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map(r => {
            const isExpanded = expanded === r._id;
            const displayName = r.username && r.username !== 'anonymous' ? r.username
              : r.click_id ? `cid:${r.click_id}` : r.user_id ? `uid:${r.user_id}` : '—';
            const isSubmitted = r.submission_status === 'submitted';
            const locParts = [r.location?.city, r.location?.country].filter(Boolean);

            return (
              <React.Fragment key={r._id}>
                <tr
                  style={{ borderBottom: '1px solid #F5F1E8', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FEF9F7'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  onClick={() => setExpanded(isExpanded ? null : r._id)}
                >
                  {/* User */}
                  <td style={{ padding: '10px 12px' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#2D2520' }}>{displayName}</p>
                    {r.aff_sub && r.aff_sub !== r.username && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9B9189' }}>sub: {r.aff_sub}</p>
                    )}
                  </td>
                  {/* Location */}
                  <td style={{ padding: '10px 12px' }}>
                    {locParts.length > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#F0FAF5', color: '#1E7A5C', padding: '2px 8px', borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1E7A5C"/></svg>
                        {locParts.join(', ')}
                      </span>
                    ) : (
                      <span style={{ color: '#C4A99A', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  {/* IP */}
                  <td style={{ padding: '10px 12px', color: '#6B6158', fontFamily: 'monospace', fontSize: 11 }}>{r.ip_address || '—'}</td>
                  {/* Device */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B6158' }}>
                      {deviceIcon(r.device_info?.device_type)}
                      <span style={{ fontSize: 11 }}>{r.device_info?.browser || '—'}</span>
                    </span>
                  </td>
                  {/* Clicks */}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#C4785C', background: '#FEF0EC', padding: '2px 8px', borderRadius: 8 }}>{r.click_count}</span>
                  </td>
                  {/* First click */}
                  <td style={{ padding: '10px 12px', color: '#9B9189', whiteSpace: 'nowrap', fontSize: 11 }}>{formatDate(r.first_click_time)}</td>
                  {/* Last click */}
                  <td style={{ padding: '10px 12px', color: '#9B9189', whiteSpace: 'nowrap', fontSize: 11 }}>{formatDate(r.last_click_time)}</td>
                  {/* Status */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                      background: isSubmitted ? '#ECFDF5' : '#FEF2F2',
                      color: isSubmitted ? '#059669' : '#DC2626',
                    }}>
                      {isSubmitted ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {isSubmitted ? 'Completed' : 'Not completed'}
                    </span>
                  </td>
                  {/* Submission count */}
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6B6158' }}>{r.submission_count || 0}</td>
                  {/* Expand */}
                  <td style={{ padding: '10px 12px', color: '#C4A99A' }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                </tr>

                {/* Expanded detail */}
                {isExpanded && (
                  <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #EBE8E3' }}>
                    <td colSpan={10} style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                        {/* Full location */}
                        {r.location && (r.location.city || r.location.country) && (
                          <div style={{ background: '#fff', border: '1px solid #EBE8E3', borderRadius: 10, padding: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189', margin: '0 0 8px' }}>Location</p>
                            {r.location.city && <div style={{ fontSize: 11, color: '#2D2520', marginBottom: 3 }}>📍 {r.location.city}{r.location.region ? `, ${r.location.region}` : ''}</div>}
                            {r.location.country && <div style={{ fontSize: 11, color: '#6B6158' }}>🌐 {r.location.country}</div>}
                            {r.ip_address && <div style={{ fontSize: 10, color: '#9B9189', marginTop: 4, fontFamily: 'monospace' }}>{r.ip_address}</div>}
                          </div>
                        )}
                        {/* URL params */}
                        {r.url_params && Object.keys(r.url_params).length > 0 && (
                          <div style={{ background: '#fff', border: '1px solid #EBE8E3', borderRadius: 10, padding: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189', margin: '0 0 8px' }}>URL Parameters</p>
                            {Object.entries(r.url_params).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: '#9B9189', minWidth: 80 }}>{k}</span>
                                <span style={{ color: '#2D2520', fontWeight: 500, fontFamily: 'monospace' }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Evaluation results */}
                        {r.evaluation_results && r.evaluation_results.length > 0 && (
                          <div style={{ background: '#fff', border: '1px solid #EBE8E3', borderRadius: 10, padding: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189', margin: '0 0 8px' }}>Evaluation Results</p>
                            {r.evaluation_results.map((ev, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
                                <span style={{ padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: ev.status === 'pass' ? '#ECFDF5' : '#FEF2F2', color: ev.status === 'pass' ? '#059669' : '#DC2626' }}>{ev.status}</span>
                                <span style={{ color: '#6B6158' }}>score: {ev.score}</span>
                                <span style={{ color: '#C4A99A', fontSize: 10 }}>{formatDate(ev.submission_time)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Click history */}
                        {r.click_history && r.click_history.length > 0 && (
                          <div style={{ background: '#fff', border: '1px solid #EBE8E3', borderRadius: 10, padding: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B9189', margin: '0 0 8px' }}>Click History (last {r.click_history.length})</p>
                            {r.click_history.map((ch, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                                <Clock size={10} color="#C4A99A" />
                                <span style={{ color: '#9B9189' }}>{formatDate(ch.timestamp)}</span>
                                {ch.ip_address && <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6158' }}>{ch.ip_address}</span>}
                              </div>
                            ))}
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
  );
}

// ── Summary bar ──────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: Summary | null }) {
  if (!summary) return null;
  const cards = [
    { label: 'Total Clicks', value: summary.total_clicks, color: '#C4785C', bg: '#FEF0EC' },
    { label: 'Unique Visitors', value: summary.unique_users, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Completed', value: summary.submitted, color: '#059669', bg: '#ECFDF5' },
    { label: 'Not Completed', value: summary.not_submitted, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Conversion', value: `${summary.conversion_rate}%`, color: '#D97706', bg: '#FFFBEB' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #F5F1E8', flexShrink: 0 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '7px 13px', minWidth: 88 }}>
          <p style={{ fontSize: 9.5, color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>{c.label}</p>
          <p style={{ fontSize: 17, fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────

const SurveyClickTrackingTab: React.FC = () => {
  const [surveys, setSurveys] = useState<SurveyMeta[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(true);
  const [surveySearch, setSurveySearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('last_click');

  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [records, setRecords] = useState<ClickRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const token = () => localStorage.getItem('auth_token') || '';

  const loadSurveys = useCallback(async () => {
    setSurveysLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/survey-clicks/surveys-list`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: SurveyMeta[] = data.surveys || [];
        setSurveys(list);
        if (!selectedSurvey && list.length > 0) setSelectedSurvey(list[0]._id);
      }
    } catch { /* silent */ }
    setSurveysLoading(false);
  }, [selectedSurvey]);

  const loadRecords = useCallback(async () => {
    if (!selectedSurvey) return;
    setRecordsLoading(true);
    try {
      const params = new URLSearchParams({ survey_id: selectedSurvey, status: statusFilter, limit: '500' });
      const res = await fetch(`${baseUrl}/api/admin/survey-clicks?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || null);
        setTotal(data.total || 0);
      }
    } catch { /* silent */ }
    setRecordsLoading(false);
  }, [selectedSurvey, statusFilter]);

  useEffect(() => { loadSurveys(); }, []);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const selectedMeta = surveys.find(s => s._id === selectedSurvey);

  return (
    // Full height flex container — left panel sticky, right panel scrolls independently
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: 500, overflow: 'hidden' }}>

      {/* ── Left: sticky survey list ── */}
      <SurveyListPanel
        surveys={surveys}
        selected={selectedSurvey}
        onSelect={id => { setSelectedSurvey(id); setStatusFilter('all'); }}
        loading={surveysLoading}
        searchQ={surveySearch}
        setSearchQ={setSurveySearch}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      {/* ── Right: scrollable records panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header — fixed at top of right panel */}
        <div style={{ padding: '13px 16px', borderBottom: '1px solid #F5F1E8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, flexShrink: 0, background: '#FDFCFA' }}>
          <div>
            {selectedMeta ? (
              <>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#2D2520', margin: 0 }}>{selectedMeta.title || 'Untitled Survey'}</p>
                <p style={{ fontSize: 10, color: '#9B9189', margin: '2px 0 0', fontFamily: 'monospace' }}>{selectedMeta._id}</p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#9B9189', margin: 0 }}>Select a survey on the left</p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status filter */}
            <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid #EBE8E3' }}>
              {(['all', 'submitted', 'not_submitted'] as StatusFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    padding: '5px 11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                    background: statusFilter === f ? '#C4785C' : '#FDFCFA',
                    color: statusFilter === f ? '#fff' : '#6B6158',
                    borderRight: f !== 'not_submitted' ? '1px solid #EBE8E3' : 'none',
                    transition: 'background 0.12s',
                  }}
                >
                  {f === 'all' ? 'All' : f === 'submitted' ? '✓ Completed' : '✗ Not completed'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { loadSurveys(); loadRecords(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 11, fontWeight: 600, background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 9, cursor: 'pointer', color: '#6B6158', fontFamily: 'inherit' }}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>

        {/* Summary bar — fixed */}
        {selectedSurvey && <SummaryBar summary={summary} />}

        {/* Record count — fixed */}
        {selectedSurvey && !recordsLoading && (
          <div style={{ padding: '6px 16px', borderBottom: '1px solid #F5F1E8', fontSize: 11, color: '#9B9189', flexShrink: 0, background: '#FDFCFA' }}>
            Showing {records.length} of {total} record{total !== 1 ? 's' : ''}
            {statusFilter !== 'all' && (
              <span style={{ marginLeft: 8, background: '#FEF0EC', color: '#C4785C', padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>
                {statusFilter === 'submitted' ? 'Completed only' : 'Not completed only'}
              </span>
            )}
          </div>
        )}

        {/* Empty states */}
        {!selectedSurvey && !surveysLoading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#9B9189' }}>
            <MousePointerClick size={36} color="#EBE8E3" />
            <p style={{ marginTop: 12, fontSize: 13 }}>Select a survey to view click data</p>
          </div>
        )}
        {!surveysLoading && surveys.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#9B9189' }}>
            <BarChart2 size={36} color="#EBE8E3" />
            <p style={{ marginTop: 12, fontSize: 13 }}>No click tracking data yet</p>
            <p style={{ fontSize: 11, color: '#C4A99A', marginTop: 4 }}>Clicks appear once survey links are visited</p>
          </div>
        )}

        {/* Scrollable records table */}
        {selectedSurvey && (
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            <ClickRecordsTable records={records} loading={recordsLoading} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyClickTrackingTab;
