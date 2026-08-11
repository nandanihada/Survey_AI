/**
 * ResubmitPolicyTab
 *
 * Three levels of control, rendered as three sub-tabs:
 *   1. Global Default  — platform-wide fallback policy
 *   2. Per Survey      — override for individual surveys (shorter wins vs global)
 *   3. Per User        — override for a specific user across ALL their surveys
 *
 * Priority chain (highest → lowest):
 *   Per-User Global Rule → Per-Survey User Override → Per-Survey Policy → Global Default
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Globe, FileText, User, Clock, Ban, CheckCircle,
  Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Save, Info, Search, X,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'allow' | 'cooldown' | 'block_forever';

interface GlobalConfig {
  mode: Mode;
  cooldown_hours: number | null;
  updated_at?: string;
  updated_by?: string;
}

interface SurveyOverview {
  survey_id: string;
  survey_title: string;
  survey_status: string;
  policy: SurveyPolicy | null;
}

interface SurveyPolicy {
  survey_id: string;
  mode: Mode;
  cooldown_hours: number | null;
  updated_at?: string;
  updated_by?: string;
}

interface SurveyOverride {
  _id: string;
  survey_id: string;
  email?: string;
  fingerprint_hash?: string;
  mode: Mode;
  cooldown_hours?: number | null;
  note?: string;
  created_at?: string;
}

interface UserGlobalRule {
  _id: string;
  email: string;
  mode: Mode;
  cooldown_hours?: number | null;
  note?: string;
  created_at?: string;
}

interface SystemUser {
  _id?: string;
  uid?: string;
  email: string;
  name?: string;
  role?: string;
  photo_url?: string;
}

interface Submission {
  _id: string;
  user_info?: { email?: string; username?: string; ip_address?: string };
  device_fingerprint?: string;
  submitted_at?: string;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const S = {
  card: { background: '#FDFCFA', border: '1px solid #EBE8E3', borderRadius: 12, padding: '16px 20px', marginBottom: 10 } as React.CSSProperties,
  sectionBox: { background: '#F5F1E8', borderRadius: 10, padding: '16px 18px', marginBottom: 14 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: '#6B6158', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 } as React.CSSProperties,
  input: { fontSize: 13, border: '1px solid #D6D0CA', borderRadius: 8, padding: '7px 11px', width: '100%', fontFamily: 'inherit', background: '#fff', color: '#2D2520', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
};

function btn(accent?: boolean, danger?: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 15px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
    background: danger ? '#FEF2F2' : accent ? '#C4785C' : '#F5F1E8',
    color: danger ? '#DC2626' : accent ? '#fff' : '#3D3530',
    boxShadow: accent ? '0 2px 6px rgba(196,120,92,0.22)' : 'none',
  };
}

function modeBadgeCls(mode: string) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold';
  if (mode === 'allow') return `${base} bg-green-100 text-green-700`;
  if (mode === 'cooldown') return `${base} bg-amber-100 text-amber-700`;
  if (mode === 'block_forever') return `${base} bg-red-100 text-red-700`;
  return `${base} bg-gray-100 text-gray-600`;
}

function ModeIcon({ mode }: { mode: string }) {
  if (mode === 'block_forever') return <Ban size={10} />;
  if (mode === 'cooldown') return <Clock size={10} />;
  return <CheckCircle size={10} />;
}

function modeLabel(mode: string, hours?: number | null) {
  if (mode === 'allow') return 'Allow';
  if (mode === 'block_forever') return 'Block Forever';
  if (mode === 'cooldown') {
    if (!hours) return 'Cooldown';
    if (hours < 1) return `Cooldown · ${Math.round(hours * 60)}m`;
    if (hours >= 24 && hours % 24 === 0) return `Cooldown · ${hours / 24}d`;
    return `Cooldown · ${hours}h`;
  }
  return mode;
}

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

// ─── ModeForm helper ─────────────────────────────────────────────────────────

// ─── ModeForm helper ─────────────────────────────────────────────────────────
//
// Internally everything is stored as fractional hours (e.g. 30 min = 0.5).
// The UI exposes a value + unit selector (Minutes / Hours / Days) and converts
// on the fly. onHoursChange always receives the fractional-hours string.

type CooldownUnit = 'minutes' | 'hours' | 'days';

function toHours(value: string, unit: CooldownUnit): string {
  const n = parseFloat(value) || 0;
  if (unit === 'minutes') return String(+(n / 60).toFixed(6));
  if (unit === 'days')    return String(n * 24);
  return String(n);
}

function fromHours(fractionalHours: string): { value: string; unit: CooldownUnit } {
  const h = parseFloat(fractionalHours) || 0;
  if (h > 0 && h < 1) {
    // sub-hour → show as minutes
    return { value: String(Math.round(h * 60)), unit: 'minutes' };
  }
  if (h >= 24 && h % 24 === 0) {
    return { value: String(h / 24), unit: 'days' };
  }
  return { value: String(h), unit: 'hours' };
}

function ModeForm({
  mode, hours, onModeChange, onHoursChange,
}: {
  mode: Mode; hours: string;
  onModeChange: (m: Mode) => void;
  onHoursChange: (h: string) => void;
}) {
  // Derive display value/unit from the stored fractional-hours string
  const derived = fromHours(hours);
  const [displayValue, setDisplayValue] = React.useState(derived.value);
  const [unit, setUnit] = React.useState<CooldownUnit>(derived.unit);

  // Sync display when hours prop changes externally (e.g. loading saved policy)
  React.useEffect(() => {
    const d = fromHours(hours);
    setDisplayValue(d.value);
    setUnit(d.unit);
  }, [hours]);

  const handleValueChange = (v: string) => {
    setDisplayValue(v);
    onHoursChange(toHours(v, unit));
  };

  const handleUnitChange = (u: CooldownUnit) => {
    setUnit(u);
    onHoursChange(toHours(displayValue, u));
  };

  // Human-readable label for the cooldown option
  const cooldownLabel = () => {
    const n = parseFloat(displayValue) || 0;
    if (!n) return 'Cooldown — fill again after N minutes/hours/days';
    if (unit === 'minutes') return `Cooldown — fill again after ${n} min`;
    if (unit === 'days')    return `Cooldown — fill again after ${n} day${n !== 1 ? 's' : ''}`;
    return `Cooldown — fill again after ${n}h`;
  };

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <span style={S.label}>Policy Mode</span>
        <select value={mode} onChange={e => onModeChange(e.target.value as Mode)}
          style={{ ...S.input, width: 240 }}>
          <option value="allow">Allow — no restriction</option>
          <option value="cooldown">{cooldownLabel()}</option>
          <option value="block_forever">Block Forever — never again</option>
        </select>
      </div>
      {mode === 'cooldown' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <div>
            <span style={S.label}>Duration</span>
            <input
              type="number" min="1" step="1"
              value={displayValue}
              onChange={e => handleValueChange(e.target.value)}
              style={{ ...S.input, width: 80 }}
              placeholder="30"
            />
          </div>
          <div>
            <span style={S.label}>Unit</span>
            <select
              value={unit}
              onChange={e => handleUnitChange(e.target.value as CooldownUnit)}
              style={{ ...S.input, width: 110 }}
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UserSearchInput — searchable user picker ─────────────────────────────────

interface UserSearchInputProps {
  query: string;
  results: SystemUser[];
  selectedUser: SystemUser | null;
  showDropdown: boolean;
  onQueryChange: (q: string) => void;
  onSelect: (u: SystemUser) => void;
  onClear: () => void;
  onFocus: () => void;
  placeholder?: string;
}

function UserSearchInput({
  query, results, selectedUser, showDropdown,
  onQueryChange, onSelect, onClear, onFocus, placeholder = 'Search by name or email…',
}: UserSearchInputProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1.5px solid ${selectedUser ? '#C4785C' : '#D6D0CA'}`,
        borderRadius: 9, background: '#fff', padding: '0 10px',
        transition: 'border-color 0.15s',
      }}>
        {selectedUser ? (
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #D4917A, #C4785C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <Search size={14} color="#9B9189" style={{ flexShrink: 0 }} />
        )}
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: '#2D2520', fontFamily: 'inherit', padding: '8px 0',
          }}
        />
        {(query || selectedUser) && (
          <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9189', padding: 2, display: 'flex' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#FDFCFA', border: '1px solid #EBE8E3', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(45,37,32,0.12)', overflow: 'hidden',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#9B9189', textAlign: 'center' }}>
              {query ? 'No users match your search' : 'Start typing to search users'}
            </div>
          ) : results.map(u => (
            <div
              key={u._id || u.uid || u.email}
              onMouseDown={e => { e.preventDefault(); onSelect(u); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', cursor: 'pointer',
                borderBottom: '1px solid #F5F1E8',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FEF9F7'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #D4917A, #C4785C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {u.name && <p style={{ fontSize: 13, fontWeight: 600, color: '#2D2520', margin: 0 }}>{u.name}</p>}
                <p style={{ fontSize: 11, color: '#9B9189', margin: u.name ? '2px 0 0' : 0 }}>{u.email}</p>
              </div>
              {u.role && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: u.role === 'admin' ? '#FEF0EC' : '#F5F1E8',
                  color: u.role === 'admin' ? '#C4785C' : '#6B6158',
                }}>{u.role}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ResubmitPolicyTab: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const token = () => localStorage.getItem('auth_token') || '';
  const authH = { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' };

  const [subTab, setSubTab] = useState<'global' | 'per-survey' | 'per-user'>('global');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // ── Global config state ──
  const [globalCfg, setGlobalCfg] = useState<GlobalConfig>({ mode: 'allow', cooldown_hours: null });
  const [globalEdit, setGlobalEdit] = useState<{ mode: Mode; hours: string }>({ mode: 'allow', hours: '24' });
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalLoaded, setGlobalLoaded] = useState(false);

  // ── Per-survey state ──
  const [surveys, setSurveys] = useState<SurveyOverview[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [policyEdit, setPolicyEdit] = useState<Record<string, { mode: Mode; hours: string }>>({});
  const [policySaving, setPolicySaving] = useState<string | null>(null);
  const [surveyOverrides, setSurveyOverrides] = useState<Record<string, SurveyOverride[]>>({});
  const [ovLoading, setOvLoading] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [subsLoading, setSubsLoading] = useState<string | null>(null);
  const [showSubs, setShowSubs] = useState<Record<string, boolean>>({});
  const [newOv, setNewOv] = useState<Record<string, { email: string; fp: string; mode: Mode; hours: string; note: string }>>({});

  // ── Per-user global rules state ──
  const [userRules, setUserRules] = useState<UserGlobalRule[]>([]);
  const [userRulesLoading, setUserRulesLoading] = useState(false);
  const [newUserRule, setNewUserRule] = useState<{ email: string; mode: Mode; hours: string; note: string }>({ email: '', mode: 'allow', hours: '24', note: '' });
  const [userRuleSaving, setUserRuleSaving] = useState(false);

  // ── User search state ──
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SystemUser[]>([]);
  const [allSystemUsers, setAllSystemUsers] = useState<SystemUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const userSearchRef = useRef<HTMLDivElement>(null);

  // Also for the per-survey override form — same pattern
  const [surveyOvUserSearch, setSurveyOvUserSearch] = useState<Record<string, string>>({});
  const [surveyOvUserResults, setSurveyOvUserResults] = useState<Record<string, SystemUser[]>>({});
  const [showSurveyOvDropdown, setShowSurveyOvDropdown] = useState<Record<string, boolean>>({});
  const [selectedSurveyOvUser, setSelectedSurveyOvUser] = useState<Record<string, SystemUser | null>>({});

  // ── Data loaders ──

  const loadGlobal = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/resubmit/global-config`, { headers: authH });
      const data = await res.json();
      const cfg: GlobalConfig = data.config || { mode: 'allow', cooldown_hours: null };
      setGlobalCfg(cfg);
      setGlobalEdit({ mode: cfg.mode, hours: String(cfg.cooldown_hours || 24) });
      setGlobalLoaded(true);
    } catch { /* silent */ }
  };

  const loadOverview = async () => {
    setSurveysLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/resubmit/overview`, { headers: authH });
      const data = await res.json();
      const list: SurveyOverview[] = data.surveys || [];
      setSurveys(list);
      const edits: typeof policyEdit = {};
      list.forEach(s => {
        edits[s.survey_id] = { mode: s.policy?.mode || 'allow', hours: String(s.policy?.cooldown_hours || 24) };
      });
      setPolicyEdit(edits);
      if (data.global_config && !globalLoaded) {
        const gc = data.global_config;
        setGlobalCfg(gc);
        setGlobalEdit({ mode: gc.mode, hours: String(gc.cooldown_hours || 24) });
        setGlobalLoaded(true);
      }
    } finally {
      setSurveysLoading(false);
    }
  };

  const loadUserRules = async () => {
    setUserRulesLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/resubmit/user-global-rules`, { headers: authH });
      const data = await res.json();
      setUserRules(data.rules || []);
    } finally {
      setUserRulesLoading(false);
    }
  };

  const loadSurveyOverrides = async (sid: string) => {
    setOvLoading(sid);
    try {
      const res = await fetch(`${baseUrl}/api/admin/resubmit/overrides/${sid}`, { headers: authH });
      const data = await res.json();
      setSurveyOverrides(prev => ({ ...prev, [sid]: data.overrides || [] }));
    } finally {
      setOvLoading(null);
    }
  };

  const loadSubmissions = async (sid: string) => {
    setSubsLoading(sid);
    try {
      const res = await fetch(`${baseUrl}/api/admin/resubmit/submissions/${sid}?limit=30`, { headers: authH });
      const data = await res.json();
      setSubmissions(prev => ({ ...prev, [sid]: data.submissions || [] }));
    } finally {
      setSubsLoading(null);
    }
  };

  useEffect(() => {
    if (subTab === 'global') loadGlobal();
    if (subTab === 'per-survey') { loadOverview(); loadSystemUsers(); }
    if (subTab === 'per-user') { loadUserRules(); loadSystemUsers(); }
  }, [subTab]);

  // ── Load all system users (cached) ──
  const loadSystemUsers = async () => {
    if (usersLoaded) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, { headers: authH });
      const data = await res.json();
      setAllSystemUsers(data.users || []);
      setUsersLoaded(true);
    } catch { /* silent */ }
  };

  // ── Fuzzy filter users by name or email ──
  const filterUsers = useCallback((query: string, users: SystemUser[]) => {
    if (!query.trim()) return users.slice(0, 8);
    const q = query.toLowerCase();
    return users
      .filter(u => u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q))
      .slice(0, 8);
  }, []);

  // Search input handler for per-user global rule
  const handleUserSearch = (q: string) => {
    setUserSearchQuery(q);
    setSelectedUser(null);
    setNewUserRule(prev => ({ ...prev, email: q }));
    setUserSearchResults(filterUsers(q, allSystemUsers));
    setShowUserDropdown(true);
    if (!usersLoaded) loadSystemUsers();
  };

  const selectUser = (u: SystemUser) => {
    setSelectedUser(u);
    setUserSearchQuery(u.name ? `${u.name} — ${u.email}` : u.email);
    setNewUserRule(prev => ({ ...prev, email: u.email }));
    setShowUserDropdown(false);
  };

  // Search handler for per-survey override form
  const handleSurveyOvSearch = (sid: string, q: string) => {
    setSurveyOvUserSearch(prev => ({ ...prev, [sid]: q }));
    setSelectedSurveyOvUser(prev => ({ ...prev, [sid]: null }));
    setNewOv(prev => ({ ...prev, [sid]: { ...prev[sid], email: q } }));
    setSurveyOvUserResults(prev => ({ ...prev, [sid]: filterUsers(q, allSystemUsers) }));
    setShowSurveyOvDropdown(prev => ({ ...prev, [sid]: true }));
    if (!usersLoaded) loadSystemUsers();
  };

  const selectSurveyOvUser = (sid: string, u: SystemUser) => {
    setSelectedSurveyOvUser(prev => ({ ...prev, [sid]: u }));
    setSurveyOvUserSearch(prev => ({ ...prev, [sid]: u.name ? `${u.name} — ${u.email}` : u.email }));
    setNewOv(prev => ({ ...prev, [sid]: { ...prev[sid], email: u.email } }));
    setShowSurveyOvDropdown(prev => ({ ...prev, [sid]: false }));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Global save ──

  const saveGlobal = async () => {
    setGlobalSaving(true);
    try {
      const body: any = { mode: globalEdit.mode };
      if (globalEdit.mode === 'cooldown') body.cooldown_hours = parseFloat(globalEdit.hours) || 24;
      const res = await fetch(`${baseUrl}/api/admin/resubmit/global-config`, {
        method: 'PUT', headers: authH, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { setGlobalCfg(data.config); flash('ok', 'Global policy saved'); }
      else flash('err', data.error || 'Failed');
    } finally { setGlobalSaving(false); }
  };

  // ── Survey policy save/delete ──

  const saveSurveyPolicy = async (sid: string) => {
    const ed = policyEdit[sid];
    if (!ed) return;
    setPolicySaving(sid);
    try {
      const body: any = { mode: ed.mode };
      if (ed.mode === 'cooldown') body.cooldown_hours = parseFloat(ed.hours) || 24;
      const res = await fetch(`${baseUrl}/api/admin/resubmit/policies/${sid}`, {
        method: 'PUT', headers: authH, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        flash('ok', 'Survey policy saved');
        setSurveys(prev => prev.map(s => s.survey_id === sid ? { ...s, policy: data.policy } : s));
      } else flash('err', data.error || 'Failed');
    } finally { setPolicySaving(null); }
  };

  const deleteSurveyPolicy = async (sid: string) => {
    if (!confirm('Remove this survey\'s policy? It will fall back to the global default.')) return;
    const res = await fetch(`${baseUrl}/api/admin/resubmit/policies/${sid}`, { method: 'DELETE', headers: authH });
    if (res.ok) {
      flash('ok', 'Policy removed — using global default now');
      setSurveys(prev => prev.map(s => s.survey_id === sid ? { ...s, policy: null } : s));
      setPolicyEdit(prev => ({ ...prev, [sid]: { mode: 'allow', hours: '24' } }));
    }
  };

  // ── Survey-level user override save/delete ──

  const saveSurveyOverride = async (sid: string) => {
    const form = newOv[sid];
    if (!form?.email && !form?.fp) { flash('err', 'Email or fingerprint required'); return; }
    const body: any = { email: form.email || undefined, fingerprint_hash: form.fp || undefined, mode: form.mode, note: form.note };
    if (form.mode === 'cooldown') body.cooldown_hours = parseFloat(form.hours) || 24;
    const res = await fetch(`${baseUrl}/api/admin/resubmit/overrides/${sid}`, { method: 'POST', headers: authH, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      flash('ok', 'Override saved');
      setNewOv(prev => ({ ...prev, [sid]: { email: '', fp: '', mode: 'allow', hours: '24', note: '' } }));
      loadSurveyOverrides(sid);
    } else flash('err', data.error || 'Failed');
  };

  const deleteSurveyOverride = async (sid: string, oid: string) => {
    const res = await fetch(`${baseUrl}/api/admin/resubmit/overrides/${sid}/${oid}`, { method: 'DELETE', headers: authH });
    if (res.ok) { flash('ok', 'Override removed'); loadSurveyOverrides(sid); }
  };

  // ── User global rules save/delete ──

  const saveUserRule = async () => {
    if (!newUserRule.email) { flash('err', 'Email is required'); return; }
    setUserRuleSaving(true);
    try {
      const body: any = { email: newUserRule.email, mode: newUserRule.mode, note: newUserRule.note };
      if (newUserRule.mode === 'cooldown') body.cooldown_hours = parseFloat(newUserRule.hours) || 24;
      const res = await fetch(`${baseUrl}/api/admin/resubmit/user-global-rules`, { method: 'POST', headers: authH, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        flash('ok', 'User rule saved');
        setNewUserRule({ email: '', mode: 'allow', hours: '24', note: '' });
        loadUserRules();
      } else flash('err', data.error || 'Failed');
    } finally { setUserRuleSaving(false); }
  };

  const deleteUserRule = async (rid: string) => {
    const res = await fetch(`${baseUrl}/api/admin/resubmit/user-global-rules/${rid}`, { method: 'DELETE', headers: authH });
    if (res.ok) { flash('ok', 'Rule removed'); loadUserRules(); }
  };

  // ── Survey expand ──

  const toggleSurvey = (sid: string) => {
    if (expandedSurvey === sid) { setExpandedSurvey(null); return; }
    setExpandedSurvey(sid);
    loadSurveyOverrides(sid);
    if (!newOv[sid]) setNewOv(prev => ({ ...prev, [sid]: { email: '', fp: '', mode: 'allow', hours: '24', note: '' } }));
  };

  const fillFromSub = (sid: string, sub: Submission) => {
    setNewOv(prev => ({ ...prev, [sid]: { ...prev[sid], email: sub.user_info?.email || '', fp: sub.device_fingerprint || '' } }));
    setShowSubs(prev => ({ ...prev, [sid]: false }));
    flash('ok', 'Pre-filled — set mode and save');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const subTabs: { id: typeof subTab; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: 'global', icon: <Globe size={14} />, label: 'Global Default', desc: 'Platform-wide fallback for all surveys' },
    { id: 'per-survey', icon: <FileText size={14} />, label: 'Per Survey', desc: 'Override policy for individual surveys' },
    { id: 'per-user', icon: <User size={14} />, label: 'Per User', desc: 'Override for a user across all their surveys' },
  ];

  return (
    <div style={{ padding: '20px 24px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2D2520', margin: 0 }}>Resubmit Policy Control</h3>
        <p style={{ fontSize: 12, color: '#9B9189', marginTop: 3 }}>
          Three levels of control — global default, per-survey, and per-user. Higher levels override lower ones.
        </p>
      </div>

      {/* Priority legend */}
      <div style={{ background: '#FEF9F5', border: '1px solid #F0DDD4', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Info size={14} style={{ color: '#C4785C', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#6B6158', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: '#2D2520' }}>Priority order (highest wins):</strong>{' '}
          <span style={{ color: '#C4785C', fontWeight: 600 }}>Per-User Rule</span>
          {' → '}
          <span style={{ color: '#7C6F5A', fontWeight: 600 }}>Per-Survey User Override</span>
          {' → '}
          <span style={{ color: '#7C6F5A', fontWeight: 600 }}>Per-Survey Policy</span>
          {' → '}
          <span style={{ color: '#9B9189', fontWeight: 600 }}>Global Default</span>
          . For cooldowns, the shorter time always wins.
        </p>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{
          marginBottom: 14, padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500,
          background: msg.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          color: msg.type === 'ok' ? '#059669' : '#DC2626',
          border: `1px solid ${msg.type === 'ok' ? '#A7F3D0' : '#FECACA'}`,
        }}>{msg.text}</div>
      )}

      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {subTabs.map(t => {
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
              borderRadius: 10, border: `1.5px solid ${active ? '#C4785C' : '#EBE8E3'}`,
              background: active ? '#FEF0EC' : '#FDFCFA', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: active ? 700 : 500,
              color: active ? '#C4785C' : '#6B6158', transition: 'all 0.13s',
            }}>
              {t.icon}
              <div style={{ textAlign: 'left' }}>
                <div>{t.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, color: active ? '#C4A99A' : '#9B9189' }}>{t.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — GLOBAL DEFAULT
      ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'global' && (
        <div style={S.sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Globe size={15} color="#C4785C" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2D2520', margin: 0 }}>Global Default Policy</p>
              <p style={{ fontSize: 11, color: '#9B9189', marginTop: 2 }}>
                Applies to every survey that has no individual policy set.
                If set to <strong>Block Forever</strong>, users can never fill any survey a second time unless a survey or user override says otherwise.
                If set to <strong>Cooldown</strong>, users must wait before refilling.
              </p>
            </div>
          </div>

          <ModeForm
            mode={globalEdit.mode}
            hours={globalEdit.hours}
            onModeChange={m => setGlobalEdit(prev => ({ ...prev, mode: m }))}
            onHoursChange={h => setGlobalEdit(prev => ({ ...prev, hours: h }))}
          />

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveGlobal} disabled={globalSaving} style={btn(true)}>
              <Save size={13} />{globalSaving ? 'Saving…' : 'Save Global Policy'}
            </button>
            <span className={modeBadgeCls(globalCfg.mode)}>
              <ModeIcon mode={globalCfg.mode} />
              Current: {modeLabel(globalCfg.mode, globalCfg.cooldown_hours)}
            </span>
          </div>

          {globalCfg.updated_at && (
            <p style={{ fontSize: 11, color: '#9B9189', marginTop: 10 }}>
              Last updated {fmt(globalCfg.updated_at)} by {globalCfg.updated_by}
            </p>
          )}

          {/* Explanation box */}
          <div style={{ marginTop: 18, padding: '12px 14px', background: '#FFF8F5', borderRadius: 8, border: '1px solid #F0DDD4' }}>
            <p style={{ fontSize: 12, color: '#6B6158', margin: 0, lineHeight: 1.7 }}>
              <strong>How global + survey-level interact:</strong><br />
              • If global is <em>Cooldown 48h</em> and a survey has <em>Cooldown 12h</em> → the survey's <strong>12h wins</strong> (shorter time).<br />
              • If global is <em>Block Forever</em> and a survey has <em>Cooldown 24h</em> → global's <strong>Block Forever wins</strong> (stricter).<br />
              • If a survey is set to <em>Allow</em> → that survey is fully unlocked regardless of global.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — PER SURVEY
      ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'per-survey' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={loadOverview} style={btn()}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {surveysLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9B9189', fontSize: 13 }}>Loading surveys…</div>
          ) : surveys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9B9189', fontSize: 13 }}>No surveys found</div>
          ) : surveys.map(sv => {
            const isOpen = expandedSurvey === sv.survey_id;
            const ed = policyEdit[sv.survey_id] || { mode: 'allow' as Mode, hours: '24' };
            const ovs = surveyOverrides[sv.survey_id] || [];
            const subs = submissions[sv.survey_id] || [];
            const nof = newOv[sv.survey_id] || { email: '', fp: '', mode: 'allow' as Mode, hours: '24', note: '' };

            return (
              <div key={sv.survey_id} style={S.card}>
                {/* Survey row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleSurvey(sv.survey_id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#2D2520', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sv.survey_title}</p>
                      <p style={{ fontSize: 11, color: '#9B9189', marginTop: 2 }}>ID: {sv.survey_id}</p>
                    </div>
                    <span className={modeBadgeCls(sv.policy?.mode || 'allow')}>
                      <ModeIcon mode={sv.policy?.mode || 'allow'} />
                      {sv.policy ? modeLabel(sv.policy.mode, sv.policy.cooldown_hours) : 'Uses Global Default'}
                    </span>
                  </div>
                  <span style={{ color: '#9B9189', marginLeft: 12 }}>{isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 18, borderTop: '1px solid #F0EDE8', paddingTop: 18 }}>

                    {/* Survey Policy */}
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#2D2520', marginBottom: 10 }}>Survey-Level Policy</p>
                    <p style={{ fontSize: 11, color: '#9B9189', marginBottom: 12 }}>
                      Leave unset to use the global default. Setting <em>Allow</em> here will unlock this survey even if global is Block Forever.
                      Setting a shorter cooldown than global will use this survey's shorter time.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                      <ModeForm
                        mode={ed.mode} hours={ed.hours}
                        onModeChange={m => setPolicyEdit(prev => ({ ...prev, [sv.survey_id]: { ...ed, mode: m } }))}
                        onHoursChange={h => setPolicyEdit(prev => ({ ...prev, [sv.survey_id]: { ...ed, hours: h } }))}
                      />
                      <button onClick={() => saveSurveyPolicy(sv.survey_id)} disabled={policySaving === sv.survey_id} style={btn(true)}>
                        <Save size={12} />{policySaving === sv.survey_id ? 'Saving…' : 'Save'}
                      </button>
                      {sv.policy && (
                        <button onClick={() => deleteSurveyPolicy(sv.survey_id)} style={btn(false, true)}>
                          <Trash2 size={12} /> Remove (use global)
                        </button>
                      )}
                    </div>
                    {sv.policy && <p style={{ fontSize: 11, color: '#9B9189', marginTop: 6 }}>Updated {fmt(sv.policy.updated_at)} by {sv.policy.updated_by}</p>}

                    {/* Per-user overrides for this survey */}
                    <div style={{ marginTop: 20, borderTop: '1px solid #F0EDE8', paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#2D2520', margin: 0 }}>
                          Per-User Overrides for this Survey ({ovLoading === sv.survey_id ? '…' : ovs.length})
                        </p>
                        <button onClick={() => { const s = !showSubs[sv.survey_id]; setShowSubs(prev => ({ ...prev, [sv.survey_id]: s })); if (s && !subs.length) loadSubmissions(sv.survey_id); }} style={btn()}>
                          Pick from submissions
                        </button>
                      </div>

                      {showSubs[sv.survey_id] && (
                        <div style={{ marginBottom: 12, background: '#F5F1E8', borderRadius: 9, padding: '10px 14px', maxHeight: 200, overflowY: 'auto' }}>
                          <p style={{ fontSize: 11, color: '#6B6158', fontWeight: 600, marginBottom: 6 }}>
                            {subsLoading === sv.survey_id ? 'Loading…' : `${subs.length} recent — click to pre-fill`}
                          </p>
                          {subs.map(sub => (
                            <div key={sub._id} onClick={() => fillFromSub(sv.survey_id, sub)}
                              style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: 7, fontSize: 12, color: '#2D2520', marginBottom: 4, background: '#FDFCFA', border: '1px solid #EBE8E3', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{sub.user_info?.email || sub.user_info?.username || 'Anonymous'} · {sub.user_info?.ip_address}</span>
                              <span style={{ fontSize: 10, color: '#9B9189' }}>{fmt(sub.submitted_at)}</span>
                            </div>
                          ))}
                          {!subsLoading && subs.length === 0 && <p style={{ fontSize: 12, color: '#9B9189' }}>No submissions yet</p>}
                        </div>
                      )}

                      {ovs.map(ov => (
                        <div key={ov._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F5F1E8', borderRadius: 8, marginBottom: 6, gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#2D2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ov.email || (ov.fingerprint_hash ? ov.fingerprint_hash.slice(0, 16) + '…' : 'Unknown')}
                            </p>
                            {ov.note && <p style={{ fontSize: 11, color: '#9B9189', margin: '2px 0 0' }}>{ov.note}</p>}
                          </div>
                          <span className={modeBadgeCls(ov.mode)}><ModeIcon mode={ov.mode} />{modeLabel(ov.mode, ov.cooldown_hours)}</span>
                          <button onClick={() => deleteSurveyOverride(sv.survey_id, ov._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 4 }}><Trash2 size={13} /></button>
                        </div>
                      ))}

                      <div style={{ background: '#F5F1E8', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B6158', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Override for this Survey</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <span style={S.label}>Search User</span>
                            <UserSearchInput
                              query={surveyOvUserSearch[sv.survey_id] || ''}
                              results={surveyOvUserResults[sv.survey_id] || []}
                              selectedUser={selectedSurveyOvUser[sv.survey_id] || null}
                              showDropdown={showSurveyOvDropdown[sv.survey_id] || false}
                              onQueryChange={q => handleSurveyOvSearch(sv.survey_id, q)}
                              onFocus={() => {
                                const q = surveyOvUserSearch[sv.survey_id] || '';
                                setSurveyOvUserResults(prev => ({ ...prev, [sv.survey_id]: filterUsers(q, allSystemUsers) }));
                                setShowSurveyOvDropdown(prev => ({ ...prev, [sv.survey_id]: true }));
                                if (!usersLoaded) loadSystemUsers();
                              }}
                              onSelect={u => selectSurveyOvUser(sv.survey_id, u)}
                              onClear={() => {
                                setSurveyOvUserSearch(prev => ({ ...prev, [sv.survey_id]: '' }));
                                setSelectedSurveyOvUser(prev => ({ ...prev, [sv.survey_id]: null }));
                                setNewOv(prev => ({ ...prev, [sv.survey_id]: { ...prev[sv.survey_id], email: '' } }));
                                setShowSurveyOvDropdown(prev => ({ ...prev, [sv.survey_id]: false }));
                              }}
                            />
                            {selectedSurveyOvUser[sv.survey_id] && (
                              <p style={{ fontSize: 11, color: '#C4785C', marginTop: 4 }}>
                                ✓ {selectedSurveyOvUser[sv.survey_id]?.email}
                              </p>
                            )}
                          </div>
                          <div>
                            <span style={S.label}>Fingerprint Hash (optional)</span>
                            <input type="text" placeholder="sha256 hash" value={nof.fp}
                              onChange={e => setNewOv(prev => ({ ...prev, [sv.survey_id]: { ...nof, fp: e.target.value } }))}
                              style={S.input} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <ModeForm mode={nof.mode} hours={nof.hours}
                            onModeChange={m => setNewOv(prev => ({ ...prev, [sv.survey_id]: { ...nof, mode: m } }))}
                            onHoursChange={h => setNewOv(prev => ({ ...prev, [sv.survey_id]: { ...nof, hours: h } }))}
                          />
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <span style={S.label}>Note</span>
                            <input type="text" placeholder="Admin note…" value={nof.note}
                              onChange={e => setNewOv(prev => ({ ...prev, [sv.survey_id]: { ...nof, note: e.target.value } }))}
                              style={S.input} />
                          </div>
                          <button onClick={() => saveSurveyOverride(sv.survey_id)} style={btn(true)}>
                            <Plus size={13} /> Save Override
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3 — PER USER (global unlock / block for a user)
      ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'per-user' && (
        <div>
          {/* Explanation */}
          <div style={{ ...S.sectionBox, background: '#FEF9F5', border: '1px solid #F0DDD4' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Info size={14} style={{ color: '#C4785C', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: '#6B6158', lineHeight: 1.7 }}>
                <strong style={{ color: '#2D2520' }}>Per-User Global Rule</strong> — this is the highest-priority setting.<br />
                • Set <strong>Allow</strong> → this user can always refill <em>any</em> survey, no matter what global or survey policies say. Use this to fully unlock a trusted user.<br />
                • Set <strong>Cooldown</strong> → this user must wait N hours between fills on <em>every</em> survey.<br />
                • Set <strong>Block Forever</strong> → this user can never fill any survey again.<br />
                <em>Note: you can still set per-survey overrides for finer control — they are checked first within the user context.</em>
              </div>
            </div>
          </div>

          {/* Add new user rule */}
          <div style={{ ...S.sectionBox }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#2D2520', margin: '0 0 12px' }}>Add / Update User Global Rule</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div ref={userSearchRef}>
                <span style={S.label}>Search User</span>
                <UserSearchInput
                  query={userSearchQuery}
                  results={userSearchResults}
                  selectedUser={selectedUser}
                  showDropdown={showUserDropdown}
                  onQueryChange={handleUserSearch}
                  onFocus={() => {
                    setUserSearchResults(filterUsers(userSearchQuery, allSystemUsers));
                    setShowUserDropdown(true);
                    if (!usersLoaded) loadSystemUsers();
                  }}
                  onSelect={selectUser}
                  onClear={() => {
                    setUserSearchQuery('');
                    setSelectedUser(null);
                    setNewUserRule(prev => ({ ...prev, email: '' }));
                    setShowUserDropdown(false);
                  }}
                />
                {selectedUser && (
                  <p style={{ fontSize: 11, color: '#C4785C', marginTop: 4 }}>
                    ✓ {selectedUser.email}
                  </p>
                )}
              </div>
              <div>
                <span style={S.label}>Note (optional)</span>
                <input type="text" placeholder="Reason for this rule…"
                  value={newUserRule.note}
                  onChange={e => setNewUserRule(prev => ({ ...prev, note: e.target.value }))}
                  style={S.input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <ModeForm
                mode={newUserRule.mode} hours={newUserRule.hours}
                onModeChange={m => setNewUserRule(prev => ({ ...prev, mode: m }))}
                onHoursChange={h => setNewUserRule(prev => ({ ...prev, hours: h }))}
              />
              <button onClick={saveUserRule} disabled={userRuleSaving} style={btn(true)}>
                <Save size={13} />{userRuleSaving ? 'Saving…' : 'Save Rule'}
              </button>
            </div>
          </div>

          {/* Existing rules list */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2D2520', margin: 0 }}>
                Active User Rules ({userRulesLoading ? '…' : userRules.length})
              </p>
              <button onClick={loadUserRules} style={btn()}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {userRulesLoading ? (
              <p style={{ textAlign: 'center', color: '#9B9189', fontSize: 13, padding: '30px 0' }}>Loading…</p>
            ) : userRules.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', padding: '30px', color: '#9B9189', fontSize: 13 }}>
                No user rules set — all users follow global or survey policies.
              </div>
            ) : userRules.map(rule => (
              <div key={rule._id} style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #D4917A, #C4785C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{rule.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#2D2520', margin: 0 }}>{rule.email}</p>
                        {rule.note && <p style={{ fontSize: 11, color: '#9B9189', margin: '2px 0 0' }}>{rule.note}</p>}
                        <p style={{ fontSize: 10, color: '#C4A99A', margin: '2px 0 0' }}>Set {fmt(rule.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={modeBadgeCls(rule.mode)}>
                      <ModeIcon mode={rule.mode} />
                      {modeLabel(rule.mode, rule.cooldown_hours)}
                    </span>
                    <button onClick={() => deleteUserRule(rule._id)} style={btn(false, true)}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default ResubmitPolicyTab;
