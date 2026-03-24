import React, { useState, useEffect } from 'react';
import { X, Bell, Send, Trash2 } from 'lucide-react';

interface Notification {
  _id: string;
  title: string;
  message: string;
  target: string;
  created_at: string;
  read_by: string[];
}

interface Props {
  onClose: () => void;
}

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://api.pepperwahl.com';

const SendNotificationModal: React.FC<Props> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tab, setTab] = useState<'compose' | 'history'>('compose');

  const token = localStorage.getItem('auth_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/admin/notifications`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/admin/notifications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title || 'Support Notification', message, target }),
      });
      if (res.ok) {
        setSent(true);
        setTitle('');
        setMessage('');
        setTarget('all');
        setTimeout(() => setSent(false), 3000);
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/admin/notifications/${id}`, { method: 'DELETE', headers });
    setNotifications(n => n.filter(x => x._id !== id));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color="#fff" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Send Notification</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {(['compose', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: tab === t ? '#1e40af' : '#6b7280',
              borderBottom: tab === t ? '2px solid #1e40af' : '2px solid transparent'
            }}>
              {t === 'compose' ? 'Compose' : 'History'}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {tab === 'compose' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Support Notification"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your message to users..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Send To</label>
                <select
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                >
                  <option value="all">All Users</option>
                </select>
              </div>
              {sent && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#166534' }}>
                  Notification sent successfully!
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0', background: sending || !message.trim() ? '#93c5fd' : '#1e40af',
                  color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
                  cursor: sending || !message.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={16} />
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '24px 0' }}>No notifications sent yet</p>
              ) : notifications.map(n => (
                <div key={n._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 32 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{n.title}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                        To: {n.target} · {new Date(n.created_at).toLocaleString()} · {n.read_by?.length || 0} read
                      </div>
                    </div>
                    <button onClick={() => handleDelete(n._id)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendNotificationModal;
