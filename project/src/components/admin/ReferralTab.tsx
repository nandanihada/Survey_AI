/**
 * Admin › Referral Tab — all data from real API endpoints
 */
import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, Check, X, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventFilter = 'all' | 'subs' | 'flagged' | 'held' | 'reversed';

interface Liability {
  payable_now_cents: number;
  recurring_liability_cents: number;
  signups_on_hold_cents: number;
  signups_on_hold_count: number;
  churned_count: number;
  surveys_created_count: number;
}

interface ReferralEvent {
  id: string;
  session_id: string;
  ref_code: string;
  signup_email: string | null;
  signup_status: string | null;
  subscription_id: string | null;
  sub_amount_cents: number | null;
  ip_display: string;
  city: string;
  flags_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'reversed';
  occurred_at: string;
}

interface PromoterOption {
  ref_code: string;
  display_name: string;
  status: string;
}

interface AdminPayout {
  id: string;
  ref_code: string;
  display_name: string;
  amount_cents: number;
  status: string;
  method_type: string;
  requested_at: string;
  paid_at: string | null;
  transaction_id: string;
  admin_message: string;
}

interface PromoterRow {
  ref_code: string;
  display_name: string;
  user_email: string;
  status: string;
  created_at: string;
  methods_saved: string[];
  has_payment: boolean;
  balance_available_cents: number;
  balance_pending_cents: number;
  total_clicks: number;
  total_signups: number;
  link: string;
}

interface PromoterView {
  ref_code: string;
  display_name: string;
  link: string;
  clicks_total: number;
  clicks_unique: number;
  subscriptions_active: number;
  mrr_cents: number;
  balance_available_cents: number;
  balance_pending_cents: number;
  activity: ActivityRow[];
}

