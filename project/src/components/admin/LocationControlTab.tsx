/**
 * LocationControlTab
 * Admin panel section for controlling all location-related features.
 *
 * Hierarchy enforced here:
 *   Global master switch → Signup popup → All-surveys flag → Per-survey → Per-user
 */
import React, { useEffect, useState } from 'react';
import { MapPin, Globe, Users, LayoutList, ToggleLeft, ToggleRight, RefreshCw, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

const baseUrl = getApiBaseUrl();

interface LocationSettings {
  global_location_enabled: boolean;
  signup_location_enabled: boolean;
  all_surveys_location_enabled: boolean;
}

interface UserRow {
  _id: string;
  email: string;
  name: string;
  role: string;
  location_feature_enabled: boolean;
}

interface SurveyRow {
  _id: string;       // short_id (display / key)
  mongo_id: string;  // real ObjectId — used for PUT calls
  short_id: string;
  title: string;
  status: string;
  collect_location: boolean;
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        disabled:opacity-40 disabled:cursor-not-allowed
        ${on ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

const LocationControlTab: React.FC = () => {
  const [settings, setSettings] = useState<LocationSettings>({
    global_location_enabled: false,
    signup_location_enabled: false,
    all_surveys_location_enabled: false,
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [surveySearch, setSurveySearch] = useState('');

  const token = () => localStorage.getItem('auth_token');

  const headers = () => ({
    'Authorization': `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, uRes, srRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/location/settings`, { headers: headers() }),
        fetch(`${baseUrl}/api/admin/location/users`, { headers: headers() }),
        fetch(`${baseUrl}/api/admin/location/surveys`, { headers: headers() }),
      ]);
      if (!sRes.ok || !uRes.ok || !srRes.ok) throw new Error('Failed to load location data');
      const [sData, uData, srData] = await Promise.all([sRes.json(), uRes.json(), srRes.json()]);
      setSettings({
        global_location_enabled: !!sData.global_location_enabled,
        signup_location_enabled: !!sData.signup_location_enabled,
        all_surveys_location_enabled: !!sData.all_surveys_location_enabled,
      });
      setUsers(uData.users || []);
      setSurveys(srData.surveys || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const updateGlobalSetting = async (key: keyof LocationSettings, value: boolean) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${baseUrl}/api/admin/location/settings`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      const data = await res.json();
      setSettings({
        global_location_enabled: !!data.settings.global_location_enabled,
        signup_location_enabled: !!data.settings.signup_location_enabled,
        all_surveys_location_enabled: !!data.settings.all_surveys_location_enabled,
      });
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (userId: string, current: boolean) => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/location/users/${userId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ enabled: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, location_feature_enabled: !current } : u));
      setSuccess(!current ? 'Location access granted' : 'Location access revoked');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleSurvey = async (survey: SurveyRow, current: boolean) => {
    // Use mongo_id (real ObjectId) for the PUT endpoint
    const id = survey.mongo_id || survey._id;
    try {
      const res = await fetch(`${baseUrl}/api/admin/location/surveys/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ collect_location: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setSurveys(prev => prev.map(s => (s.mongo_id || s._id) === id ? { ...s, collect_location: !current } : s));
      setSuccess(!current ? 'Location enabled for survey' : 'Location disabled for survey');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredSurveys = surveys.filter(s =>
    s.title.toLowerCase().includes(surveySearch.toLowerCase()) ||
    s.short_id?.toLowerCase().includes(surveySearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banners */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ {success}
        </div>
      )}

      {/* ── Section 1: Global controls ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
          <Globe size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-800">Global Location Controls</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {/* Master switch */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Master switch</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When OFF, no location popup fires anywhere on the platform — overrides all settings below.
              </p>
            </div>
            <Toggle
              on={settings.global_location_enabled}
              onToggle={() => updateGlobalSetting('global_location_enabled', !settings.global_location_enabled)}
              disabled={saving}
            />
          </div>

          {/* Signup popup */}
          <div className={`flex items-center justify-between px-5 py-4 ${!settings.global_location_enabled ? 'opacity-40' : ''}`}>
            <div>
              <p className="text-sm font-medium text-gray-800">Ask for location at signup</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Shows the browser GPS popup when a new user registers (email or OAuth).
              </p>
            </div>
            <Toggle
              on={settings.signup_location_enabled}
              onToggle={() => updateGlobalSetting('signup_location_enabled', !settings.signup_location_enabled)}
              disabled={saving || !settings.global_location_enabled}
            />
          </div>

          {/* All surveys */}
          <div className={`flex items-center justify-between px-5 py-4 ${!settings.global_location_enabled ? 'opacity-40' : ''}`}>
            <div>
              <p className="text-sm font-medium text-gray-800">Enable for all surveys</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Forces location collection on every survey, regardless of per-survey settings.
              </p>
            </div>
            <Toggle
              on={settings.all_surveys_location_enabled}
              onToggle={() => updateGlobalSetting('all_surveys_location_enabled', !settings.all_surveys_location_enabled)}
              disabled={saving || !settings.global_location_enabled}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Per-user access ────────────────────────────────────── */}
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${!settings.global_location_enabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-800">User Access</h2>
            <span className="text-xs text-gray-400 font-normal">— who can toggle location on their surveys</span>
          </div>
          <span className="text-xs text-gray-400">{users.filter(u => u.location_feature_enabled).length} / {users.length} enabled</span>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {filteredUsers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No users found</p>
          )}
          {filteredUsers.map(u => (
            <div key={u._id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.name || '—'}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5
                  ${u.role === 'admin' ? 'bg-purple-100 text-purple-700'
                  : u.role === 'enterprise' ? 'bg-blue-100 text-blue-700'
                  : u.role === 'premium' ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'}`}>
                  {u.role}
                </span>
              </div>
              <Toggle
                on={u.location_feature_enabled}
                onToggle={() => toggleUser(u._id, u.location_feature_enabled)}
                disabled={!settings.global_location_enabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Per-survey override ───────────────────────────────── */}
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${!settings.global_location_enabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <LayoutList size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-800">Per-Survey Override</h2>
            <span className="text-xs text-gray-400 font-normal">— enable location for specific surveys</span>
          </div>
          {settings.all_surveys_location_enabled && (
            <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
              All-surveys flag is ON — overrides individual settings
            </span>
          )}
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search by title or ID…"
            value={surveySearch}
            onChange={e => setSurveySearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {filteredSurveys.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No surveys found</p>
          )}
          {filteredSurveys.map(s => (
            <div key={s._id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-800 truncate">{s.title || 'Untitled survey'}</p>
                <p className="text-xs text-gray-400 font-mono">{s.short_id}</p>
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5
                  ${s.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.status}
                </span>
              </div>
              <Toggle
                on={settings.all_surveys_location_enabled || s.collect_location}
                onToggle={() => !settings.all_surveys_location_enabled && toggleSurvey(s, s.collect_location)}
                disabled={!settings.global_location_enabled || settings.all_surveys_location_enabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 px-5 py-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1.5"><MapPin size={12} /> Priority order (top overrides bottom)</p>
        <p>1. <strong>Master switch OFF</strong> → nothing collects location, anywhere</p>
        <p>2. <strong>Master switch ON</strong> + <strong>Signup toggle</strong> → GPS popup at registration</p>
        <p>3. <strong>All-surveys flag ON</strong> → every survey collects location</p>
        <p>4. <strong>Per-survey toggle</strong> → only that survey collects location</p>
        <p>5. <strong>User access</strong> → survey creator can see/use the location toggle in their editor</p>
      </div>
    </div>
  );
};

export default LocationControlTab;
