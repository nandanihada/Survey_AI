/**
 * Admin: Combined Survey Report
 * All surveys — responses, share activity, earnings, creator info.
 * Admin can revert (reject) individual completion credits.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Loader2, BarChart3, Share2, Users, DollarSign,
  Search, ToggleLeft, ToggleRight, Save, RotateCcw, AlertCircle, CheckCircle,
  Zap
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

interface ReportRow {
  survey_id: string;
  title: string;
  status: string;
  created_at: string;
  owner_email: string;
  owner_name: string;
  direct_responses: number;
  all_clicks: number;       // every survey open from survey_clicks collection
  share_clicks: number;     // only share-link specific clicks
  share_completions_total: number;
  share_completions_pending: number;
  share_completions_approved: number;
  share_earnings_due_cents: number;
  share_payout_cents: number;
  share_payout_enabled: boolean;
}

interface Completion {
  id: string;
  survey_id: string;
  sharer_ref_code: string;
  sharer_display_name: string;
  sharer_email: string;
  earned_cents: number;
  status: string;
  completed_at: string;
}

interface Totals {
  total_surveys: number;
  total_direct_responses: number;
  total_all_clicks: number;
  total_share_clicks: number;
  total_share_completions: number;
  total_earnings_due_cents: number;
}

const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const authFetch = (url: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
};

export default function SurveyReportTab() {
  const baseUrl = getApiBaseUrl();
  const [rows, setRows]       = useState<ReportRow[]>([]);
  const [totals, setTotals]   = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<keyof ReportRow>('direct_responses');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editPayouts, setEditPayouts] = useState<Record<string, string>>({});
  const [savingId, setSavingId]       = useState<string | null>(null);
  const [saveMsg, setSaveMsg]         = useState<Record<string, string>>({});

  // Completions panel
  const [activeCompSurveyId, setActiveCompSurveyId] = useState<string | null>(null);
  const [completions, setCompletions]               = useState<Completion[]>([]);
  const [compLoading, setCompLoading]               = useState(false);
  const [revertingId, setRevertingId]               = useState<string | null>(null);
  const [syncingId, setSyncingId]                   = useState<string | null>(null);
  const [syncMsg, setSyncMsg]                       = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${baseUrl}/api/admin/surveys/combined-report`);
      if (res.ok) {
        const data = await res.json();
        const surveys: ReportRow[] = data.surveys || [];
        setRows(surveys);
        setTotals(data.totals || null);
        const edits: Record<string, string> = {};
        surveys.forEach(r => { edits[r.survey_id] = (r.share_payout_cents / 100).toFixed(2); });
        setEditPayouts(edits);
      } else {
        console.error('Survey report API error:', res.status, await res.text().catch(() => ''));
      }
    } catch (e) {
      console.error('Survey report fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => { load(); }, [load]);

  // Load completions for a specific survey
  const loadCompletions = async (surveyId: string) => {
    if (activeCompSurveyId === surveyId) { setActiveCompSurveyId(null); return; }
    setActiveCompSurveyId(surveyId);
    setCompLoading(true);
    try {
      // Fetch all completion records for this survey (both pending + approved + rejected)
      const res = await authFetch(`${baseUrl}/api/admin/share-completions?status=all`);
      if (res.ok) {
        const all: Completion[] = await res.json();
        // Filter to this survey only
        const filtered = all.filter(c => c.survey_id === surveyId);
        setCompletions(filtered);
      }
    } finally {
      setCompLoading(false);
    }
  };

  // Admin revert a completion
  const revertCompletion = async (completionId: string) => {
    if (!window.confirm('Revert this completion? This will deduct the earnings from the user\'s balance.')) return;
    setRevertingId(completionId);
    try {
      const res = await authFetch(`${baseUrl}/api/admin/share-completions/${completionId}/reject`, {
        method: 'POST', body: JSON.stringify({ reason: 'Admin manual revert' }),
      });
      if (res.ok) {
        setCompletions(prev => prev.map(c =>
          c.id === completionId ? { ...c, status: 'rejected' } : c
        ));
        // Refresh main table to update counts
        load();
      }
    } finally {
      setRevertingId(null);
    }
  };

  // Admin sync completions from all existing responses
  const syncCompletions = async (surveyId: string) => {
    const row = rows.find(r => r.survey_id === surveyId);
    if (!row) return;
    if (!row.share_payout_enabled || !row.share_payout_cents) {
      alert('Enable sharing and set a payout amount first, then sync.');
      return;
    }
    if (!window.confirm(
      `Sync completions from ALL ${row.direct_responses} response(s) on "${row.title}"?\n\n` +
      `Each uncredited response will generate €${(row.share_payout_cents / 100).toFixed(2)} for the survey owner.\n\n` +
      `Total potential credit: €${(row.direct_responses * row.share_payout_cents / 100).toFixed(2)}`
    )) return;

    setSyncingId(surveyId);
    try {
      const res = await authFetch(`${baseUrl}/api/admin/surveys/${surveyId}/sync-completions`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = `✓ ${data.created} credited · €${((data.created * (data.payout_per_completion_cents || 0)) / 100).toFixed(2)} added`;
        setSyncMsg(prev => ({ ...prev, [surveyId]: msg }));
        load(); // Refresh table
      } else {
        setSyncMsg(prev => ({ ...prev, [surveyId]: `✗ ${data.error || 'Failed'}` }));
      }
    } catch {
      setSyncMsg(prev => ({ ...prev, [surveyId]: '✗ Failed. Please try again.' }));
    } finally {
      setSyncingId(null);
      setTimeout(() => setSyncMsg(prev => { const n = { ...prev }; delete n[surveyId]; return n; }), 5000);
    }
  };

  // Save payout config
  const savePayout = async (surveyId: string, enabledOverride?: boolean) => {
    const row = rows.find(r => r.survey_id === surveyId);
    if (!row) return;
    setSavingId(surveyId);
    const cents = Math.round(parseFloat(editPayouts[surveyId] || '0') * 100);
    const payload = {
      share_payout_cents: cents,
      share_payout_enabled: enabledOverride !== undefined ? enabledOverride : row.share_payout_enabled,
    };
    try {
      const res = await authFetch(`${baseUrl}/api/admin/surveys/${surveyId}/share-payout`, {
        method: 'PUT', body: JSON.stringify(payload),
      });
      if (res.ok) {
        setRows(prev => prev.map(r => r.survey_id === surveyId
          ? { ...r, share_payout_cents: cents, share_payout_enabled: payload.share_payout_enabled }
          : r
        ));
        setSaveMsg(prev => ({ ...prev, [surveyId]: '✓' }));
      } else {
        setSaveMsg(prev => ({ ...prev, [surveyId]: '✗' }));
      }
    } catch {
      setSaveMsg(prev => ({ ...prev, [surveyId]: '✗' }));
    } finally {
      setSavingId(null);
      setTimeout(() => setSaveMsg(prev => { const n = { ...prev }; delete n[surveyId]; return n; }), 2500);
    }
  };

  const handleSort = (key: keyof ReportRow) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const q = search.toLowerCase();
  const filtered = rows.filter(r =>
    !q ||
    r.title.toLowerCase().includes(q) ||
    r.survey_id.toLowerCase().includes(q) ||
    r.owner_email.toLowerCase().includes(q) ||
    r.owner_name.toLowerCase().includes(q)
  );

  // Show surveys with any activity first, then rest
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortBtn = ({ k, label }: { k: keyof ReportRow; label: string }) => (
    <button onClick={() => handleSort(k)}
      className="flex items-center gap-0.5 whitespace-nowrap hover:text-gray-700 transition-colors"
    >
      {label}{sortKey === k && <span className="ml-0.5 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: BarChart3,  color: 'bg-blue-50 text-blue-600',   label: 'Total Surveys',        value: totals.total_surveys },
            { icon: Users,      color: 'bg-green-50 text-green-600', label: 'Direct Responses',      value: totals.total_direct_responses },
            { icon: Share2,     color: 'bg-purple-50 text-purple-600', label: 'Total Clicks',        value: totals.total_all_clicks },
            { icon: BarChart3,  color: 'bg-orange-50 text-orange-600', label: 'Share Completions',   value: totals.total_share_completions },
            { icon: DollarSign, color: 'bg-red-50 text-red-600',     label: 'Earnings Credited',     value: fmt(totals.total_earnings_due_cents) },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color.split(' ')[0]}`}>
                <Icon size={16} className={color.split(' ')[1]} />
              </div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">All Surveys — Activity & Earnings</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search survey, ID, owner…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 w-52"
              />
            </div>
            <button onClick={load} disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <p className="text-sm text-gray-400">Loading surveys…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <BarChart3 size={32} className="text-gray-200" />
            <p className="text-sm text-gray-500 font-medium">
              {search ? `No surveys match "${search}"` : 'No surveys found'}
            </p>
            {!search && <p className="text-xs text-gray-400">Make sure surveys exist in the database</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  <th className="px-4 py-3 text-left"><SortBtn k="title" label="Survey" /></th>
                  <th className="px-3 py-3 text-left"><SortBtn k="owner_email" label="Creator" /></th>
                  <th className="px-3 py-3 text-left"><SortBtn k="status" label="Status" /></th>
                  <th className="px-3 py-3 text-center"><SortBtn k="direct_responses" label="Responses" /></th>
                  <th className="px-3 py-3 text-center"><SortBtn k="all_clicks" label="Clicks" /></th>
                  <th className="px-3 py-3 text-center"><SortBtn k="share_completions_total" label="Completions" /></th>
                  <th className="px-3 py-3 text-center"><SortBtn k="share_earnings_due_cents" label="Earnings" /></th>
                  <th className="px-3 py-3 text-center w-32">Payout/Completion</th>
                  <th className="px-3 py-3 text-center">Sharing</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => {
                  const hasActivity = row.direct_responses > 0 || row.all_clicks > 0 || row.share_completions_total > 0;
                  const isExpanded  = activeCompSurveyId === row.survey_id;
                  return (
                    <React.Fragment key={row.survey_id}>
                      <tr className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {hasActivity && (
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 flex-none" title="Has activity" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900 max-w-[180px] truncate text-sm">{row.title}</div>
                              <div className="text-[11px] font-mono text-gray-400 mt-0.5 select-all">{row.survey_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-700 font-medium">{row.owner_name || '—'}</div>
                          <div className="text-[11px] text-gray-400">{row.owner_email || '—'}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-base font-bold ${row.direct_responses > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                            {row.direct_responses}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`font-semibold ${row.all_clicks > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                            {row.all_clicks}
                          </span>
                          {row.share_clicks > 0 && (
                            <div className="text-[10px] text-purple-500">{row.share_clicks} via share</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className={`font-semibold ${row.share_completions_total > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                            {row.share_completions_total}
                          </div>
                          {row.share_completions_pending > 0 && (
                            <div className="text-[10px] text-orange-500">{row.share_completions_pending} pending</div>
                          )}
                          {row.share_completions_approved > 0 && (
                            <div className="text-[10px] text-green-600">{row.share_completions_approved} approved</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {row.share_earnings_due_cents > 0
                            ? <span className="font-bold text-red-600">{fmt(row.share_earnings_due_cents)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-400">
                            <span className="px-2 py-1.5 bg-gray-50 text-gray-500 text-xs border-r border-gray-300">€</span>
                            <input
                              type="number" min={0} step={0.01}
                              value={editPayouts[row.survey_id] ?? (row.share_payout_cents / 100).toFixed(2)}
                              onChange={e => setEditPayouts(prev => ({ ...prev, [row.survey_id]: e.target.value }))}
                              className="w-16 px-2 py-1.5 text-xs text-gray-900 outline-none bg-white"
                            />
                          </div>
                          {saveMsg[row.survey_id] && (
                            <p className={`text-[10px] mt-0.5 ${saveMsg[row.survey_id] === '✓' ? 'text-green-600' : 'text-red-500'}`}>
                              {saveMsg[row.survey_id]}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => savePayout(row.survey_id, !row.share_payout_enabled)} title="Toggle sharing">
                            {row.share_payout_enabled
                              ? <ToggleRight size={22} className="text-green-500" />
                              : <ToggleLeft size={22} className="text-gray-300" />}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            <button
                              onClick={() => savePayout(row.survey_id)}
                              disabled={savingId === row.survey_id}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-semibold rounded transition-colors"
                            >
                              {savingId === row.survey_id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                              Save
                            </button>
                            {/* Sync button — credits ALL existing responses */}
                            {row.share_payout_enabled && row.share_payout_cents > 0 && row.direct_responses > 0 && (
                              <button
                                onClick={() => syncCompletions(row.survey_id)}
                                disabled={syncingId === row.survey_id}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[10px] font-semibold rounded transition-colors"
                                title={`Credit earnings for all ${row.direct_responses} responses`}
                              >
                                {syncingId === row.survey_id ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                                Sync
                              </button>
                            )}
                            {/* View/Revert button — show when there are responses or completions */}
                            {(row.direct_responses > 0 || row.share_completions_total > 0) && (
                              <button
                                onClick={() => loadCompletions(row.survey_id)}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                                  isExpanded
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                                title="View completions"
                              >
                                <RotateCcw size={10} />
                                {isExpanded ? 'Hide' : 'View'}
                              </button>
                            )}
                          </div>
                          {/* Sync result message */}
                          {syncMsg[row.survey_id] && (
                            <p className={`text-[10px] mt-1 font-medium ${syncMsg[row.survey_id].startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                              {syncMsg[row.survey_id]}
                            </p>
                          )}
                        </td>
                      </tr>

                      {/* Completions drawer */}
                      {isExpanded && (
                        <tr className="border-b border-blue-100">
                          <td colSpan={10} className="px-6 py-4 bg-blue-50/40">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <RotateCcw size={13} className="text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700">
                                  Completion Credits — {row.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {completions.filter(c => c.status === 'approved').length} approved ·{' '}
                                {completions.filter(c => c.status === 'rejected').length} reverted
                              </span>
                            </div>
                            {compLoading ? (
                              <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
                            ) : completions.length === 0 ? (
                              <div className="py-4 text-center">
                                <p className="text-xs text-gray-500 font-medium mb-1">No completion credits recorded yet for this survey.</p>
                                <p className="text-[11px] text-gray-400 mb-3">
                                  The survey has {rows.find(r => r.survey_id === activeCompSurveyId)?.direct_responses ?? 0} direct response(s).
                                  {rows.find(r => r.survey_id === activeCompSurveyId)?.share_payout_enabled
                                    ? ' Use the ⚡ Sync button to credit earnings for all existing responses.'
                                    : ' Enable sharing & set a payout, then use ⚡ Sync to credit earnings.'}
                                </p>
                                {rows.find(r => r.survey_id === activeCompSurveyId)?.share_payout_enabled &&
                                 rows.find(r => r.survey_id === activeCompSurveyId)?.share_payout_cents! > 0 && (
                                  <button
                                    onClick={() => { setActiveCompSurveyId(null); syncCompletions(activeCompSurveyId!); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    <Zap size={12} /> Sync now
                                  </button>
                                )}
                              </div>
                            ) : (
                              <table className="w-full text-xs bg-white rounded-lg overflow-hidden border border-blue-100">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="px-3 py-2 text-left">User (Ref Code)</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-center">Earned</th>
                                    <th className="px-3 py-2 text-center">Completed At</th>
                                    <th className="px-3 py-2 text-center">Status</th>
                                    <th className="px-3 py-2 text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {completions.map(c => (
                                    <tr key={c.id} className={`hover:bg-gray-50 ${c.status === 'rejected' ? 'opacity-50' : ''}`}>
                                      <td className="px-3 py-2 font-mono text-gray-700">{c.sharer_ref_code}</td>
                                      <td className="px-3 py-2 text-gray-500">{c.sharer_email || c.sharer_display_name || '—'}</td>
                                      <td className="px-3 py-2 text-center font-semibold text-green-700">{fmt(c.earned_cents)}</td>
                                      <td className="px-3 py-2 text-center text-gray-400">
                                        {c.completed_at ? new Date(c.completed_at).toLocaleString() : '—'}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {c.status === 'approved' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">
                                            <CheckCircle size={9} /> Approved
                                          </span>
                                        )}
                                        {c.status === 'rejected' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold">
                                            <AlertCircle size={9} /> Reverted
                                          </span>
                                        )}
                                        {c.status === 'pending' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[9px] font-bold">
                                            Pending
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {c.status !== 'rejected' && (
                                          <button
                                            onClick={() => revertCompletion(c.id)}
                                            disabled={revertingId === c.id}
                                            className="flex items-center gap-1 mx-auto px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[9px] font-semibold rounded transition-colors disabled:opacity-50"
                                            title="Revert — deducts earnings from user's balance"
                                          >
                                            {revertingId === c.id
                                              ? <Loader2 size={9} className="animate-spin" />
                                              : <RotateCcw size={9} />}
                                            Revert
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
