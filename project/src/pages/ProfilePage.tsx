import { useState, useEffect } from 'react';
import { User, Mail, Globe, Link, Settings, Save, Plus, X, BarChart3, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { makeApiRequest, handleApiError } from '../utils/deploymentFix';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  website: string;
  postbackUrl: string;
  postbackMethod: 'GET' | 'POST';
  includeResponses: boolean;
  parameterMappings: Record<string, string>;
  createdAt: string;
  totalSurveys: number;
  totalResponses: number;
}

const AVAILABLE_PARAMETERS = {
  'transaction_id': 'Unique transaction identifier',
  'survey_id': 'Survey identifier',
  'username': 'User\'s username or identifier',
  'email': 'User\'s email address',
  'user_id': 'User\'s ID in our system',
  'click_id': 'Click tracking identifier',
  'payout': 'Payout amount',
  'currency': 'Currency code (USD, EUR, etc.)',
  'status': 'Completion status',
  'responses': 'Survey responses (JSON format)',
  'responses_flat': 'Survey responses (flat key=value format)',
  'responses_count': 'Number of survey responses',
  'responses_summary': 'Brief summary of responses',
  'timestamp': 'Completion timestamp',
  'ip_address': 'User\'s IP address'
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [isDarkMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }
      
      // Try to load real profile data using deployment fix utilities
      const response = await makeApiRequest(`/api/user/profile?user_id=${user.id}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        // Fallback to mock data if API fails
        console.log('API failed, using mock data');
        const mockProfile: UserProfile = {
          id: user.id,
          name: user.name || 'Test User',
          email: user.email || 'test@example.com',
          website: 'https://example.com',
          postbackUrl: 'https://webhook.site/your-unique-id',
          postbackMethod: 'POST',
          includeResponses: true,
          parameterMappings: {
            'transaction_id': 'txn_id',
            'username': 'user_name',
            'status': 'result'
          },
          totalSurveys: 5,
          totalResponses: 23,
          createdAt: new Date().toISOString()
        };
        setProfile(mockProfile);
      }
    } catch (err) {
      const errorMessage = handleApiError(err, 'Profile load');
      setError(errorMessage);
      console.error('Profile load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
    if (profile) {
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const addParameterMapping = () => {
    if (newParamKey && newParamValue && profile) {
      setProfile(prev => prev ? {
        ...prev,
        parameterMappings: {
          ...prev.parameterMappings,
          [newParamKey]: newParamValue
        }
      } : null);
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const removeParameterMapping = (key: string) => {
    if (profile) {
      setProfile(prev => {
        if (!prev) return null;
        const newMappings = { ...prev.parameterMappings };
        delete newMappings[key];
        return { ...prev, parameterMappings: newMappings };
      });
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await makeApiRequest('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          name: profile.name,
          website: profile.website,
          postbackUrl: profile.postbackUrl,
          postbackMethod: profile.postbackMethod,
          includeResponses: profile.includeResponses,
          parameterMappings: profile.parameterMappings
        })
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update profile');
      }
    } catch (err) {
      const errorMessage = handleApiError(err, 'Profile update');
      setError(errorMessage);
      console.error('Profile update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex">
        <Navigation isDarkMode={isDarkMode} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex">
        <Navigation isDarkMode={isDarkMode} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600">Unable to load your profile information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation isDarkMode={isDarkMode} />
      
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your account and postback configuration</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <BarChart3 size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Surveys</p>
                    <p className="text-2xl font-bold text-gray-900">{profile.totalSurveys}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <User size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Responses</p>
                    <p className="text-2xl font-bold text-gray-900">{profile.totalResponses}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Settings size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Member Since</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h2>
                
                <div className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Email Field (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={profile.email}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Website Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <div className="relative">
                      <Globe size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={profile.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Postback URL Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postback URL
                    </label>
                    <div className="relative">
                      <Link size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={profile.postbackUrl}
                        onChange={(e) => handleInputChange('postbackUrl', e.target.value)}
                        placeholder="https://webhook.site/your-unique-id"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send survey completion data to this URL
                    </p>
                  </div>

                  {/* Postback Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postback Method
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="postbackMethod"
                          value="GET"
                          checked={profile.postbackMethod === 'GET'}
                          onChange={(e) => handleInputChange('postbackMethod', e.target.value)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">GET (Query Parameters)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="postbackMethod"
                          value="POST"
                          checked={profile.postbackMethod === 'POST'}
                          onChange={(e) => handleInputChange('postbackMethod', e.target.value)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">POST (JSON Body) ⭐ Recommended</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      POST method is recommended for sending survey responses
                    </p>
                  </div>

                  {/* Include Responses */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.includeResponses}
                        onChange={(e) => handleInputChange('includeResponses', e.target.checked)}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Include Survey Responses</span>
                        <p className="text-xs text-gray-500">
                          Send all questions and answers in the postback data
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameter Mapping */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Parameter Mapping</h2>
                
                {/* Add New Mapping */}
                <div className="space-y-3 mb-6">
                  <select
                    value={newParamKey}
                    onChange={(e) => setNewParamKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select Parameter</option>
                    {Object.entries(AVAILABLE_PARAMETERS).map(([key]) => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newParamValue}
                    onChange={(e) => setNewParamValue(e.target.value)}
                    placeholder="Your parameter name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={addParameterMapping}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Add Mapping
                  </button>
                </div>

                {/* Current Mappings */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Current Mappings</h3>
                  {Object.entries(profile.parameterMappings).length === 0 ? (
                    <p className="text-sm text-gray-500">No parameter mappings configured</p>
                  ) : (
                    Object.entries(profile.parameterMappings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="text-sm">
                          <code className="px-1 bg-gray-200 rounded text-xs">{key}</code>
                          <span className="mx-1">→</span>
                          <code className="px-1 bg-gray-200 rounded text-xs">{value}</code>
                        </div>
                        <button
                          onClick={() => removeParameterMapping(key)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Data Export Section */}
          <div className="lg:col-span-3">
            <DataExportSection />
          </div>

          {/* Danger Zone - Account Deletion */}
          <div className="lg:col-span-3">
            <AccountDeletionSection />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Data Export Section ====================
function DataExportSection() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(['account', 'surveys', 'responses']));

  const getBaseUrl = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
  };

  const toggleType = (type: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) { alert('Select at least one data type to export'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${getBaseUrl()}/api/auth/export-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ export_types: Array.from(selected) })
      });
      if (res.ok) {
        const data = await res.json();
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pepperwahl-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const err = await res.json();
        alert(`Export failed: ${err.error || 'Unknown error'}`);
      }
    } catch { alert('Network error during export'); }
    setLoading(false);
  };

  const exportOptions = [
    { id: 'account', label: 'Account Information', desc: 'Name, email, role, registration date' },
    { id: 'surveys', label: 'Surveys & Questions', desc: 'All surveys with questions and configurations' },
    { id: 'responses', label: 'Survey Responses', desc: 'All responses collected across your surveys' },
    { id: 'consent', label: 'Consent Logs', desc: 'Records of your consent preferences' },
  ];

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-blue-700 mb-1">Download My Data</h2>
      <p className="text-sm text-gray-600 mb-4">Export your personal data in JSON format. Select what to include:</p>

      <div className="space-y-2 mb-4">
        {exportOptions.map(opt => (
          <label key={opt.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 cursor-pointer hover:border-blue-200 transition-colors">
            <input
              type="checkbox"
              checked={selected.has(opt.id)}
              onChange={() => toggleType(opt.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              <p className="text-xs text-gray-500">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={loading || selected.size === 0}
        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Exporting...' : 'Download My Data'}
      </button>
    </div>
  );
}

// ==================== Account Deletion Section ====================
function AccountDeletionSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const getBaseUrl = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
  };

  // Check deletion status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${getBaseUrl()}/api/auth/deletion-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDeletionStatus(await res.json());
      } catch {}
      setStatusLoading(false);
    };
    checkStatus();
  }, []);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${getBaseUrl()}/api/auth/delete-account`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        setDeletionStatus({ has_pending_deletion: true, delete_after: data.delete_after, timeline: data.timeline });
        setShowConfirm(false);
        setPassword('');
      } else {
        alert(data.error || 'Failed to request deletion');
      }
    } catch { alert('Network error'); }
    setLoading(false);
  };

  const handleCancel = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${getBaseUrl()}/api/auth/cancel-deletion`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeletionStatus({ has_pending_deletion: false });
        alert('Deletion cancelled. Your account is safe.');
      }
    } catch { alert('Network error'); }
  };

  if (statusLoading) return null;

  return (
    <div className="mt-4 bg-white border-2 border-red-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-red-700 mb-2">Danger Zone</h2>

      {deletionStatus?.has_pending_deletion ? (
        <div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 font-medium">Account deletion is scheduled.</p>
            <p className="text-xs text-amber-700 mt-1">
              Your data will be permanently deleted after: <strong>{new Date(deletionStatus.delete_after).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>
            </p>
            <p className="text-xs text-amber-600 mt-1">You can cancel anytime before this date to keep your account.</p>
          </div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Cancel Deletion — Keep My Account
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-stone-600 mb-4">
            Once you delete your account, all your surveys, responses, and data will be permanently removed after the cooling-off period based on your plan. This action cannot be undone after that period.
          </p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Delete My Account
            </button>
          ) : (
            <div className="bg-white border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">Are you sure? Enter your password to confirm.</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Processing...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => { setShowConfirm(false); setPassword(''); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