interface ActivityRow {
  visitor_label: string;
  occurred_at: string;
  city: string;
  country: string;
  signup_status: string | null;
  plan: string | null;
  amount_cents: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtEur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

const authFetch = (url: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
};

// ─── Admin Payouts View ───────────────────────────────────────────────────────
function PayoutsView() {
  const base = getApiBaseUrl();
  const [payouts,     setPayouts]     = useState<AdminPayout[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [markingId,   setMarkingId]   = useState<string | null>(null);
  const [txnInput,    setTxnInput]    = useState<Record<string, string>>({});
  const [msgInput,    setMsgInput]    = useState<Record<string, string>>({});
  const [showMarkFor, setShowMarkFor] = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  useEffect(() => { loadPayouts(); }, []);

  const loadPayouts = async () => {
    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${base}/api/admin/referrals/payouts`);
      if (res.ok) setPayouts(await res.json());
      else setError('Failed to load payouts');
    } catch { console.error('loadPayouts network error'); setError('Failed to load payouts'); }
    finally { setLoading(false); }
  };

  const doMarkPaid = async (id: string) => {
    const txn = (txnInput[id] || '').trim();
    if (!txn) return;
    setMarkingId(id);
    try {
      const res = await authFetch(`${base}/api/admin/referrals/payouts/${id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({ transaction_id: txn, message: msgInput[id] || '' }),
      });
      if (res.ok) {
        setPayouts(prev => prev.map(p =>
          p.id === id ? { ...p, status: 'paid', transaction_id: txn, admin_message: msgInput[id] || '' } : p
        ));
        setShowMarkFor(null);
        setSuccessMsg('Payout marked as paid');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to mark paid');
      }
    } catch { setError('Failed. Please try again.'); }
    finally { setMarkingId(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-gray-400" /></div>;
  if (error) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-500">
      <AlertCircle size={24} className="text-red-400" />
      <p className="text-sm">{error}</p>
      <button onClick={loadPayouts} className="text-sm px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5">
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <Check size={14} /> {successMsg}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{payouts.length} payout request{payouts.length !== 1 ? 's' : ''}</p>
        <button onClick={loadPayouts} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Promoter</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.display_name || '—'}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.ref_code}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmtEur(p.amount_cents)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.method_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.requested_at ? new Date(p.requested_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'paid' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700 rounded-full">
                            <Check size={9} /> Paid
                          </span>
                          {p.transaction_id && (
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{p.transaction_id}</p>
                          )}
                          {p.admin_message && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{p.admin_message}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold bg-yellow-100 text-yellow-700 rounded-full capitalize">
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.status !== 'paid' ? (
                        <button
                          onClick={() => setShowMarkFor(showMarkFor === p.id ? null : p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <DollarSign size={11} /> Mark Paid
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Done</span>
                      )}
                    </td>
                  </tr>
                  {showMarkFor === p.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-green-50 border-b border-green-100">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Transaction ID (required)"
                            value={txnInput[p.id] || ''}
                            onChange={e => setTxnInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="flex-1 min-w-[180px] text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-green-400"
                          />
                          <input
                            type="text"
                            placeholder="Message to promoter (optional)"
                            value={msgInput[p.id] || ''}
                            onChange={e => setMsgInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="flex-1 min-w-[180px] text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-green-400"
                          />
                          <button
                            onClick={() => doMarkPaid(p.id)}
                            disabled={!(txnInput[p.id] || '').trim() || markingId === p.id}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            {markingId === p.id && <Loader2 size={12} className="animate-spin" />}
                            Confirm
                          </button>
                          <button onClick={() => setShowMarkFor(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {payouts.length === 0 && (
            <div className="py-14 text-center text-gray-400 text-sm">No payout requests yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Promoters List ─────────────────────────────────────────────────────
interface PaymentDetail {
  ref_code: string;
  display_name: string;
  bank?: { account_name: string; account_number: string; ifsc: string; bank_name: string };
  paypal?: { email: string };
  crypto?: { wallet_address: string; network: string };
}

function PaymentDetailModal({ refCode, onClose }: { refCode: string; onClose: () => void }) {
  const base = getApiBaseUrl();
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    authFetch(`${base}/api/admin/referrals/promoters/${refCode}/payment`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refCode]);

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
            {detail && <p className="text-xs text-gray-400 mt-0.5">{detail.display_name} · {refCode}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading && <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-gray-400" /></div>}

          {!loading && detail && !detail.bank && !detail.paypal && !detail.crypto && (
            <p className="text-sm text-gray-400 text-center py-4">No payment methods saved yet.</p>
          )}

          {detail?.bank && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-base">🏦</span>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Bank Transfer</span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {[
                  { label: 'Account Name',   val: detail.bank.account_name },
                  { label: 'Account Number', val: detail.bank.account_number },
                  { label: 'IFSC / Sort',    val: detail.bank.ifsc },
                  { label: 'Bank Name',      val: detail.bank.bank_name },
                ].filter(f => f.val).map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
                    <span className="text-sm text-gray-900 font-mono flex-1 truncate">{val}</span>
                    <button onClick={() => copy(val, label)}
                      className="p-1 text-gray-300 hover:text-gray-600 transition-colors shrink-0">
                      {copied === label ? <Check size={12} className="text-green-500" /> : <ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail?.paypal && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-base">💳</span>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">PayPal</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400 w-28 shrink-0">Email</span>
                <span className="text-sm text-gray-900 flex-1">{detail.paypal.email}</span>
                <button onClick={() => copy(detail.paypal!.email, 'paypal')}
                  className="p-1 text-gray-300 hover:text-gray-600 transition-colors shrink-0">
                  {copied === 'paypal' ? <Check size={12} className="text-green-500" /> : <ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />}
                </button>
              </div>
            </div>
          )}

          {detail?.crypto && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-base">₿</span>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Crypto · {detail.crypto.network}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400 w-28 shrink-0">Wallet</span>
                <span className="text-sm text-gray-900 font-mono flex-1 truncate text-xs">{detail.crypto.wallet_address}</span>
                <button onClick={() => copy(detail.crypto!.wallet_address, 'crypto')}
                  className="p-1 text-gray-300 hover:text-gray-600 transition-colors shrink-0">
                  {copied === 'crypto' ? <Check size={12} className="text-green-500" /> : <ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PromotersListView() {
  const base = getApiBaseUrl();
  const [promoters, setPromoters] = useState<PromoterRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'all' | 'payment_added' | 'no_payment'>('all');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${base}/api/admin/referrals/promoters`);
      if (res.ok) setPromoters(await res.json());
      else setError('Failed to load promoters');
    } catch { console.error('loadPromoters network error'); setError('Failed to load promoters'); }
    finally { setLoading(false); }
  };

  const filtered = promoters.filter(p => {
    if (filter === 'payment_added') return p.has_payment;
    if (filter === 'no_payment')    return !p.has_payment;
    return true;
  });

  const methodIcon = (m: string) => ({ bank: '🏦', paypal: '💳', crypto: '₿' }[m] || m);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-gray-400" /></div>;
  if (error)   return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-500">
      <AlertCircle size={24} className="text-red-400" />
      <p className="text-sm">{error}</p>
      <button onClick={load} className="text-sm px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5">
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {selectedCode && (
        <PaymentDetailModal refCode={selectedCode} onClose={() => setSelectedCode(null)} />
      )}
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: 'all',           label: `All (${promoters.length})` },
          { id: 'payment_added', label: `Payment added (${promoters.filter(p => p.has_payment).length})` },
          { id: 'no_payment',    label: `No payment yet (${promoters.filter(p => !p.has_payment).length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id as typeof filter)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              filter === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {label}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Partner</th>
                <th className="px-4 py-3 text-left">Ref Code</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-center">Clicks</th>
                <th className="px-4 py-3 text-center">Signups</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.ref_code} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.display_name || '—'}</p>
                    <p className="text-[11px] text-gray-400">{p.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {p.ref_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.has_payment ? (
                      <button
                        onClick={() => setSelectedCode(p.ref_code)}
                        className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                        title="Click to view payment details"
                      >
                        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                        <span className="text-xs text-gray-600 underline decoration-dotted">
                          {p.methods_saved.map(methodIcon).join(' · ')}
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                        <span className="text-xs text-gray-400">Not added</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {fmtEur(p.balance_available_cents)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {fmtEur(p.balance_pending_cents)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.total_clicks}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.total_signups}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-14 text-center text-gray-400 text-sm">
              {filter === 'all' ? 'No partners have joined yet.' : 'No partners match this filter.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView() {
  const base = getApiBaseUrl();
  const [liability, setLiability] = useState<Liability | null>(null);
  const [events,    setEvents]    = useState<ReferralEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<EventFilter>('all');
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null);
  const [reason,    setReason]    = useState('');
  const [working,   setWorking]   = useState<string | null>(null);
  const [msg,       setMsg]       = useState<string | null>(null);
  const [subSection, setSubSection] = useState<'events' | 'payouts' | 'promoters'>('events');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [lRes, eRes] = await Promise.all([
        authFetch(`${base}/api/admin/referrals/liability`),
        authFetch(`${base}/api/admin/referrals/events`),
      ]);
      if (lRes.ok) setLiability(await lRes.json());
      else setLiability(null);
      if (eRes.ok) setEvents(await eRes.json());
      else setEvents([]);
    } catch {
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const doReverse = async (id: string) => {
    if (!reason.trim()) return;
    setWorking(id);
    try {
      const res = await authFetch(`${base}/api/admin/referrals/events/${id}/reverse`, {
        method: 'POST', body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'reversed' } : e));
        setMsg('Event reversed'); setShowReasonFor(null); setReason('');
        setTimeout(() => setMsg(null), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error || 'Reverse failed');
      }
    } catch { setMsg('Failed. Please try again.'); }
    finally { setWorking(null); }
  };

  const doReverseAllFlagged = async () => {
    if (!window.confirm('Reverse all flagged events? This cannot be undone.')) return;
    const ids = events.filter(e => e.flags_count > 0 && e.status !== 'reversed').map(e => e.id);
    if (!ids.length) { setMsg('No flagged events to reverse'); setTimeout(() => setMsg(null), 3000); return; }
    setWorking('bulk');
    try {
      const res = await authFetch(`${base}/api/admin/referrals/bulk-reverse`, {
        method: 'POST', body: JSON.stringify({ event_ids: ids, reason: 'bulk admin reversal' }),
      });
      if (res.ok) {
        const d = await res.json();
        setEvents(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'reversed' } : e));
        setMsg(`Reversed ${d.reversed_count} flagged events`);
        setTimeout(() => setMsg(null), 3000);
      }
    } catch { setMsg('Failed. Please try again.'); }
    finally { setWorking(null); }
  };

  const filtered = events.filter(e => {
    if (filter === 'all')      return true;
    if (filter === 'subs')     return !!e.subscription_id;
    if (filter === 'flagged')  return e.flags_count > 0;
    if (filter === 'held')     return e.signup_status?.includes('left') ?? false;
    if (filter === 'reversed') return e.status === 'reversed';
    return true;
  });

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-gray-400" /></div>
  );
  if (error) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-500">
      <AlertCircle size={24} className="text-red-400" />
      <p className="text-sm">{error}</p>
      <button onClick={loadAll} className="text-sm px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5">
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {msg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <Check size={14} /> {msg}
        </div>
      )}

      {/* Sub-section toggle: Events | Payouts | Promoters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50 w-fit">
          {(['events', 'payouts', 'promoters'] as const).map(s => (
            <button key={s} onClick={() => setSubSection(s)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md capitalize transition-colors ${
                subSection === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {s === 'events' ? 'Events' : s === 'payouts' ? 'Payouts' : 'Promoters'}
            </button>
          ))}
        </div>
        <button onClick={loadAll} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {subSection === 'payouts' ? <PayoutsView /> : subSection === 'promoters' ? <PromotersListView /> : (
        <>
          {/* Liability cards */}
          {liability ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Payable Now',          value: fmtEur(liability.payable_now_cents),         sub: 'Approved, unpaid',         color: '' },
            { label: 'Recurring Liability',  value: fmtEur(liability.recurring_liability_cents),  sub: 'Per month, while active',  color: 'bg-green-50 border-green-200' },
            { label: 'Signups On Hold',      value: fmtEur(liability.signups_on_hold_cents),      sub: `${liability.signups_on_hold_count} awaiting 14d`, color: 'bg-orange-50 border-orange-200' },
            { label: 'Churned',              value: liability.churned_count.toString(),           sub: 'Credit stopped',          color: 'bg-red-50 border-red-200' },
            { label: 'Surveys Created',      value: liability.surveys_created_count.toString(),   sub: 'Real activation proxy',   color: 'bg-purple-50 border-purple-200' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className={`rounded-xl border border-gray-200 p-4 bg-white ${color}`}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Liability data unavailable</p>
      )}

      {/* Payout rule pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Payout Rules</span>
        {['€0.02 / session', '€0.70 / verified signup', '€4.00 / mo recurring', '€40.00 / annual', '14d signup hold', 'Credit stops on cancellation'].map(p => (
          <span key={p} className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">{p}</span>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['all', 'subs', 'flagged', 'held', 'reversed'] as EventFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{f}</button>
          ))}
        </div>
        <button onClick={doReverseAllFlagged} disabled={working === 'bulk'}
          className="px-4 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1.5">
          {working === 'bulk' && <Loader2 size={12} className="animate-spin" />}
          Reverse all flagged
        </button>
      </div>

      {/* Events table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Session</th>
                <th className="px-4 py-3 text-left">Ref</th>
                <th className="px-4 py-3 text-left">Signup Email</th>
                <th className="px-4 py-3 text-left">Signup</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Sub €</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-center">Flags</th>
                <th className="px-4 py-3 text-left">Action</th>              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(ev => (
                <React.Fragment key={ev.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${ev.status === 'reversed' ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ev.session_id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-gray-100 text-gray-700 rounded">{ev.ref_code}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{ev.signup_email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {ev.signup_status ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          ev.signup_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          ev.signup_status.includes('left') ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{ev.signup_status}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-[120px]">{ev.subscription_id || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{ev.sub_amount_cents != null ? fmtEur(ev.sub_amount_cents) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ev.ip_display}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{ev.city || '—'}</td>                    <td className="px-4 py-3 text-center">
                      {ev.flags_count > 0
                        ? <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">{ev.flags_count}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {ev.status !== 'reversed'
                        ? <button onClick={() => { setShowReasonFor(showReasonFor === ev.id ? null : ev.id); setReason(''); }}
                            className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            Reverse
                          </button>
                        : <span className="text-xs text-gray-400 italic">Reversed</span>}
                    </td>
                  </tr>
                  {showReasonFor === ev.id && (
                    <tr>
                      <td colSpan={10} className="px-4 py-3 bg-red-50 border-b border-red-100">
                        <div className="flex items-center gap-3">
                          <input autoFocus type="text" placeholder="Reason for reversal…"
                            value={reason} onChange={e => setReason(e.target.value)}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-red-400" />
                          <button onClick={() => doReverse(ev.id)} disabled={!reason.trim() || working === ev.id}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                            {working === ev.id && <Loader2 size={12} className="animate-spin" />}
                            Confirm
                          </button>
                          <button onClick={() => { setShowReasonFor(null); setReason(''); }} className="p-1.5 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-14 text-center text-gray-400 text-sm">No events found.</div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

// ─── Admin-as-Promoter View ───────────────────────────────────────────────────
function PromoterView() {
  const base = getApiBaseUrl();
  const [promoters, setPromoters] = useState<PromoterOption[]>([]);
  const [selected,  setSelected]  = useState<string>('');
  const [open,      setOpen]      = useState(false);
  const [data,      setData]      = useState<PromoterView | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [pLoading,  setPLoading]  = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${base}/api/admin/referrals/promoters`);
        if (res.ok) {
          const list: PromoterOption[] = await res.json();
          setPromoters(list);
          if (list.length > 0) setSelected(list[0].ref_code);
        }
      } catch { /* silently fail */ }
      finally { setPLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await authFetch(`${base}/api/admin/referrals/promoter-view/${selected}`);
        if (res.ok) setData(await res.json());
        else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to load'); }
      } catch { console.error('promoter-view network error'); setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [selected]);

  if (pLoading) return <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-gray-400" /></div>;

  if (promoters.length === 0) return (
    <div className="py-20 text-center text-gray-400 text-sm">No promoters have joined the program yet.</div>
  );

  const current = promoters.find(p => p.ref_code === selected);

  return (
    <div className="space-y-6">
      {/* "Viewing as" selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 font-medium">Viewing as</span>
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
            {current?.display_name} · {current?.ref_code}
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px] max-h-60 overflow-y-auto">
              {promoters.map(p => (
                <button key={p.ref_code} onClick={() => { setSelected(p.ref_code); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    p.ref_code === selected ? 'font-semibold text-red-600' : 'text-gray-700'
                  }`}>
                  {p.display_name} · {p.ref_code}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && data && (
        <>
          {/* Link + balance */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Referral link</p>
              <div className="font-mono text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 truncate">
                {data.link}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Available</p>
              <p className="text-3xl font-bold text-gray-900">{fmtEur(data.balance_available_cents)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pending: {fmtEur(data.balance_pending_cents)}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Clicks',  value: data.clicks_total,          sub: fmtEur(data.clicks_total * 2) },
              { label: 'Unique Clicks', value: data.clicks_unique,         sub: 'Distinct visitors' },
              { label: 'Active Plans',  value: data.subscriptions_active,  sub: `${fmtEur(data.mrr_cents)}/mo` },
              { label: 'In Review',     value: fmtEur(data.balance_pending_cents), sub: 'Released after review' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Visitor</th>
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Signup</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-right">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.activity.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{row.visitor_label}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(row.occurred_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.city || '—'}</td>
                      <td className="px-4 py-3">
                        {row.signup_status
                          ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              row.signup_status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>{row.signup_status}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {row.plan
                          ? <span className={row.plan === 'annual' ? 'text-orange-600' : 'text-green-600'}>{row.plan}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtEur(row.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.activity.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No activity recorded for this promoter yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function ReferralTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Referral panel</h2>
        <p className="text-sm text-gray-400 mt-0.5">€0.02 session · €0.70 signup · €4.00/mo · €40.00 annual</p>
      </div>
      <AdminView />
    </div>
  );
}
