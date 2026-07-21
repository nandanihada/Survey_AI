/**
 * Admin Deletion Requests Tab - Shows account deletion requests with countdown
 */
import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/deploymentFix';
import { Trash2, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const baseUrl = getApiBaseUrl();

function formatIST(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    let utcStr = dateStr;
    if (!utcStr.endsWith('Z') && !utcStr.includes('+') && !utcStr.includes('-', 10)) utcStr += 'Z';
    return new Date(utcStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  } catch { return dateStr; }
}

function getCountdown(deleteAfter: string): string {
  try {
    let utcStr = deleteAfter;
    if (!utcStr.endsWith('Z') && !utcStr.includes('+') && !utcStr.includes('-', 10)) utcStr += 'Z';
    const target = new Date(utcStr).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return 'Expired — ready to delete';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  } catch { return '-'; }
}

interface DeletionRequest {
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  requested_at: string;
  delete_after: string;
  timeline_text: string;
  status: string;
  cancelled_at: string | null;
  completed_at: string | null;
}

const DeletionRequestsTab: React.FC = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/tracking/admin/deletion-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  // Refresh countdown every minute
  useEffect(() => {
    const interval = setInterval(() => { setRequests(r => [...r]); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleManualDelete = async (userId: string, email: string) => {
    if (!window.confirm(`⚠️ You are about to permanently delete account "${email}" and ALL their data.\n\nThis includes:\n- All surveys\n- All responses\n- All tracking data\n- The user account itself\n\nThis CANNOT be undone. Continue?`)) return;
    if (!window.confirm(`FINAL CONFIRMATION: Type "yes" mentally and click OK to permanently delete ${email}. There is no going back.`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/tracking/admin/deletion-requests/execute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (res.ok) {
        alert('Account deleted successfully');
        fetchRequests();
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch { alert('Network error'); }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock size={11} /> Pending</span>;
      case 'completed': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"><CheckCircle size={11} /> Deleted</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"><XCircle size={11} /> Cancelled</span>;
      default: return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">Admin</span>;
      case 'premium': return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Premium</span>;
      case 'enterprise': return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">Enterprise</span>;
      default: return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">Free</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-600" />
            Account Deletion Requests
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Pending deletions with countdown timers. Admin can execute early.</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-lg font-bold text-amber-700">{requests.filter(r => r.status === 'pending').length}</div>
          <div className="text-[10px] text-amber-600">Pending</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="text-lg font-bold text-red-700">{requests.filter(r => r.status === 'completed').length}</div>
          <div className="text-[10px] text-red-600">Deleted</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="text-lg font-bold text-green-700">{requests.filter(r => r.status === 'cancelled').length}</div>
          <div className="text-[10px] text-green-600">Cancelled</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border rounded-xl">
          <Trash2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>No deletion requests yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50">
                <th className="text-left p-3 font-semibold text-gray-700">User</th>
                <th className="text-left p-3 font-semibold text-gray-700">Role</th>
                <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                <th className="text-left p-3 font-semibold text-gray-700">Requested</th>
                <th className="text-left p-3 font-semibold text-gray-700">Countdown</th>
                <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => (
                <tr key={idx} className={`border-t border-gray-100 ${req.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{req.user_name || '-'}</div>
                    <div className="text-xs text-gray-500">{req.user_email}</div>
                  </td>
                  <td className="p-3">{roleBadge(req.user_role)}</td>
                  <td className="p-3">{statusBadge(req.status)}</td>
                  <td className="p-3 text-xs text-gray-600">{formatIST(req.requested_at)}</td>
                  <td className="p-3">
                    {req.status === 'pending' ? (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {getCountdown(req.delete_after)}
                      </span>
                    ) : req.status === 'completed' ? (
                      <span className="text-xs text-red-600">Deleted {formatIST(req.completed_at)}</span>
                    ) : (
                      <span className="text-xs text-green-600">Recovered</span>
                    )}
                  </td>
                  <td className="p-3">
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleManualDelete(req.user_id, req.user_email)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        <Trash2 size={12} /> Delete Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeletionRequestsTab;
