/**
 * Admin Tracking Tab - User-centric tracking dashboard
 * Shows a list of users â†’ click on a user â†’ see all their activity in detail
 * Color-coded sections for each tracking type
 */
import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  LogIn, Eye, CreditCard, Globe, MousePointerClick, Crown, Activity,
  ChevronDown, ChevronUp, Calendar, Users, TrendingUp, MapPin,
  ArrowLeft, User, Clock, Zap, Search
} from 'lucide-react';

const baseUrl = getApiBaseUrl();

/** Format a date string to IST (Indian Standard Time) */
function formatIST(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    // Backend sends UTC datetimes but sometimes without timezone suffix
    // Ensure the string is treated as UTC before converting to IST
    let utcStr = dateStr;
    if (!utcStr.endsWith('Z') && !utcStr.includes('+') && !utcStr.includes('-', 10)) {
      utcStr = utcStr + 'Z'; // Mark as UTC
    }
    return new Date(utcStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  } catch {
    return dateStr;
  }
}

const TIME_FILTERS = [
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '15d', days: 15 }
];

// ==================== Types ====================
interface TrackedUser {
  user_email: string;
  user_id: string;
  user_name: string;
  page_visits: number;
  unique_pages: number;
  login_count: number;
  button_clicks: number;
  sessions: number;
  pricing_clicks: number;
  premium_attempts: number;
  last_seen: string;
}

interface OverviewData {
  login_events: { total: number; last_24h: number; last_7d: number };
  page_visits: { total: number; last_24h: number; last_7d: number };
  pricing_clicks: { total: number; last_24h: number; last_7d: number };
  sessions: { total: number; last_24h: number; last_7d: number };
  button_clicks: { total: number; last_24h: number; last_7d: number };
  premium_attempts: { total: number; last_24h: number; last_7d: number };
  unique_locations: number;
}

interface UserDetail {
  user_email: string;
  page_visits: any[];
  page_summary: any[];
  login_events: any[];
  button_clicks: any[];
  pricing_clicks: any[];
  sessions: any[];
  geolocations: any[];
  premium_attempts: any[];
}

