/**
 * SurveyFlowTrackingTab
 * Flat, time-sorted table of every response (partial + submitted) across all surveys.
 * Columns: Time | Survey | Creator | Respondent | Qs Answered | Status | Redirected To | Answers ▼
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, GitBranch, CheckCircle2, ChevronDown, ChevronRight,
  ExternalLink, Download, Filter, Clock, BarChart2
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlowRow {
  response_id: string;
  session_id: string;
  survey_id: string;
  survey_title: string;
  creator_email: string;
  submitted_at: string | null;
  partial_submitted_at: string | null;
  email: string;
  username: string;
  click_id: string;
  ip: string;
  questions_answered: number;
  answers: Record<string, string>;
  redirected_to_url: string;
  redirect_node_id: string;
  status: 'partial' | 'submitted';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const shortUrl = (url: string) => {
  if (!url) return '—';
  try { const u = new URL(url); return u.hostname + u.pathname.slice(0, 25); }
  catch { return url.slice(0, 35); }
};

const rowTime = (r: FlowRow) => r.submitted_at || r.partial_submitted_at || '';

// ─── Expanded answer panel ────────────────────────────────────────────────────
const AnswerPanel: React.FC<{ answers: Record<string, string> }> = ({ answers }) => {
  const entries = Object.entries(answers);
  if (!entries.length) return <p className="text-xs text-gray-400 italic">No answers recorded</p>;
  return (
    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left px-3 py-1.5 text-gray-500 font-semibold w-8">#</th>
          <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Question ID</th>
          <th className="text-left px-3 py-1.5 text-gray-500 font-semibold">Answer</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([qid, ans], i) => (
          <tr key={qid} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
            <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">{qid}</td>
            <td className="px-3 py-2 text-gray-800 font-medium">{ans}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Single table row ─────────────────────────────────────────────────────────
const TableRow: React.FC<{ row: FlowRow; idx: number }> = ({ row, idx }) => {
  const [expanded, setExpanded] = useState(false);
  const isPartial = row.status === 'partial';
  const time = rowTime(row);
  const identity = row.email || row.username || row.click_id || row.ip || '—';

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-indigo-50/20 cursor-pointer transition-colors ${
          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
        } ${expanded ? 'bg-indigo-50/30' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Expand */}
        <td className="px-3 py-2.5 text-gray-400 w-6 text-center">
          {expanded
            ? <ChevronDown size={13} />
            : <ChevronRight size={13} />}
        </td>

        {/* Time */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <Clock size={11} className="text-gray-400 flex-shrink-0" />
            {fmt(time)}
          </span>
        </td>

        {/* Survey */}
        <td className="px-3 py-2.5">
          <div className="text-xs font-semibold text-gray-800 truncate max-w-[160px]" title={row.survey_title}>
            {row.survey_title || '—'}
          </div>
          <div className="text-[10px] text-gray-400 font-mono">{row.survey_id}</div>
        </td>

        {/* Creator */}
        <td className="px-3 py-2.5">
          <span className="text-xs text-gray-600 truncate max-w-[140px] block" title={row.creator_email}>
            {row.creator_email || '—'}
          </span>
        </td>

        {/* Respondent */}
        <td className="px-3 py-2.5">
          <span className="text-xs text-gray-700 font-medium truncate max-w-[140px] block" title={identity}>
            {identity}
          </span>
          {row.ip && row.ip !== identity && (
            <span className="text-[10px] text-gray-400">{row.ip}</span>
          )}
        </td>

        {/* Click ID */}
        <td className="px-3 py-2.5">
          <span className="text-[11px] font-mono text-gray-500 truncate max-w-[110px] block" title={row.click_id}>
            {row.click_id || '—'}
          </span>
        </td>

        {/* Qs answered */}
        <td className="px-3 py-2.5 text-center">
          <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
            {row.questions_answered}
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-2.5">
          {isPartial
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                <GitBranch size={9} /> Redirected
              </span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                <CheckCircle2 size={9} /> Submitted
              </span>
          }
        </td>

        {/* Redirected to */}
        <td className="px-3 py-2.5 max-w-[180px]">
          {row.redirected_to_url
            ? <a
                href={row.redirected_to_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline truncate max-w-[175px]"
                title={row.redirected_to_url}
              >
                <ExternalLink size={10} className="flex-shrink-0" />
                {shortUrl(row.redirected_to_url)}
              </a>
            : <span className="text-xs text-gray-300">—</span>
          }
        </td>

        {/* Answers count */}
        <td className="px-3 py-2.5 text-center text-xs text-gray-400">
          {Object.keys(row.answers).length}
        </td>
      </tr>

      {/* Expanded row */}
      {expanded && (
        <tr className="bg-indigo-50/10">
          <td colSpan={10} className="px-6 py-4 border-b border-indigo-100">
            <div className="space-y-3">
              {/* Meta strip */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 pb-2 border-b border-gray-200">
                <span><span className="font-medium text-gray-700">Session:</span> <span className="font-mono">{row.session_id || '—'}</span></span>
                <span><span className="font-medium text-gray-700">Response ID:</span> <span className="font-mono">{row.response_id}</span></span>
                {row.partial_submitted_at && (
                  <span><span className="font-medium text-gray-700">Redirected at:</span> {fmt(row.partial_submitted_at)}</span>
                )}
                {row.submitted_at && (
                  <span><span className="font-medium text-gray-700">Submitted at:</span> {fmt(row.submitted_at)}</span>
                )}
              </div>

              {/* Redirect banner */}
              {row.redirected_to_url && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <GitBranch size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">Redirected after Q{row.questions_answered}</span>
                    <span className="ml-2 text-amber-600">→</span>
                    <a href={row.redirected_to_url} target="_blank" rel="noopener noreferrer"
                      className="ml-2 font-mono underline break-all">{row.redirected_to_url}</a>
                  </div>
                </div>
              )}

              {/* Answers */}
              <AnswerPanel answers={row.answers} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SurveyFlowTrackingTab: React.FC = () => {
  const baseUrl = getApiBaseUrl();

  const [rows, setRows]           = useState<FlowRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<'all' | 'partial' | 'submitted'>('all');
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc');
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 50;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/flow-tracking/all-responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
      }
    } catch {}
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = rows
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.survey_title.toLowerCase().includes(q) ||
        r.survey_id.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.click_id.toLowerCase().includes(q) ||
        r.ip.toLowerCase().includes(q) ||
        r.creator_email.toLowerCase().includes(q) ||
        r.redirected_to_url.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const ta = new Date(rowTime(a)).getTime() || 0;
      const tb = new Date(rowTime(b)).getTime() || 0;
      return sortDir === 'desc' ? tb - ta : ta - tb;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filter changes
  const setFilter = (f: typeof statusFilter) => { setStatus(f); setPage(1); };
  const setSearchQ = (s: string) => { setSearch(s); setPage(1); };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      'Time', 'Survey ID', 'Survey Title', 'Creator', 'Email', 'Username',
      'Click ID', 'IP', 'Qs Answered', 'Status', 'Redirected To', 'Answers'
    ];
    const csvRows = filtered.map(r => [
      fmt(rowTime(r)), r.survey_id, r.survey_title, r.creator_email,
      r.email, r.username, r.click_id, r.ip, r.questions_answered, r.status,
      r.redirected_to_url,
      Object.entries(r.answers).map(([k, v]) => `${k}:${v}`).join(' | ')
    ]);
    const content = [headers, ...csvRows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `flow-tracking-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const totalAll      = rows.length;
  const totalPartial  = rows.filter(r => r.status === 'partial').length;
  const totalSubmitted= rows.filter(r => r.status === 'submitted').length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <GitBranch size={20} className="text-indigo-600" />
            Survey Flow Tracking
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            All responses across all surveys — time-sorted, click any row to see answers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRows}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Total',      count: totalAll,       color: 'bg-gray-100 text-gray-700' },
          { label: '✅ Submitted', count: totalSubmitted, color: 'bg-green-100 text-green-700' },
          { label: '🔀 Redirected', count: totalPartial,  color: 'bg-amber-100 text-amber-700' },
        ].map(p => (
          <span key={p.label} className={`px-3 py-1 rounded-full text-xs font-semibold ${p.color}`}>
            {p.label}: {p.count}
          </span>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search survey, email, click ID, IP…"
            value={search}
            onChange={e => setSearchQ(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 w-64"
          />
        </div>

        <div className="flex items-center gap-1 ml-1">
          <Filter size={12} className="text-gray-400" />
          {(['all', 'submitted', 'partial'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'submitted' ? '✅ Submitted' : '🔀 Redirected'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors ml-auto"
        >
          <Clock size={11} />
          Time {sortDir === 'desc' ? '↓ Newest' : '↑ Oldest'}
        </button>

        <span className="text-xs text-gray-400">{filtered.length} row{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <BarChart2 size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">
            {rows.length === 0 ? 'No responses recorded yet' : 'No rows match your filter'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="w-6" />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    <button className="flex items-center gap-1" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                      Time {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Survey</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Creator</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Respondent</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Click ID</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Qs</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Redirected To</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Answers</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, idx) => (
                  <TableRow key={row.response_id} row={row} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Page {page} of {totalPages} — {filtered.length} total rows</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                >← Prev</button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                >Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SurveyFlowTrackingTab;
