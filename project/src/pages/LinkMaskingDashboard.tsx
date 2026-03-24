import React, { useState, useEffect } from 'react';
import './LinkMaskingDashboard.css';

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

const LinkMaskingDashboard: React.FC = () => {
  const [links, setLinks] = useState<MaskedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLink, setSelectedLink] = useState<MaskedLink | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);

  // Form states
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');

  const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost') ||
                       window.location.hostname.includes('127.0.0.1');
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://api.pepperwahl.com';
    
  // Construct masked URL based on current environment
  const getMaskedUrl = (shortId: string) => {
    return isLocalhost 
      ? `http://localhost:5000/l/${shortId}`
      : `https://api.pepperwahl.com/l/${shortId}`;
  };

  // Debug info
  console.log('Hostname:', window.location.hostname);
  console.log('Is Localhost:', isLocalhost);
  console.log('API Base URL:', apiBaseUrl);

  const userId = 'demo_user'; // In real app, get from auth context

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/masked-links`, {
        headers: {
          'X-User-ID': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch links');
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createMaskedLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!originalUrl) {
      setError('Original URL is required');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/masked-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          original_url: originalUrl,
          custom_alias: customAlias || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create link');
      }

      const data = await response.json();
      setLinks([data, ...links]);
      setOriginalUrl('');
      setCustomAlias('');
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    }
  };

  const fetchAnalytics = async (shortId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/masked-links/${shortId}/analytics`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setShowAnalytics(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    }
  };

  const toggleLinkStatus = async (link: MaskedLink) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/masked-links/${link.short_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          is_active: !link.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      await fetchLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update link');
    }
  };

  const deleteLink = async (shortId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/masked-links/${shortId}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      await fetchLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete link');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return <div className="link-masking-loading">Loading...</div>;
  }

  return (
    <div className="link-masking-dashboard">
      <div className="link-masking-header">
        <h1>Link Masking Dashboard</h1>
        <p>Create and manage shortened links for your platform</p>
        <button
          className="create-link-btn"
          onClick={() => setShowCreateForm(true)}
        >
          + Create New Link
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create Masked Link</h2>
            <form onSubmit={createMaskedLink}>
              <div className="form-group">
                <label htmlFor="originalUrl">Original URL *</label>
                <input
                  id="originalUrl"
                  type="url"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://example.com/very/long/url"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="customAlias">Custom Alias (Optional)</label>
                <input
                  id="customAlias"
                  type="text"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder="my-custom-link"
                  pattern="[a-zA-Z0-9_-]+"
                  title="Only letters, numbers, hyphens, and underscores allowed"
                />
                <small>Leave empty for auto-generated short ID</small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAnalytics && analytics && (
        <div className="modal-overlay">
          <div className="modal analytics-modal">
            <h2>Link Analytics</h2>
            <div className="analytics-content">
              <div className="analytics-summary">
                <div className="stat-card">
                  <h3>Total Clicks</h3>
                  <span className="stat-value">{analytics.clicks}</span>
                </div>
                <div className="stat-card">
                  <h3>Unique Clicks</h3>
                  <span className="stat-value">{analytics.unique_clicks}</span>
                </div>
                <div className="stat-card">
                  <h3>Last Clicked</h3>
                  <span className="stat-value">
                    {analytics.last_clicked ? formatDate(analytics.last_clicked) : 'Never'}
                  </span>
                </div>
              </div>

              <div className="analytics-details">
                <div className="analytics-section">
                  <h3>Devices</h3>
                  {Object.entries(analytics.analytics.devices).map(([device, count]) => (
                    <div key={device} className="analytics-item">
                      <span>{device}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>

                <div className="analytics-section">
                  <h3>Browsers</h3>
                  {Object.entries(analytics.analytics.browsers).map(([browser, count]) => (
                    <div key={browser} className="analytics-item">
                      <span>{browser}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>

                <div className="analytics-section">
                  <h3>Daily Clicks</h3>
                  {Object.entries(analytics.analytics.daily_clicks)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 7)
                    .map(([date, count]) => (
                      <div key={date} className="analytics-item">
                        <span>{date}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowAnalytics(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="links-table-container">
        {links.length === 0 ? (
          <div className="empty-state">
            <h3>No links yet</h3>
            <p>Create your first masked link to get started</p>
          </div>
        ) : (
          <table className="links-table">
            <thead>
              <tr>
                <th>Short ID</th>
                <th>Original URL</th>
                <th>Created</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.short_id}>
                  <td>
                    <div className="short-id">
                      <div className="short-id-text">{link.short_id}</div>
                      <div className="masked-url-display">{getMaskedUrl(link.short_id)}</div>
                      <div className="action-buttons">
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(getMaskedUrl(link.short_id))}
                          title="Copy masked URL"
                        >
                          📋
                        </button>
                        <button
                          className="open-btn"
                          onClick={() => window.open(getMaskedUrl(link.short_id), '_blank')}
                          title="Open masked URL"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="original-url" title={link.original_url}>
                      {link.original_url.length > 50
                        ? link.original_url.substring(0, 50) + '...'
                        : link.original_url}
                    </div>
                  </td>
                  <td>{formatDate(link.created_at)}</td>
                  <td>
                    <div className="clicks-info">
                      <span>{link.clicks}</span>
                      <button
                        className="analytics-btn"
                        onClick={() => fetchAnalytics(link.short_id)}
                        title="View analytics"
                      >
                        📊
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${link.is_active ? 'active' : 'inactive'}`}>
                      {link.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="toggle-btn"
                        onClick={() => toggleLinkStatus(link)}
                        title={link.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {link.is_active ? '⏸️' : '▶️'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteLink(link.short_id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LinkMaskingDashboard;
