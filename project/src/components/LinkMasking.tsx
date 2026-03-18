import React, { useState, useEffect } from 'react';
import { Link2, Copy, Trash2, Eye, EyeOff, BarChart3, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface MaskedLink {
  short_id: string;
  original_url: string;
  masked_url: string;
  created_at: string;
  clicks: number;
  unique_clicks: number;
  last_clicked: string | null;
  is_active: boolean;
}

interface LinkAnalytics {
  short_id: string;
  original_url: string;
  masked_url: string;
  created_at: string;
  clicks: number;
  unique_clicks: number;
  last_clicked: string | null;
  is_active: boolean;
  analytics: {
    daily_clicks: Record<string, number>;
    referrers: Record<string, number>;
    countries: Record<string, number>;
    devices: Record<string, number>;
    browsers: Record<string, number>;
  };
}

interface LinkMaskingProps {
  isDarkMode: boolean;
}

const LinkMasking: React.FC<LinkMaskingProps> = ({ isDarkMode }) => {
  const [links, setLinks] = useState<MaskedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLink, setSelectedLink] = useState<MaskedLink | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [linkAnalytics, setLinkAnalytics] = useState<LinkAnalytics | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    original_url: '',
    custom_alias: ''
  });
  
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://hostslice.onrender.com';

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/masked-links`, {
        headers: {
          'X-User-ID': 'admin' // In production, use actual user authentication
        }
      });
      const data = await response.json();
      if (response.ok) {
        setLinks(data.links || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load links' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load links' });
    } finally {
      setLoading(false);
    }
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.original_url.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid URL' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/masked-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify({
          original_url: formData.original_url,
          custom_alias: formData.custom_alias || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `Link created: ${data.masked_url}` });
        setShowCreateForm(false);
        setFormData({ original_url: '', custom_alias: '' });
        loadLinks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create link' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create link' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleLinkStatus = async (link: MaskedLink) => {
    try {
      const response = await fetch(`${API_BASE}/api/masked-links/${link.short_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify({
          is_active: !link.is_active
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Link status updated' });
        loadLinks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update link' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update link' });
    }
  };

  const deleteLink = async (link: MaskedLink) => {
    if (!confirm(`Are you sure you want to delete this link? (${link.masked_url})`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/masked-links/${link.short_id}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': 'admin'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Link deleted successfully' });
        loadLinks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete link' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete link' });
    }
  };

  const loadAnalytics = async (link: MaskedLink) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/masked-links/${link.short_id}/analytics`);
      const data = await response.json();
      if (response.ok) {
        setLinkAnalytics(data);
        setSelectedLink(link);
        setShowAnalytics(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load analytics' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load analytics' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-stone-200'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          <Link2 className="inline mr-2" size={18} />
          Link Masking System
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <Link2 size={16} />
          Create Link
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto"
          >
            ×
          </button>
        </div>
      )}

      {/* Create Link Form */}
      {showCreateForm && (
        <div className={`mb-6 p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Create Masked Link
          </h3>
          <form onSubmit={createLink} className="space-y-4">
            <div>
              <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                Original URL *
              </label>
              <input
                type="url"
                value={formData.original_url}
                onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                placeholder="https://example.com/very/long/url"
                className={`w-full p-2 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-white' 
                    : 'bg-white border-gray-300 text-stone-800'
                }`}
                required
              />
            </div>
            <div>
              <label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                Custom Alias (optional)
              </label>
              <input
                type="text"
                value={formData.custom_alias}
                onChange={(e) => setFormData({ ...formData, custom_alias: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                placeholder="my-custom-link"
                className={`w-full p-2 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-white' 
                    : 'bg-white border-gray-300 text-stone-800'
                }`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Leave empty for auto-generated short ID
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Creating...' : 'Create Link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ original_url: '', custom_alias: '' });
                }}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Links List */}
      <div className={`rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="p-4 border-b border-slate-600">
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Your Masked Links ({links.length})
          </h3>
        </div>
        
        <div className="divide-y divide-slate-600">
          {loading ? (
            <div className="p-4 text-center">Loading links...</div>
          ) : links.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No masked links created yet. Create your first link above!
            </div>
          ) : (
            links.map((link) => (
              <div key={link.short_id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        link.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </div>
                      <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {link.clicks} clicks
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'} truncate`}>
                        {link.masked_url}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} truncate`}>
                        → {link.original_url}
                      </div>
                    </div>
                    
                    <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      Created: {formatDate(link.created_at)}
                      {link.last_clicked && ` • Last clicked: ${formatDate(link.last_clicked)}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(link.masked_url, link.short_id)}
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-slate-600 text-slate-300' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Copy link"
                    >
                      {copiedLinkId === link.short_id ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                    
                    <button
                      onClick={() => loadAnalytics(link)}
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-slate-600 text-slate-300' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                      title="View analytics"
                    >
                      <BarChart3 size={16} />
                    </button>
                    
                    <button
                      onClick={() => toggleLinkStatus(link)}
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-slate-600 text-slate-300' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                      title={link.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {link.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    
                    <a
                      href={link.masked_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-slate-600 text-slate-300' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Open link"
                    >
                      <ExternalLink size={16} />
                    </a>
                    
                    <button
                      onClick={() => deleteLink(link)}
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-red-600 text-red-400' 
                          : 'hover:bg-red-100 text-red-600'
                      }`}
                      title="Delete link"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analytics Modal */}
      {showAnalytics && linkAnalytics && selectedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg p-6 ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                Link Analytics
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className={`p-2 rounded ${
                  isDarkMode 
                    ? 'hover:bg-slate-700 text-slate-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  {linkAnalytics.masked_url}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  → {linkAnalytics.original_url}
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {linkAnalytics.clicks}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    Total Clicks
                  </div>
                </div>
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {linkAnalytics.unique_clicks}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    Unique Clicks
                  </div>
                </div>
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {Object.keys(linkAnalytics.analytics.devices || {}).length}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    Device Types
                  </div>
                </div>
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {Object.keys(linkAnalytics.analytics.referrers || {}).length}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    Referrers
                  </div>
                </div>
              </div>
              
              {/* Device Analytics */}
              {Object.keys(linkAnalytics.analytics.devices || {}).length > 0 && (
                <div>
                  <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                    Device Breakdown
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(linkAnalytics.analytics.devices).map(([device, count]) => (
                      <div key={device} className={`flex justify-between p-2 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                        <span className={`capitalize ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>{device}</span>
                        <span className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkMasking;
