/**
 * Contact Submissions Tab - Shows contact form submissions from landing page
 */
import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import { Mail, User, MessageSquare, Clock, MapPin, Globe, RefreshCw } from 'lucide-react';

const baseUrl = getApiBaseUrl();

/** Format a date string to IST */
function formatIST(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    let utcStr = dateStr;
    if (!utcStr.endsWith('Z') && !utcStr.includes('+') && !utcStr.includes('-', 10)) {
      utcStr = utcStr + 'Z';
    }
    return new Date(utcStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  } catch {
    return dateStr;
  }
}

interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  page: string;
  ip_address: string;
  city: string;
  country: string;
  created_at: string;
}

const ContactSubmissionsTab: React.FC = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/tracking/admin/contact-submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to load contact submissions:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Mail size={22} className="text-emerald-600" />
            Contact Form Submissions
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">From landing page (pepperwahl.com/contactUs) - Auto-deletes after 15 days</p>
        </div>
        <button
          onClick={fetchSubmissions}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white shadow-lg">
          <div className="text-2xl font-bold">{submissions.length}</div>
          <div className="text-xs opacity-80">Total Submissions</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white shadow-lg">
          <div className="text-2xl font-bold">{new Set(submissions.map(s => s.email)).size}</div>
          <div className="text-xs opacity-80">Unique Emails</div>
        </div>
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border rounded-xl">
          <Mail size={40} className="mx-auto mb-3 opacity-30" />
          <p>No contact form submissions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {sub.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      <User size={13} className="text-gray-400" />
                      {sub.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-blue-600 flex items-center gap-1.5">
                      <Mail size={12} />
                      {sub.email || 'No email'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={11} />
                    {formatIST(sub.created_at)}
                  </div>
                  {sub.city && sub.city !== 'Local' && (
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 justify-end">
                      <MapPin size={11} />
                      {sub.city}, {sub.country}
                    </div>
                  )}
                </div>
              </div>
              {/* Message */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageSquare size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.message || 'No message'}</p>
                </div>
              </div>
              {/* Meta */}
              <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
                <span>IP: {sub.ip_address || '-'}</span>
                <span>Page: {sub.page || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactSubmissionsTab;