// ==================== Overview Cards ====================
function OverviewCards({ data }: { data: OverviewData | null }) {
  if (!data) return null;

  const cards = [
    { label: 'Logins', value: data.login_events.total, today: data.login_events.last_24h, color: 'from-purple-500 to-purple-700', icon: LogIn },
    { label: 'Page Visits', value: data.page_visits.total, today: data.page_visits.last_24h, color: 'from-blue-500 to-blue-700', icon: Eye },
    { label: 'Pricing Clicks', value: data.pricing_clicks.total, today: data.pricing_clicks.last_24h, color: 'from-orange-500 to-orange-700', icon: CreditCard },
    { label: 'Sessions', value: data.sessions.total, today: data.sessions.last_24h, color: 'from-green-500 to-green-700', icon: Activity },
    { label: 'Button Clicks', value: data.button_clicks.total, today: data.button_clicks.last_24h, color: 'from-red-500 to-red-700', icon: MousePointerClick },
    { label: 'Premium Tries', value: data.premium_attempts.total, today: data.premium_attempts.last_24h, color: 'from-amber-500 to-amber-700', icon: Crown },
    { label: 'Locations', value: data.unique_locations, today: null, color: 'from-teal-500 to-teal-700', icon: MapPin },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl p-3 text-white shadow-lg`}>
          <div className="flex items-center gap-1.5 mb-1">
            <card.icon size={14} className="opacity-80" />
            <span className="text-[10px] opacity-80">{card.label}</span>
          </div>
          <div className="text-xl font-bold">{card.value.toLocaleString()}</div>
          {card.today !== null && (
            <div className="text-[10px] opacity-70 mt-0.5">+{card.today} today</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== User List View ====================
function UserListView({ users, onSelectUser, searchQuery, setSearchQuery }: {
  users: TrackedUser[];
  onSelectUser: (email: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const filtered = users.filter(u =>
    u.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search users by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      {/* User Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <th className="text-left p-3 font-semibold text-gray-700">User</th>
              <th className="text-center p-3 font-semibold text-purple-700">
                <div className="flex items-center justify-center gap-1"><LogIn size={12} /> Logins</div>
              </th>
              <th className="text-center p-3 font-semibold text-blue-700">
                <div className="flex items-center justify-center gap-1"><Eye size={12} /> Pages</div>
              </th>
              <th className="text-center p-3 font-semibold text-green-700">
                <div className="flex items-center justify-center gap-1"><Activity size={12} /> Sessions</div>
              </th>
              <th className="text-center p-3 font-semibold text-red-700">
                <div className="flex items-center justify-center gap-1"><MousePointerClick size={12} /> Clicks</div>
              </th>
              <th className="text-center p-3 font-semibold text-orange-700">
                <div className="flex items-center justify-center gap-1"><CreditCard size={12} /> Pricing</div>
              </th>
              <th className="text-center p-3 font-semibold text-amber-700">
                <div className="flex items-center justify-center gap-1"><Crown size={12} /> Premium</div>
              </th>
              <th className="text-left p-3 font-semibold text-gray-600">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">No tracked users found</td></tr>
            ) : (
              filtered.map((user, idx) => (
                <tr
                  key={user.user_email}
                  onClick={() => onSelectUser(user.user_email)}
                  className={`cursor-pointer transition-all hover:bg-indigo-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {(user.user_name || user.user_email)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-xs">{user.user_name || '-'}</div>
                        <div className="text-[11px] text-gray-500">{user.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.login_count}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.page_visits}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({user.unique_pages} unique)</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.sessions}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.button_clicks}</span>
                  </td>
                  <td className="p-3 text-center">
                    {user.pricing_clicks > 0 ? (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.pricing_clicks}</span>
                    ) : <span className="text-gray-300">â€”</span>}
                  </td>
                  <td className="p-3 text-center">
                    {user.premium_attempts > 0 ? (
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.premium_attempts}</span>
                    ) : <span className="text-gray-300">â€”</span>}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {user.last_seen ? formatIST(user.last_seen) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Collapsible Section ====================
function Section({ title, icon: Icon, color, children, count, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-xl mb-3 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-3 bg-gradient-to-r ${color} text-white font-semibold text-sm text-left`}
      >
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <span>{title}</span>
          {count !== undefined && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{count}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

// ==================== User Detail View ====================
function UserDetailView({ userEmail, onBack, days }: { userEmail: string; onBack: () => void; days: number }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${baseUrl}/api/tracking/admin/user-detail?email=${encodeURIComponent(userEmail)}&days=${days}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDetail(await res.json());
      } catch (err) {
        console.error('Failed to load user detail:', err);
      }
      setLoading(false);
    };
    fetchDetail();
  }, [userEmail, days]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading user activity...</div>;
  if (!detail) return <div className="text-center py-12 text-red-400">Failed to load user data</div>;

  return (
    <div>
      {/* Back button + user header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {userEmail[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-gray-800">{userEmail}</div>
            <div className="text-xs text-gray-500">Activity for last {days} days</div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-purple-700">{detail.login_events.length}</div>
          <div className="text-[10px] text-purple-600">Logins</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-700">{detail.page_visits.length}</div>
          <div className="text-[10px] text-blue-600">Page Visits</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-700">{detail.sessions.length}</div>
          <div className="text-[10px] text-green-600">Sessions</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-700">{detail.button_clicks.length}</div>
          <div className="text-[10px] text-red-600">Button Clicks</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-orange-700">{detail.pricing_clicks.length}</div>
          <div className="text-[10px] text-orange-600">Pricing Clicks</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-amber-700">{detail.premium_attempts.length}</div>
          <div className="text-[10px] text-amber-600">Premium Tries</div>
        </div>
      </div>

      {/* Page visits section */}
      <Section title="Pages Visited" icon={Eye} color="from-blue-500 to-blue-700" count={detail.page_visits.length} defaultOpen>
        {/* Summary by page */}
        {detail.page_summary.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Visit Count Per Page</h4>
            <div className="space-y-1.5">
              {detail.page_summary.map((ps: any, idx: number) => {
                const max = detail.page_summary[0]?.count || 1;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-32 text-xs text-gray-600 truncate" title={ps._id}>{ps._id}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(ps.count / max) * 100}%` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-gray-700">{ps.count} visits</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent visits timeline */}
        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Recent Visits</h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {detail.page_visits.slice(0, 50).map((v: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-gray-50 text-xs">
              <span className="text-gray-400 w-36">{v.created_at ? formatIST(v.created_at) : '-'}</span>
              <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{v.page}</span>
              {v.geo?.city && v.geo.city !== 'Local' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.geo.source === 'gps' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{v.geo.city}, {v.geo.country}</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Login events */}
      <Section title="Login History" icon={LogIn} color="from-purple-500 to-purple-700" count={detail.login_events.length}>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-purple-50">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Method</th>
              <th className="text-left p-2">IP</th>
              <th className="text-left p-2">Device</th>
            </tr></thead>
            <tbody>
              {detail.login_events.map((e: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{e.created_at ? formatIST(e.created_at) : '-'}</td>
                  <td className="p-2"><span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{e.login_method || 'email'}</span></td>
                  <td className="p-2 text-gray-500">{e.ip_address || '-'}</td>
                  <td className="p-2 text-gray-500">{e.device_info?.device || e.device_info?.browser || '-'}</td>
                </tr>
              ))}
              {detail.login_events.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No login events</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Button clicks */}
      <Section title="Button Clicks" icon={MousePointerClick} color="from-red-500 to-red-700" count={detail.button_clicks.length}>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-red-50">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Button</th>
              <th className="text-left p-2">Page</th>
            </tr></thead>
            <tbody>
              {detail.button_clicks.map((b: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{b.created_at ? formatIST(b.created_at) : '-'}</td>
                  <td className="p-2"><span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{b.button_text || b.button_id}</span></td>
                  <td className="p-2 text-gray-500">{b.page || '-'}</td>
                </tr>
              ))}
              {detail.button_clicks.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400">No button clicks</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Sessions */}
      <Section title="Sessions" icon={Activity} color="from-green-500 to-green-700" count={detail.sessions.length}>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-green-50">
              <th className="text-left p-2">Started</th>
              <th className="text-left p-2">IP</th>
              <th className="text-left p-2">Location</th>
              <th className="text-left p-2">Device</th>
            </tr></thead>
            <tbody>
              {detail.sessions.map((s: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{s.created_at ? formatIST(s.created_at) : '-'}</td>
                  <td className="p-2 text-gray-500">{s.ip_address || '-'}</td>
                  <td className="p-2">{s.geo?.city && s.geo.city !== 'Local' ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.geo.source === 'gps' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{s.geo.city}, {s.geo.country}</span> : '-'}</td>
                  <td className="p-2 text-gray-500">{s.device_info?.device || '-'} / {s.device_info?.browser || '-'}</td>
                </tr>
              ))}
              {detail.sessions.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No sessions</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Geolocation */}
      <Section title="Locations" icon={Globe} color="from-teal-500 to-teal-700" count={detail.geolocations.length}>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-teal-50">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">City</th>
              <th className="text-left p-2">Country</th>
              <th className="text-left p-2">IP</th>
              <th className="text-left p-2">Coords</th>
            </tr></thead>
            <tbody>
              {detail.geolocations.map((g: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{g.created_at ? formatIST(g.created_at) : '-'}</td>
                  <td className="p-2">
                    {g.source === 'gps' ? (
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">GPS</span>
                    ) : (
                      <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">IP</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${g.source === 'gps' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{g.city || '-'}</span>
                  </td>
                  <td className="p-2 text-gray-500">{g.country || '-'}</td>
                  <td className="p-2 text-gray-400">{g.ip_address || '-'}</td>
                  <td className="p-2 text-gray-400">{g.latitude?.toFixed(4)}, {g.longitude?.toFixed(4)}</td>
                </tr>
              ))}
              {detail.geolocations.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No location data</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Pricing clicks */}
      <Section title="Pricing Page Clicks" icon={CreditCard} color="from-orange-500 to-orange-700" count={detail.pricing_clicks.length}>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-orange-50">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Button</th>
            </tr></thead>
            <tbody>
              {detail.pricing_clicks.map((p: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{p.created_at ? formatIST(p.created_at) : '-'}</td>
                  <td className="p-2"><span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{p.source}</span></td>
                  <td className="p-2 text-gray-600">{p.plan_clicked || '-'}</td>
                  <td className="p-2 text-gray-500">{p.button_text || '-'}</td>
                </tr>
              ))}
              {detail.pricing_clicks.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No pricing clicks</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Premium attempts */}
      <Section title="Premium Feature Attempts" icon={Crown} color="from-amber-500 to-amber-700" count={detail.premium_attempts.length}>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-amber-50">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Feature</th>
              <th className="text-left p-2">Page</th>
            </tr></thead>
            <tbody>
              {detail.premium_attempts.map((a: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{a.created_at ? formatIST(a.created_at) : '-'}</td>
                  <td className="p-2"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{a.feature_name}</span></td>
                  <td className="p-2 text-gray-500">{a.page || '-'}</td>
                </tr>
              ))}
              {detail.premium_attempts.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400">No premium attempts</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Cookie Preferences */}
      <Section title="Cookie Preferences" icon={Globe} color="from-indigo-500 to-indigo-700" count={detail.cookie_preference ? 1 : 0}>
        {detail.cookie_preference ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
              <div className="text-xs font-medium text-green-800 mb-1">Essential</div>
              <div className="text-lg font-bold text-green-700">ON</div>
              <div className="text-[10px] text-green-600">Always on</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${detail.cookie_preference.preferences?.functional ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs font-medium mb-1 ${detail.cookie_preference.preferences?.functional ? 'text-blue-800' : 'text-gray-600'}`}>Functional</div>
              <div className={`text-lg font-bold ${detail.cookie_preference.preferences?.functional ? 'text-blue-700' : 'text-gray-400'}`}>{detail.cookie_preference.preferences?.functional ? 'ON' : 'OFF'}</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${detail.cookie_preference.preferences?.analytics ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs font-medium mb-1 ${detail.cookie_preference.preferences?.analytics ? 'text-purple-800' : 'text-gray-600'}`}>Analytics</div>
              <div className={`text-lg font-bold ${detail.cookie_preference.preferences?.analytics ? 'text-purple-700' : 'text-gray-400'}`}>{detail.cookie_preference.preferences?.analytics ? 'ON' : 'OFF'}</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${detail.cookie_preference.preferences?.marketing ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xs font-medium mb-1 ${detail.cookie_preference.preferences?.marketing ? 'text-orange-800' : 'text-gray-600'}`}>Marketing</div>
              <div className={`text-lg font-bold ${detail.cookie_preference.preferences?.marketing ? 'text-orange-700' : 'text-gray-400'}`}>{detail.cookie_preference.preferences?.marketing ? 'ON' : 'OFF'}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No cookie preference saved yet</p>
        )}
      </Section>
    </div>
  );
}

// ==================== Main Tracking Tab ====================
const TrackingTab: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [users, setUsers] = useState<TrackedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch overview
  useEffect(() => {
    const fetchOverview = async () => {
      setLoadingOverview(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${baseUrl}/api/tracking/admin/overview`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOverview(data.overview);
        }
      } catch {}
      setLoadingOverview(false);
    };
    fetchOverview();
  }, []);

  // Fetch user list
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${baseUrl}/api/tracking/admin/users-list?days=${selectedDays}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch {}
      setLoadingUsers(false);
    };
    fetchUsers();
  }, [selectedDays]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity size={22} className="text-indigo-600" />
            User Tracking
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Click on any user to see their full activity â€¢ Data auto-deletes after 15 days</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Range:</span>
          {TIME_FILTERS.map((f) => (
            <button
              key={f.days}
              onClick={() => { setSelectedDays(f.days); setSelectedUser(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDays === f.days
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {!loadingOverview && <OverviewCards data={overview} />}

      {/* User list or User detail */}
      {selectedUser ? (
        <UserDetailView
          userEmail={selectedUser}
          onBack={() => setSelectedUser(null)}
          days={selectedDays}
        />
      ) : (
        loadingUsers ? (
          <div className="text-center py-12 text-gray-400">Loading users...</div>
        ) : (
          <UserListView
            users={users}
            onSelectUser={(email) => setSelectedUser(email)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )
      )}
    </div>
  );
};

export default TrackingTab;
