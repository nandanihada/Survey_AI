import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift, Copy, Check, ExternalLink, X,
  Info, BarChart2, RefreshCw, AlertCircle, Loader2,
  CreditCard, Wallet, Share2, ChevronDown, ChevronRight,
  Video, Users, MousePointerClick, CreditCard as PlanIcon
} from 'lucide-react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PromoterSummary {
  ref_code: string;
  link: string;
  clicks_total: number;
  clicks_unique: number;
  signups_confirmed: number;
  signups_pending: number;
  subscriptions_active: number;
  mrr_cents: number;
  balance_available_cents: number;
  balance_pending_cents: number;
}

interface ActivityItem {
  visitor_label: string;
  occurred_at: string;
  city: string;
  country: string;
  signup_status: string | null;
  plan: 'monthly' | 'annual' | null;
  amount_cents: number;
}

interface PayoutHistoryItem {
  id: string;
  amount_cents: number;
  status: string;
  method_type: string;
  requested_at: string;
  paid_at: string | null;
  transaction_id: string;
  admin_message: string;
}

interface PaymentMethods {
  bank?: { account_name: string; account_number: string; ifsc: string; bank_name: string };
  paypal?: { email: string };
  crypto?: { wallet_address: string; network: string };
}

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
}

interface SurveyEarningRow {
  survey_id: string;
  survey_title: string;
  type: 'owned' | 'shared';
  response_count: number | null;
  share_payout_enabled: boolean;
  payout_per_completion_cents: number;
  clicks: number;
  completions: number;
  earned_cents: number;
  pending_cents: number;
  latest_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtEur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const authFetch = (url: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
};

// ─── Inline styles injected once ─────────────────────────────────────────────
const INFO_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');
  .pw-serif { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
  .pw-bg { background-color: #fafaf9; }
  .pw-rule { border-color: #e8e4df; }
  .pw-muted { color: #8a8078; }
  .pw-body { color: #2a2018; }
  .pw-ledger-row { border-bottom: 1px solid #e0d9d0; }
  .pw-ledger-row:last-child { border-bottom: none; }
  /* Premium custom range track */
  .pw-range { -webkit-appearance: none; appearance: none; width: 100%; height: 2px;
    background: #e8e4df; outline: none; cursor: pointer; border-radius: 2px; }
  .pw-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
    width: 18px; height: 18px; border-radius: 50%; background: #c0392b;
    border: 2px solid #fafaf9; box-shadow: 0 1px 4px rgba(0,0,0,.18); cursor: pointer; }
  .pw-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%;
    background: #c0392b; border: 2px solid #fafaf9; box-shadow: 0 1px 4px rgba(0,0,0,.18); cursor: pointer; }
  .pw-range::-webkit-slider-runnable-track { background: transparent; }
`;

// ─── Info / Landing sub-page (public) ─────────────────────────────────────────
function InfoPage({ onJoin }: { onJoin: () => void }) {
  const navigate = useNavigate();
  const { authenticated } = useAuth();

  const [clicks, setClicks]        = useState(500);
  const [signupRate, setSignupRate] = useState(4);
  const [subRate, setSubRate]       = useState(10);
  const [annualPct, setAnnualPct]   = useState(20);
  const [tick, setTick]             = useState(0);

  // Animated ledger ticker
  const ledgerItems = [
    { label: 'Click from New Delhi',   time: '02:48 IST',   detail: null,           amount: '+€0.02', amtCls: 'text-red-600' },
    { label: 'Signup confirmed',       time: null,          detail: 'priya.n@···',  amount: '+€0.70', amtCls: 'text-red-600' },
    { label: 'Monthly plan started',   time: null,          detail: 'recurring',    amount: '+€4.00', amtCls: 'text-red-600' },
    { label: 'Annual plan started',    time: null,          detail: 'one payment',  amount: '+€40.00',amtCls: 'text-red-600' },
  ];
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % ledgerItems.length), 2200);
    return () => clearInterval(id);
  }, []);

  const signups     = Math.round(clicks * signupRate / 100);
  const subs        = Math.round(signups * subRate / 100);
  const annualSubs  = Math.round(subs * annualPct / 100);
  const monthlySubs = subs - annualSubs;
  const totalFirst  = clicks * 0.02 + signups * 0.70 + monthlySubs * 4.00 + annualSubs * 40.00;
  const recurring   = monthlySubs * 4.00;

  const tiers = [
    { amount: '€0.02', amtCls: 'text-stone-700',  label: 'Per click',    desc: 'Someone opens Pepperwahl through your link.',       badge: null },
    { amount: '€0.70', amtCls: 'text-red-600',    label: 'Per signup',   desc: 'They create an account and confirm their email.',    badge: null },
    { amount: '€4',    amtCls: 'text-red-700',    label: 'Monthly plan', desc: 'Paid again every month their plan stays active.',    badge: '↺ RECURRING' },
    { amount: '€40',   amtCls: 'text-amber-700',  label: 'Annual plan',  desc: 'Paid when someone takes a yearly subscription.',     badge: null },
  ];

  return (
    <div className="pw-bg pw-body" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{INFO_STYLES}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl pt-16 pb-12 px-0">
        <p className="pw-muted text-[11px] tracking-[0.2em] uppercase mb-8 font-medium">
          Pepperwahl &nbsp;·&nbsp; Partner Program
        </p>
        <h1 className="pw-serif pw-body leading-[1.08] font-bold mb-6"
            style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>
          Share a link. Get paid{' '}
          <em className="not-italic text-red-600 pw-serif"
              style={{ fontStyle: 'italic' }}>every month</em>{' '}
          it keeps working.
        </h1>
        <p className="pw-muted text-base leading-relaxed max-w-lg">
          You post your link. People click it, sign up, subscribe. Each of those
          steps pays — and the subscription keeps paying for as long as it runs.
        </p>
      </div>

      {/* ── Live ledger widget ────────────────────────────────────────────── */}
      <div className="border pw-rule rounded-sm mb-16 overflow-hidden"
           style={{ background: '#f7f6f4' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b"
             style={{ borderColor: '#e8e4df' }}>
          <span className="pw-muted text-[11px] tracking-[0.15em] uppercase font-medium">
            Partner Ledger &nbsp;·&nbsp; <span className="pw-body font-semibold">ABC123</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] tracking-wider text-red-600 font-semibold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        </div>
        {ledgerItems.map((item, i) => (
          <div
            key={i}
            className="pw-ledger-row flex items-center justify-between px-5 py-3.5 transition-all duration-500"
            style={{ opacity: i <= tick ? 1 : 0.22 }}
          >
            <span className="text-sm pw-body font-normal" style={{ fontFamily: "'Courier New', monospace" }}>
              {item.label}
            </span>
            <div className="flex items-center gap-8">
              {item.time && (
                <span className="pw-muted text-xs font-mono hidden sm:block">{item.time}</span>
              )}
              {item.detail && (
                <span className="pw-muted text-xs font-mono hidden sm:block">{item.detail}</span>
              )}
              <span className={`text-sm font-mono font-semibold tabular-nums ${item.amtCls}`}>
                {item.amount}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3 border-t pw-rule">
          <span className="pw-muted text-[11px] tracking-[0.15em] uppercase font-medium">Today</span>
          <span className="text-sm font-mono font-bold pw-body tabular-nums">€44.72</span>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <hr className="pw-rule mb-16" />

      {/* ── Four tiers ───────────────────────────────────────────────────── */}
      <div className="mb-16">
        <p className="pw-muted text-[11px] tracking-[0.2em] uppercase font-medium mb-4">
          What each step pays
        </p>
        <h2 className="pw-serif pw-body font-bold mb-3" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' }}>
          Four ways your link earns
        </h2>
        <p className="pw-muted text-sm mb-10 max-w-md">
          They stack. One person who clicks, signs up and subscribes pays you all three.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px border pw-rule overflow-hidden rounded-sm"
             style={{ background: '#e8e4df' }}>
          {tiers.map(t => (
            <div key={t.label} className="pw-bg p-7 flex flex-col gap-3 relative">
              {t.badge && (
                <span className="absolute top-4 right-4 text-[9px] tracking-widest font-bold text-red-500 uppercase">
                  {t.badge}
                </span>
              )}
              <p className={`pw-serif font-bold tabular-nums leading-none ${t.amtCls}`}
                 style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)' }}>
                {t.amount}
              </p>
              <p className="pw-body text-sm font-semibold">{t.label}</p>
              <p className="pw-muted text-xs leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Calculator ───────────────────────────────────────────────────── */}
      <div className="mb-16">
        <p className="pw-muted text-[11px] tracking-[0.2em] uppercase font-medium mb-4">Run your own numbers</p>
        <h2 className="pw-serif pw-body font-bold mb-2" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}>
          What a month could look like
        </h2>
        <p className="pw-muted text-sm mb-10">Drag to match the audience you actually have.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Sliders */}
          <div className="space-y-8">
            {[
              { label: 'Clicks on your link',           val: clicks,      set: setClicks,      min: 10,  max: 5000, step: 10, display: clicks.toString(),     hint: 'People who open Pepperwahl through you, per month.' },
              { label: 'Of those, how many sign up',    val: signupRate,  set: setSignupRate,  min: 1,   max: 30,   step: 1,  display: `${signupRate}%`,       hint: 'A well-matched audience usually lands between 2% and 8%.' },
              { label: 'Of signups, how many subscribe',val: subRate,     set: setSubRate,     min: 1,   max: 50,   step: 1,  display: `${subRate}%`,          hint: 'The rest still earned you the click and signup.' },
              { label: 'Annual plans among subscribers',val: annualPct,   set: setAnnualPct,   min: 0,   max: 100,  step: 5,  display: `${annualPct}%`,        hint: 'Annual pays €40 at once; monthly pays €4 and repeats.' },
            ].map(({ label, val, set, min, max, step, display, hint }) => (
              <div key={label}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="pw-body text-sm font-medium">{label}</span>
                  <span className="pw-serif font-bold tabular-nums text-red-600" style={{ fontSize: '1.15rem' }}>
                    {display}
                  </span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(Number(e.target.value))}
                  className="pw-range" />
                <p className="pw-muted text-xs mt-2">{hint}</p>
              </div>
            ))}
          </div>
          {/* Results */}
          <div className="flex flex-col gap-4">
            <div className="border pw-rule p-7 flex-1" style={{ background: '#f7f6f4' }}>
              <p className="pw-muted text-[11px] tracking-[0.18em] uppercase font-medium mb-5">First month</p>
              <p className="pw-serif pw-body font-bold tabular-nums mb-6" style={{ fontSize: 'clamp(2.4rem, 4vw, 3.2rem)' }}>
                €{totalFirst.toFixed(2)}
              </p>
              <div className="space-y-2.5 border-t pw-rule pt-5">
                {[
                  ['Clicks',        `€${(clicks * 0.02).toFixed(2)}`],
                  ['Clicks',        `€${(clicks * 0.02).toFixed(2)}`],
                  ['Signups',       `€${(signups * 0.70).toFixed(2)}`],
                  ['Monthly plans', `€${(monthlySubs * 4.00).toFixed(2)}`],
                  ['Annual plans',  `€${(annualSubs * 40.00).toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="pw-muted text-sm">{k}</span>
                    <span className="pw-body text-sm font-mono tabular-nums font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-red-200 p-6" style={{ background: '#fdf2f0' }}>
              <p className="text-[11px] tracking-[0.18em] text-red-500 uppercase font-medium mb-2">
                Recurring, month after month
              </p>
              <p className="pw-serif text-red-700 font-bold tabular-nums" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
                €{recurring.toFixed(2)}
              </p>
              <p className="text-red-400 text-xs mt-1.5">From monthly plans, while they stay active.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="pw-serif pw-body font-bold mb-10" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' }}>
          Three steps, about five minutes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px border pw-rule overflow-hidden rounded-sm"
             style={{ background: '#e8e4df' }}>
          {[
            { step: '01', title: 'Get your link',          body: 'Sign up as a partner and your link is ready immediately — survey.pepperwahl.com with your code on the end.' },
            { step: '02', title: 'Put it where people are', body: 'A newsletter, a community, a YouTube description, a class you teach. It works best where people already trust you.' },
            { step: '03', title: 'Watch the ledger',       body: 'Your dashboard shows clicks, signups and active plans as they happen. Withdraw whenever your balance clears.' },
          ].map(({ step, title, body }) => (
            <div key={step} className="pw-bg p-7">
              <p className="text-[10px] tracking-[0.2em] font-bold text-red-500 uppercase mb-4">Step {step}</p>
              <h3 className="pw-serif pw-body font-bold text-lg mb-3">{title}</h3>
              <p className="pw-muted text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fine print ───────────────────────────────────────────────────── */}
      <div className="mb-16 border-t pw-rule pt-10">
        <p className="pw-muted text-[11px] tracking-[0.18em] uppercase font-medium mb-4">Good to know</p>
        <ul className="space-y-2.5">
          {[
            'Signup bonuses are confirmed 14 days after the account is created.',
            'A signup counts once the person confirms their email address.',
            'Duplicate or automated signups are not eligible.',
            'Monthly credit continues while the plan is active and stops when it ends.',
            'Earnings are shown in euros; payouts follow your selected method.',
            'Full partner terms are provided when you join.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 pw-muted text-sm">
              <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className="py-16 text-center border-t pw-rule">
        <h2 className="pw-serif pw-body font-bold mb-3" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>
          Your link is one form away
        </h2>
        <p className="pw-muted text-sm mb-8">Free to join. No minimum audience, no exclusivity, no lock-in.</p>
        <button
          onClick={() => authenticated ? onJoin() : navigate('/signup')}
          className="inline-block px-9 py-4 text-white text-sm font-semibold tracking-wide transition-all"
          style={{ background: '#c0392b', letterSpacing: '0.05em' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#a93226')}
          onMouseLeave={e => (e.currentTarget.style.background = '#c0392b')}
        >
          Become a partner
        </button>
      </div>
    </div>
  );
}

// ─── Payment Methods Card ─────────────────────────────────────────────────────
function PaymentMethodsCard({ baseUrl, onSaved }: { baseUrl: string; onSaved?: (m: PaymentMethods) => void }) {
  const [open, setOpen]             = useState(false);
  const [methods, setMethods]       = useState<PaymentMethods>({});
  const [activeTab, setActiveTab]   = useState<'bank' | 'paypal' | 'crypto'>('bank');
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState<string | null>(null);
  const [msgErr, setMsgErr]         = useState(false);

  const [bankForm, setBankForm]     = useState({ account_name: '', account_number: '', ifsc: '', bank_name: '' });
  const [paypalForm, setPaypalForm] = useState({ email: '' });
  const [cryptoForm, setCryptoForm] = useState({ wallet_address: '', network: 'ETH' });

  const loadMethods = () => {
    authFetch(`${baseUrl}/api/partner/payment-methods`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setMethods(d);
        if (d.bank)   setBankForm({ account_name: d.bank.account_name, account_number: d.bank.account_number, ifsc: d.bank.ifsc, bank_name: d.bank.bank_name });
        if (d.paypal) setPaypalForm({ email: d.paypal.email });
        if (d.crypto) setCryptoForm({ wallet_address: d.crypto.wallet_address, network: d.crypto.network });
      })
      .catch(() => {});
  };

  useEffect(() => { loadMethods(); }, [baseUrl]);

  const savedCount = [methods.bank, methods.paypal, methods.crypto].filter(Boolean).length;

  const save = async () => {
    setSaving(true); setMsg(null);
    const body: Record<string, any> = {};
    if (activeTab === 'bank')   body.bank   = bankForm;
    if (activeTab === 'paypal') body.paypal = paypalForm;
    if (activeTab === 'crypto') body.crypto = cryptoForm;
    try {
      const res = await authFetch(`${baseUrl}/api/partner/payment-methods`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const updated = { ...methods, [activeTab]: body[activeTab] };
        setMethods(updated);
        onSaved?.(updated);
        setMsg('Saved successfully'); setMsgErr(false);
        setTimeout(() => { setMsg(null); setOpen(false); }, 1200);
      } else {
        setMsg(data.error || 'Save failed'); setMsgErr(true);
      }
    } catch { setMsg('Failed. Please try again.'); setMsgErr(true); }
    finally { setSaving(false); }
  };

  const methodTabs: { id: 'bank' | 'paypal' | 'crypto'; label: string }[] = [
    { id: 'bank',   label: 'Bank Transfer' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'crypto', label: 'Crypto' },
  ];

  return (
    <>
      {/* Trigger button — compact, sits inline */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700"
      >
        <CreditCard size={14} className="text-gray-400" />
        Payment methods
        {savedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">
            {savedCount} saved
          </span>
        )}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Payment Methods</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 pt-4 gap-1">
              {methodTabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id); setMsg(null); }}
                  className={`relative px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === id ? 'text-red-600 bg-red-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {methods[id] && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Form body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {msg && (
                <div className={`px-4 py-2 rounded-lg text-sm ${msgErr ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}

              {activeTab === 'bank' && (
                <>
                  {([
                    { field: 'account_name',   label: 'Account Name',    ph: 'John Doe' },
                    { field: 'account_number', label: 'Account Number',  ph: '000123456789' },
                    { field: 'ifsc',           label: 'IFSC / Sort Code',ph: 'HDFC0001234' },
                    { field: 'bank_name',      label: 'Bank Name',       ph: 'HDFC Bank' },
                  ] as { field: keyof typeof bankForm; label: string; ph: string }[]).map(({ field, label, ph }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input
                        type="text"
                        value={bankForm[field]}
                        onChange={e => setBankForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder={ph}
                        className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-colors placeholder:text-gray-400"
                      />
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'paypal' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalForm.email}
                    onChange={e => setPaypalForm({ email: e.target.value })}
                    placeholder="your@paypal.com"
                    className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-colors placeholder:text-gray-400"
                  />
                </div>
              )}

              {activeTab === 'crypto' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Wallet Address</label>
                    <input
                      type="text"
                      value={cryptoForm.wallet_address}
                      onChange={e => setCryptoForm(p => ({ ...p, wallet_address: e.target.value }))}
                      placeholder="0x… or bc1…"
                      className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 font-mono transition-colors placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Network / Currency</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'ETH',        label: 'ETH',        sub: 'Ethereum' },
                        { id: 'BTC',        label: 'BTC',        sub: 'Bitcoin' },
                        { id: 'USDT-TRC20', label: 'USDT-TRC20', sub: 'Tron (TRC-20)' },
                        { id: 'USDT-ERC20', label: 'USDT-ERC20', sub: 'Ethereum (ERC-20)' },
                      ].map(({ id, label, sub }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCryptoForm(p => ({ ...p, network: id }))}
                          className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors ${
                            cryptoForm.network === id
                              ? 'bg-red-50 border-red-400'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-sm font-semibold ${cryptoForm.network === id ? 'text-red-600' : 'text-gray-800'}`}>
                            {label}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Payout History ───────────────────────────────────────────────────────────
function PayoutHistory({ baseUrl }: { baseUrl: string }) {
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${baseUrl}/api/partner/payouts`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setPayouts(Array.isArray(d) ? d : []))
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false));
  }, [baseUrl]);

  if (loading) return (
    <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
  );
  if (payouts.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-sm text-gray-400">
      No payout requests yet.
    </div>
  );

  const statusColor: Record<string, string> = {
    requested: 'bg-yellow-100 text-yellow-700',
    paid:      'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Wallet size={16} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Payout History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Requested</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Transaction ID</th>
              <th className="px-4 py-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payouts.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold text-gray-900">{fmtEur(p.amount_cents)}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{p.method_type || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.requested_at ? new Date(p.requested_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.transaction_id || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.admin_message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Share Message ────────────────────────────────────────────────────────────
const SHARE_TEMPLATES = [
  (link: string) =>
    `Hey! I've been using Pepperwahl for creating surveys — it's genuinely great. You can try it free here: ${link}`,
  (link: string) =>
    `If you're looking for a smart survey tool, check out Pepperwahl. Sign up through my link and start building: ${link}`,
  (link: string) =>
    `Quick recommendation — Pepperwahl makes survey creation ridiculously easy. Give it a go: ${link}`,
  (link: string) =>
    `I use Pepperwahl for all my surveys. It's free to start and the AI survey builder is actually useful. Here's my link: ${link}`,
];

function ShareMessage({ link }: { link: string }) {
  const [templateIdx, setTemplateIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const message = SHARE_TEMPLATES[templateIdx](link);

  const copyMsg = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors mt-3"
      >
        <span className="text-base leading-none">💬</span>
        {open ? 'Hide' : 'Get a share message'}
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm text-gray-800 leading-relaxed">{message}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={copyMsg}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy message'}
            </button>
            <button
              onClick={() => setTemplateIdx(i => (i + 1) % SHARE_TEMPLATES.length)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              Try another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ways to Earn Modal ───────────────────────────────────────────────────────
function WaysToEarnModal({ onClose, baseUrl }: { onClose: () => void; baseUrl: string }) {
  const [cfg, setCfg] = useState<EarningsConfig | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${baseUrl}/api/earnings-config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setCfg(d))
      .catch(() => {});
  }, [baseUrl]);

  const ways = cfg
    ? [
        {
          icon: Video,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          title: cfg.video_bonus_label || 'Create a video about Pepperwahl',
          amount: fmtEur(cfg.video_bonus_cents),
          amountLabel: 'one-time bonus',
          description: cfg.video_bonus_description,
        },
        {
          icon: Share2,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          title: 'Share surveys & earn per completion',
          amount: 'Variable',
          amountLabel: 'per completion (set by admin)',
          description: cfg.survey_share_description,
        },
        {
          icon: Users,
          color: 'text-green-600',
          bg: 'bg-green-50',
          title: 'Refer new users to sign up',
          amount: fmtEur(cfg.signup_cents),
          amountLabel: 'per confirmed signup',
          description: cfg.signup_description,
        },
        {
          icon: PlanIcon,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          title: 'Your referred user subscribes',
          amount: `${fmtEur(cfg.monthly_sub_cents)}/mo or ${fmtEur(cfg.annual_sub_cents)} annual`,
          amountLabel: 'recurring while active',
          description: cfg.plan_description,
        },
        {
          icon: MousePointerClick,
          color: 'text-red-600',
          bg: 'bg-red-50',
          title: 'Clicks on your referral link',
          amount: fmtEur(cfg.click_cents),
          amountLabel: 'per unique daily click',
          description: cfg.click_description,
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-red-500" />
            <h3 className="text-base font-bold text-gray-900">Ways to Earn</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-2">
          {!cfg && (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
          )}
          {ways.map((w, i) => {
            const Icon = w.icon;
            const open = expanded === i;
            return (
              <button
                key={i}
                onClick={() => setExpanded(open ? null : i)}
                className="w-full text-left border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${w.bg} shrink-0`}>
                    <Icon size={17} className={w.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{w.title}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-bold text-gray-800">{w.amount}</span>
                      {' '}{w.amountLabel}
                    </p>
                  </div>
                  {open
                    ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                </div>
                {open && w.description && (
                  <div className="px-4 pb-3 pt-0 text-xs text-gray-500 leading-relaxed border-t border-gray-100 bg-gray-50">
                    {w.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400">
          Rates are set by the Pepperwahl admin team and may change. Earnings are subject to review.
        </div>
      </div>
    </div>
  );
}

// ─── Survey Earnings Section ──────────────────────────────────────────────────
const SurveyEarningsSection = forwardRef<
  { switchToReports: () => void },
  { baseUrl: string }
>(function SurveyEarningsSection({ baseUrl }, ref) {
  const [ownedRows, setOwnedRows]   = useState<SurveyEarningRow[]>([]);
  const [shareRows, setShareRows]   = useState<SurveyEarningRow[]>([]);
  const [totals, setTotals]         = useState({ clicks: 0, completions: 0, earned_cents: 0, pending_cents: 0, total_responses: 0 });
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'surveys' | 'reports'>('surveys');
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [linkCache, setLinkCache]   = useState<Record<string, string>>({});
  const token = localStorage.getItem('auth_token');

  // Expose switchToReports so EarningsPanel can trigger it from the balance card
  useImperativeHandle(ref, () => ({
    switchToReports: () => {
      setTab('reports');
      // Scroll the section into view
      setTimeout(() => {
        const el = document.getElementById('survey-earnings-section');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }));

  const load = () => {
    setLoading(true);
    fetch(`${baseUrl}/api/partner/survey-earnings`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(r => r.ok ? r.json() : { owned_surveys: [], share_rows: [], totals: {} })
      .then(d => {
        setOwnedRows(d.owned_surveys || []);
        setShareRows(d.share_rows || d.rows || []);
        setTotals(d.totals || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [baseUrl, token]);

  const copyLink = async (surveyId: string) => {
    let link = linkCache[surveyId];
    if (!link) {
      try {
        const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/share-link`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const d = await res.json();
          link = d.share_link;
          setLinkCache(prev => ({ ...prev, [surveyId]: link }));
        }
      } catch { /* ignore */ }
    }
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedId(surveyId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const shareEarnings = totals.earned_cents + totals.pending_cents;

  // Build a lookup from shareRows for quick merge
  const shareByIdMap: Record<string, SurveyEarningRow> = {};
  shareRows.forEach(r => { shareByIdMap[r.survey_id] = r; });

  // Earnings Report = surveys where sharing is Active (enabled) OR already has activity
  // This way a newly-enabled survey appears immediately, not only after someone clicks
  const reportRows = ownedRows.filter(row =>
    row.share_payout_enabled ||
    (shareByIdMap[row.survey_id] && (
      (shareByIdMap[row.survey_id].clicks ?? 0) > 0 ||
      (shareByIdMap[row.survey_id].completions ?? 0) > 0
    ))
  );

  return (
    <div className="space-y-0" id="survey-earnings-section">
      {/* ── Tab header ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-t-2xl border border-gray-200 border-b-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Survey Activity & Earnings</h3>
          </div>
          {shareEarnings > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Share earnings</p>
              <p className="text-base font-bold text-gray-900">{fmtEur(shareEarnings)}</p>
              {totals.pending_cents > 0 && (
                <p className="text-[10px] text-orange-500">{fmtEur(totals.pending_cents)} pending review</p>
              )}
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 -mb-px">
          <button
            onClick={() => setTab('surveys')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'surveys'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Surveys
            <span className="ml-1.5 text-[10px] font-bold text-gray-400">({ownedRows.length})</span>
          </button>
          <button
            onClick={() => setTab('reports')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Earnings Report
            {reportRows.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500 text-white">
                {reportRows.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-b-2xl border border-gray-200 border-t overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* ─ Tab 1: My Surveys ──────────────────────────────────────── */}
            {tab === 'surveys' && (
              ownedRows.length === 0 ? (
                <div className="py-10 text-center">
                  <Share2 size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No surveys yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create a survey from your dashboard.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left">Survey</th>
                        <th className="px-4 py-3 text-center">Responses</th>
                        <th className="px-4 py-3 text-center">Sharing</th>
                        <th className="px-4 py-3 text-center">Payout / Completion</th>
                        <th className="px-4 py-3 text-center">Copy Share Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ownedRows.map(row => (
                        <tr key={row.survey_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900 max-w-[220px] truncate">{row.survey_title}</div>
                            <div className="text-[11px] font-mono text-gray-400 mt-0.5 select-all cursor-text">{row.survey_id}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xl font-bold text-gray-800">{row.response_count ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.share_payout_enabled
                              ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Active</span>
                              : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400">Off</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            {row.payout_per_completion_cents > 0
                              ? <span className="font-bold text-green-700 text-sm">{fmtEur(row.payout_per_completion_cents)}</span>
                              : <span className="text-gray-300">Not set by admin</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => copyLink(row.survey_id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                copiedId === row.survey_id
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700'
                              }`}
                            >
                              {copiedId === row.survey_id ? <Check size={13} /> : <Copy size={13} />}
                              {copiedId === row.survey_id ? 'Copied!' : 'Copy Link'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50 text-xs font-bold text-gray-600">
                        <td className="px-5 py-3">Total</td>
                        <td className="px-4 py-3 text-center text-gray-800">{totals.total_responses}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}

            {/* ─ Tab 2: Earnings Report ─────────────────────────────────── */}
            {tab === 'reports' && (
              reportRows.length === 0 ? (
                <div className="py-12 text-center px-6">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Share2 size={26} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">No active earning surveys yet</p>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Admin needs to enable sharing payout on your surveys first.
                    Once enabled, they'll appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                    {[
                      { label: 'Total Responses',      value: totals.total_responses,         color: 'text-blue-600' },
                      { label: 'Completions Credited',  value: totals.completions,             color: 'text-indigo-600' },
                      { label: 'Total Earned',          value: fmtEur(totals.earned_cents),    color: 'text-green-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="px-5 py-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left">Survey</th>
                        <th className="px-4 py-3 text-center">Responses</th>
                        <th className="px-4 py-3 text-center">Completions Credited</th>
                        <th className="px-4 py-3 text-center">Payout Each</th>
                        <th className="px-4 py-3 text-right">Earned</th>
                        <th className="px-4 py-3 text-right">Admin Reverted</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reportRows.map(row => {
                        const sh = shareByIdMap[row.survey_id];
                        const completions = sh?.completions ?? 0;
                        const earned      = sh?.earned_cents ?? 0;
                        const pending     = sh?.pending_cents ?? 0;
                        const latestAt    = sh?.latest_at ?? null;
                        return (
                        <tr key={row.survey_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900 max-w-[200px] truncate">{row.survey_title}</div>
                            <div className="text-[11px] font-mono text-gray-400 mt-0.5">{row.survey_id}</div>
                            {latestAt && (
                              <div className="text-[10px] text-gray-300 mt-0.5">Last activity: {timeAgo(latestAt)}</div>
                            )}
                          </td>
                          {/* Total responses submitted to this survey */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg font-bold text-gray-800">{row.response_count ?? 0}</span>
                          </td>
                          {/* Completions that have been credited (pending or approved) */}
                          <td className="px-4 py-3 text-center font-bold text-gray-700">
                            {completions > 0 ? completions : <span className="text-gray-300">0</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            {row.payout_per_completion_cents > 0
                              ? <span className="font-bold text-green-700">{fmtEur(row.payout_per_completion_cents)}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold">
                            {earned > 0
                              ? <span className="text-green-700">{fmtEur(earned)}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-xs">
                            {pending > 0
                              ? <span className="font-semibold text-orange-500">{fmtEur(pending)}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {pending > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-100">
                                ⏳ In review
                              </span>
                            ) : earned > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100">
                                ✓ Added to balance
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                                🟢 Active — waiting for responses
                              </span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50 text-xs font-bold text-gray-600">
                        <td className="px-5 py-3">Totals</td>
                        <td className="px-4 py-3 text-center text-gray-800">{totals.total_responses}</td>
                        <td className="px-4 py-3 text-center text-gray-800">{totals.completions}</td>
                        <td />
                        <td className="px-4 py-3 text-right text-green-700">{fmtEur(totals.earned_cents)}</td>
                        <td className="px-4 py-3 text-right text-orange-500">
                          {totals.pending_cents > 0 ? fmtEur(totals.pending_cents) : '—'}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                  <div className="px-5 py-3 bg-green-50 border-t border-green-100 text-[11px] text-green-700">
                    ✓ Earnings are added to your Available to Withdraw balance instantly. Admin can revert individual completions if needed.
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
});

// ─── Earnings Panel (authenticated) ──────────────────────────────────────────
function EarningsPanel() {
  const baseUrl = getApiBaseUrl();
  const [summary,  setSummary]  = useState<PromoterSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [joining,  setJoining]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [payoutMsg,setPayoutMsg]= useState<string | null>(null);
  const [payoutId, setPayoutId] = useState<string | null>(null);
  const [isPromoter, setIsPromoter] = useState<boolean | null>(null); // null = unknown
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethods>({});
  const [showWaysModal, setShowWaysModal] = useState(false);
  const [surveyEarningsCents, setSurveyEarningsCents] = useState<number>(0);
  const surveyReportRef = useRef<{ switchToReports: () => void } | null>(null);

  useEffect(() => { load(); }, []);

  // Listen for refresh events dispatched from the page header button
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('referral-refresh', handler);
    return () => window.removeEventListener('referral-refresh', handler);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // 8-second timeout so a non-responsive backend doesn't spin forever
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      let res: Response;
      try {
        res = await authFetch(`${baseUrl}/api/partner/summary`, { signal: controller.signal });
        clearTimeout(timer);
      } catch (fetchErr: any) {
        clearTimeout(timer);
        // Backend not available yet — show join gate so user isn't stuck on spinner
        setIsPromoter(false);
        setError('Referral backend not reachable. You can still join once it is live.');
        return;
      }

      if (res.status === 404 || res.status === 403) {
        setIsPromoter(false);
      } else if (res.ok) {
        const data = await res.json();
        setSummary(data);
        setIsPromoter(true);
        const actRes = await authFetch(`${baseUrl}/api/partner/activity?limit=50`).catch(() => null);
        if (actRes?.ok) setActivity(await actRes.json());
        // Load saved payment methods
        const pmRes = await authFetch(`${baseUrl}/api/partner/payment-methods`).catch(() => null);
        if (pmRes?.ok) setSavedPaymentMethods(await pmRes.json());

        // Load survey earnings total for the balance card
        const seRes = await authFetch(`${baseUrl}/api/partner/survey-earnings`).catch(() => null);
        if (seRes?.ok) {
          const seData = await seRes.json();
          setSurveyEarningsCents(seData?.totals?.earned_cents ?? 0);
        }
      } else {
        // Any other error — show join gate rather than infinite spinner
        setIsPromoter(false);
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Server error (${res.status})`);
      }
    } catch {
      // Last-resort catch — always exit loading state
      setIsPromoter(false);
      setError('Could not load referral data. Backend may not be deployed yet.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await authFetch(`${baseUrl}/api/partner/join`, { method: 'POST' });
      if (res.ok) {
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to join program');
      }
    } catch {
      setError('Failed. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handlePayout = async () => {
    setPayoutMsg(null);
    setPayoutId(null);
    try {
      const res = await authFetch(`${baseUrl}/api/partner/payout`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPayoutMsg(`✓ Payout of ${fmtEur(data.amount_cents)} requested successfully`);
        setPayoutId(data.payout_id || null);
        await load(); // Refresh balance
      } else {
        setPayoutMsg(data.error || 'Payout request failed');
      }
    } catch {
      setPayoutMsg('Failed. Please try again.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 size={28} className="animate-spin text-red-400" />
      <p className="text-sm text-gray-400">Loading your referral data…</p>
    </div>
  );

  // Error state
  if (error && isPromoter === null) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertCircle size={28} className="text-red-400" />
      <p className="text-sm text-gray-600">{error}</p>
      <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );

  // Join gate
  if (!isPromoter) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <Gift size={32} className="text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">You're not a partner yet</h2>
      <p className="text-gray-500 max-w-sm mb-4">
        Join the program to get your unique referral link and start earning. Free and instant.
      </p>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <button
        onClick={handleJoin}
        disabled={joining}
        className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
      >
        {joining ? <><Loader2 size={16} className="animate-spin" /> Setting up…</> : <><Gift size={16} /> Join the program</>}
      </button>
    </div>
  );

  if (!summary) return null;

  // Always construct the link on the frontend using the correct format
  // so it works even if the backend returns an old cached value
  const signupBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://survey.pepperwahl.com';
  const referralLink = `${signupBase}/signup?ref=${summary.ref_code}`;

  const statusStyle: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    in_review: 'bg-yellow-100 text-yellow-700',
  };
  const getStatusStyle = (s: string | null) => s && statusStyle[s] ? statusStyle[s] : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Ways to Earn button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowWaysModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-colors"
        >
          <Gift size={15} className="text-red-500" />
          Ways to Earn
          <ChevronRight size={14} className="text-gray-400" />
        </button>
      </div>

      {showWaysModal && (
        <WaysToEarnModal onClose={() => setShowWaysModal(false)} baseUrl={baseUrl} />
      )}

      {/* Survey earnings balance card — click to jump to Earnings Report */}
      {surveyEarningsCents > 0 && (
        <button
          onClick={() => surveyReportRef.current?.switchToReports()}
          className="w-full text-left bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 hover:from-green-100 hover:to-emerald-100 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Share2 size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Survey Earnings</p>
                <p className="text-xs text-gray-500">From responses on your active surveys</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">{fmtEur(surveyEarningsCents)}</p>
                <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Earned</p>
              </div>
              <ChevronRight size={18} className="text-green-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      )}

      {/* Link + balance */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your referral link</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono text-gray-700 truncate">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={referralLink} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              <ExternalLink size={14} />
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Code: <span className="font-mono font-semibold text-gray-600">{summary.ref_code}</span>
          </p>

          {/* Share message */}
          <ShareMessage link={referralLink} />
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Earned to date</p>
          <p className="text-4xl font-bold text-gray-900">
            {fmtEur(summary.balance_available_cents + summary.balance_pending_cents)}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Clicks',   value: summary.clicks_total,      sub: fmtEur(summary.clicks_total * 2),  color: '' },
          { label: 'Unique Clicks',  value: summary.clicks_unique,     sub: 'Distinct visitors',               color: '' },
          { label: 'Signups',        value: summary.signups_confirmed + summary.signups_pending,
            sub: `${summary.signups_pending} in review`, color: 'bg-blue-50 border-blue-200' },
          { label: 'Active Plans',   value: summary.subscriptions_active,
            sub: `${fmtEur(summary.mrr_cents)}/mo recurring`, color: 'bg-green-50 border-green-200' },
          { label: 'In Review',      value: fmtEur(summary.balance_pending_cents),
            sub: 'Released after review', color: 'bg-orange-50 border-orange-200' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`rounded-xl border border-gray-200 p-4 bg-white ${color}`}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Balance + payout */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 text-white rounded-2xl p-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Available to withdraw</p>
          <p className="text-3xl font-bold">{fmtEur(summary.balance_available_cents)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Pending: {fmtEur(summary.balance_pending_cents)} — releases when approved
          </p>
          {payoutMsg && <p className="text-xs mt-2 text-yellow-300">{payoutMsg}</p>}
          {payoutId && <p className="text-xs mt-1 text-gray-400">Payout ID: <span className="font-mono text-gray-300">{payoutId}</span></p>}
        </div>
        <div className="flex items-center gap-3">
          <PaymentMethodsCard
            baseUrl={baseUrl}
            onSaved={(m) => setSavedPaymentMethods(m)}
          />
          {(() => {
            const hasMethod = !!(savedPaymentMethods.bank || savedPaymentMethods.paypal || savedPaymentMethods.crypto);
            if (!hasMethod) return (
              <p className="text-xs text-gray-400 max-w-[160px] text-right">Add a payment method first</p>
            );
            return (
              <button
                onClick={handlePayout}
                disabled={summary.balance_available_cents < 2500}
                className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm"
                title={summary.balance_available_cents < 2500 ? 'Minimum €25 required' : ''}
              >
                Request payout
              </button>
            );
          })()}
        </div>
      </div>

      {/* Activity table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
          <button onClick={load} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Visitor</th>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Signup</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-right">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activity.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.visitor_label}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(row.occurred_at)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.city || row.country
                      ? [row.city, row.country].filter(Boolean).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.signup_status ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusStyle(row.signup_status)}`}>
                        {row.signup_status === 'in_review' ? 'In review' :
                         row.signup_status === 'confirmed' ? 'Confirmed' : row.signup_status}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.plan ? (
                      <span className={`text-[11px] font-semibold ${row.plan === 'annual' ? 'text-orange-600' : 'text-green-600'}`}>
                        {row.plan}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtEur(row.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activity.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              No activity yet — share your link to get started.
            </div>
          )}
        </div>
      </div>

      {/* Survey sharing earnings */}
      <SurveyEarningsSection baseUrl={baseUrl} ref={surveyReportRef} />

      {/* Payout history */}
      <PayoutHistory baseUrl={baseUrl} />
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function ReferAndEarn() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'info' | 'earnings'>('info');
  const baseUrl = getApiBaseUrl();
  const [earningsCfg, setEarningsCfg] = useState<EarningsConfig | null>(null);

  useEffect(() => {
    fetch(`${baseUrl}/api/earnings-config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setEarningsCfg(d))
      .catch(() => {});
  }, [baseUrl]);

  // Auto-switch to earnings tab if ?tab=earnings is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'earnings' && authenticated) {
      setTab('earnings');
    }
  }, [authenticated]);

  const tabs = [
    { id: 'info'     as const, label: 'How it works', icon: Info     },
    { id: 'earnings' as const, label: 'My Earnings',  icon: BarChart2 },
  ];

  // Always show both tabs; clicking My Earnings while logged out → redirect to login
  const handleTabClick = (id: 'info' | 'earnings') => {
    if (id === 'earnings' && !authenticated) {
      navigate('/login?redirect=/refer');
      return;
    }
    setTab(id);
  };

  return (
    <div className={`flex min-h-screen ${tab === 'info' ? '' : 'bg-gray-50'}`}
         style={tab === 'info' ? { background: '#fafaf9' } : {}}>
      {authenticated && <Navigation />}

      <div className="flex-1 min-w-0">
        {/* Public header */}
        {!authenticated && (
          <div className="border-b px-6 py-4 flex items-center justify-between"
               style={{ background: '#fafaf9', borderColor: '#e8e4df' }}>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Pepperwahl" className="w-7 h-7" />
              <span className="font-bold text-stone-800" style={{ fontSize: '0.95rem', letterSpacing: '0.01em' }}>Pepperwahl</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/login"  className="text-sm text-stone-500 hover:text-stone-800 transition-colors">Sign in</a>
              <a href="/signup" className="text-sm text-white px-4 py-1.5 font-medium transition-colors"
                 style={{ background: '#1f3d2b' }}
                 onMouseEnter={e => (e.currentTarget.style.background = '#c0392b')}
                 onMouseLeave={e => (e.currentTarget.style.background = '#1f3d2b')}>
                Get started
              </a>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
          {/* Page header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"
                  style={{ color: tab === 'info' ? '#2a2018' : '#111827' }}>
                <Gift size={22} className="text-red-500" />
                Refer &amp; Earn
              </h1>
              <p className="text-sm mt-0.5" style={{ color: tab === 'info' ? '#8a8078' : '#6b7280' }}>
                {earningsCfg
                  ? `${fmtEur(earningsCfg.click_cents)} click · ${fmtEur(earningsCfg.signup_cents)} signup · ${fmtEur(earningsCfg.monthly_sub_cents)}/mo · ${fmtEur(earningsCfg.annual_sub_cents)} annual`
                  : '€0.02 session · €0.70 signup · €4.00/mo · €40.00 annual'
                }
              </p>
            </div>
            {tab === 'earnings' && authenticated && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('referral-refresh'))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh earnings data"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="mb-10" style={{ borderBottom: `1px solid ${tab === 'info' ? '#d6cfc6' : '#e5e7eb'}` }}>
            <nav className="-mb-px flex gap-6">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 text-sm font-medium transition-colors ${
                    tab === id
                      ? 'border-red-500 text-red-600'
                      : `border-transparent ${tab === 'info' ? 'text-stone-400 hover:text-stone-700' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  <Icon size={15} />
                  {label}
                  {id === 'earnings' && !authenticated && (
                    <span className="ml-1 text-[10px] text-stone-400">· Sign in</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {tab === 'info'     && <InfoPage onJoin={() => handleTabClick('earnings')} />}
          {tab === 'earnings' && <EarningsPanel />}
        </div>
      </div>
    </div>
  );
}
