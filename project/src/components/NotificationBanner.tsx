import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

interface Notification {
  _id: string;
  title: string;
  message: string;
}

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://hostslice.onrender.com';

const NotificationBanner: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    fetch(`${API}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.notifications?.length) setNotifications(data.notifications);
      })
      .catch(() => {});
  }, []);

  const dismiss = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch(`${API}/api/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
    const remaining = notifications.filter(n => n._id !== id);
    setNotifications(remaining);
    setCurrent(c => Math.min(c, remaining.length - 1));
  };

  if (notifications.length === 0) return null;

  const n = notifications[current];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
      background: '#1e40af', color: '#fff', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(30,64,175,0.35)',
      padding: '16px 20px', maxWidth: 360, width: 'calc(100vw - 48px)',
      animation: 'slideUp 0.3s ease'
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, flexShrink: 0 }}>
          <Bell size={16} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
          <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>{n.message}</div>
          {notifications.length > 1 && (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
              {current + 1} of {notifications.length}
              {current < notifications.length - 1 && (
                <button onClick={() => setCurrent(c => c + 1)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>
                  Next
                </button>
              )}
            </div>
          )}
        </div>
        <button onClick={() => dismiss(n._id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <X size={14} color="#fff" />
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;
