/**
 * Admin tab: manage global "Ways to Earn" rates + per-survey share payouts
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Save, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, CheckCircle, Loader2, DollarSign, Settings } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

interface EarningsConfig {
  click_cents: number;
  signup_cents: number;
  monthly_sub_cents: number;
  annual_sub_cents: number;
  video_bonus_cents: number;
  video_bonus_label: string;
  video_bonus_description: string;
  survey_share_description: string;
  signup_description: string;
  plan_description: string;
  click_description: string;
  updated_at: string | null;
}

interface SurveyPayoutRow {
  survey_id: string;
  title: string;
  status: string;
  created_at: string;
  owner_email: string;
  owner_name: string;
  share_payout_cents: number;
  share_payout_enabled: boolean;
  stats: {
    clicks: number;
    completions: number;
    pending_completions: number;
    approved_completions: number;
  };
}

const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const authFetch = (url: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
};

// ─── Sub-section: Global Rates ────────────────────────────────────────────────
function GlobalRatesPanel({ baseUrl }: { baseUrl: string }) {
  const [cfg, setCfg] = useState<EarningsConfig | null>(null);
  const [form, setForm] = useState<EarningsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/earnings-config`);
      if (res.ok) {
        const data = await res.json();
        setCfg(data);
        setForm(data);
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${baseUrl}/api/admin/earnings-config`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCfg(data.config || form);
        setForm(data.config || form);
        setMsg({ text: 'Saved successfully', ok: true });
      } else {
        setMsg({ text: data.error || 'Save failed', ok: false });
      }
    } catch {
      setMsg({ text: 'Network error', ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return (
    <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
  );

  const centsFields: { key: keyof EarningsConfig; label: string; hint: string }[] = [
    { key: 'click_cents',        label: 'Per referral link click (€)',   hint: 'Credited when someone clicks the user\'s signup referral link' },
    { key: 'signup_cents',       label: 'Per confirmed signup (€)',       hint: 'Credited 14 days after the referred user confirms their email' },
    { key: 'monthly_sub_cents',  label: 'Per monthly plan (€)',           hint: 'Recurring credit every month the plan is active' },
    { key: 'annual_sub_cents',   label: 'Per annual plan (€)',            hint: 'One-time credit when a referred user takes an annual plan' },
    { key: 'video_bonus_cents',  label: 'Video creation bonus (€)',       hint: 'One-time manual bonus paid after admin verifies the video' },
  ];

  const textFields: { key: keyof EarningsConfig; label: string }[] = [
    { key: 'video_bonus_label',          label: 'Video bonus — title shown to user' },
    { key: 'video_bonus_description',    label: 'Video bonus — description' },
    { key: 'survey_share_description',   label: 'Survey share — description' },
    { key: 'signup_description',         label: 'Signup earning — description' },
    { key: 'plan_description',           label: 'Plan earning — description' },
    { key: 'click_description',          label: 'Click earning — description' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Settings size={16} className="text-indigo-500" />
            Ways to Earn — Global Rates
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            These rates appear on the public "How it works" page and in users' "Ways to Earn" panel.
            {cfg?.updated_at && ` Last updated ${new Date(cfg.updated_at).toLocaleString()}`}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm mb-5 ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Cents fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {centsFields.map(({ key, label, hint }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100">
              <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">€</span>
              <input
                type="number"
                min={0}
                step={1}
                value={Math.round((form[key] as number) / 100 * 100) / 100}
                onChange={e => setForm(f => f ? { ...f, [key]: Math.round(parseFloat(e.target.value || '0') * 100) } : f)}
                className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none bg-white"
              />
              <span className="px-2 py-2 text-[10px] text-gray-400 bg-gray-50 border-l border-gray-300">{form[key]}¢</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
          </div>
        ))}
      </div>

      {/* Text fields */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labels & Descriptions</p>
        {textFields.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              type="text"
              value={(form[key] as string) || ''}
              onChange={e => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-section: Per-Survey Payouts ─────────────────────────────────────────
function SurveyPayoutsPanel({ baseUrl }: { baseUrl: string }) {
  const [rows, setRows] = useState<SurveyPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // survey_id being saved
  const [editCents, setEditCents] = useState<Record<string, string>>({}); // survey_id → input value
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${baseUrl}/api/admin/surveys/share-payouts`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.surveys || []);
        const initEdits: Record<string, string> = {};
        (data.surveys || []).forEach((r: SurveyPayoutRow) => {
          initEdits[r.survey_id] = (r.share_payout_cents / 100).toFixed(2);
        });
        setEditCents(initEdits);
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => { load(); }, [load]);

  const savePayout = async (surveyId: string, enabled?: boolean) => {
    const row = rows.find(r => r.survey_id === surveyId);
    if (!row) return;
    setSaving(surveyId);
    setMsg(null);

    const cents = Math.round(parseFloat(editCents[surveyId] || '0') * 100);
    const payload: Record<string, unknown> = {
      share_payout_cents: cents,
      share_payout_enabled: enabled !== undefined ? enabled : row.share_payout_enabled,
    };

    try {
      const res = await authFetch(`${baseUrl}/api/admin/surveys/${surveyId}/share-payout`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows(prev => prev.map(r =>
          r.survey_id === surveyId
            ? { ...r, share_payout_cents: cents, share_payout_enabled: payload.share_payout_enabled as boolean }
            : r
        ));
        setMsg({ id: surveyId, text: 'Saved', ok: true });
      } else {
        setMsg({ id: surveyId, text: data.error || 'Failed', ok: false });
      }
    } catch {
      setMsg({ id: surveyId, text: 'Network error', ok: false });
    } finally {
      setSaving(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const filtered = rows.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.survey_id.toLowerCase().includes(search.toLowerCase()) ||
    r.owner_email.toLowerCase().includes(search.toLowerCase()) ||
    r.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign size={16} className="text-green-500" />
            Per-Survey Share Payouts
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Set the payout per completion for each survey. Enable to activate sharing earnings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search surveys or owners…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-400 w-48"
          />
          <button onClick={load} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                <th className="px-5 py-3 text-left">Survey</th>
                <th className="px-4 py-3 text-left">Creator</th>
                <th className="px-4 py-3 text-center">Clicks</th>
                <th className="px-4 py-3 text-center">Completions</th>
                <th className="px-4 py-3 text-center w-36">Payout / Completion</th>
                <th className="px-4 py-3 text-center">Enabled</th>
                <th className="px-4 py-3 text-center">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => (
                <tr key={row.survey_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 max-w-[200px] truncate">{row.title}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{row.survey_id}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      row.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700 text-xs">{row.owner_name || '—'}</div>
                    <div className="text-gray-400 text-[11px]">{row.owner_email}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-700">{row.stats.clicks}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-semibold text-gray-700">{row.stats.completions}</div>
                    {row.stats.pending_completions > 0 && (
                      <div className="text-[10px] text-orange-500">{row.stats.pending_completions} pending</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-indigo-400">
                      <span className="px-2 py-1.5 bg-gray-50 text-gray-500 text-xs border-r border-gray-300">€</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editCents[row.survey_id] ?? (row.share_payout_cents / 100).toFixed(2)}
                        onChange={e => setEditCents(prev => ({ ...prev, [row.survey_id]: e.target.value }))}
                        className="w-20 px-2 py-1.5 text-sm text-gray-900 outline-none bg-white"
                      />
                    </div>
                    {msg?.id === row.survey_id && (
                      <p className={`text-[10px] mt-1 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => savePayout(row.survey_id, !row.share_payout_enabled)}
                      title={row.share_payout_enabled ? 'Click to disable' : 'Click to enable'}
                      className="transition-colors"
                    >
                      {row.share_payout_enabled
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft size={22} className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => savePayout(row.survey_id)}
                      disabled={saving === row.survey_id}
                      className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {saving === row.survey_id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                    {search ? 'No surveys match your search' : 'No surveys found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function EarningsConfigTab() {
  const baseUrl = getApiBaseUrl();
  const [subTab, setSubTab] = useState<'rates' | 'surveys'>('rates');

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'rates',   label: '⚙️  Global Rates (Ways to Earn)' },
          { id: 'surveys', label: '📊  Per-Survey Payouts' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
              subTab === id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'rates'   && <GlobalRatesPanel   baseUrl={baseUrl} />}
      {subTab === 'surveys' && <SurveyPayoutsPanel baseUrl={baseUrl} />}
    </div>
  );
}
