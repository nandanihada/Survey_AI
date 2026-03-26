import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://hostslice.onrender.com';

export default function MaskedLinkViewer() {
  const { shortId } = useParams<{ shortId: string }>();
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!shortId) return;
    fetch(`${API_BASE}/api/masked-links/${shortId}/resolve`)
      .then((res) => {
        if (!res.ok) throw new Error('Link not found or inactive');
        return res.json();
      })
      .then((data) => setTargetUrl(data.original_url))
      .catch((err) => setError(err.message));
  }, [shortId]);

  if (error) {
    return (
      <div style={styles.center}>
        <h2 style={{ color: '#ef4444' }}>Link Not Found</h2>
        <p style={{ color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (!targetUrl) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  if (blocked) {
    return (
      <div style={styles.center}>
        <h2 style={{ color: '#f59e0b' }}>Cannot preview this page</h2>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>
          This website blocks embedding. Click below to open it directly.
        </p>
        <a href={targetUrl} target="_blank" rel="noopener noreferrer" style={styles.btn}>
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Thin top bar showing the masked URL */}
      <div style={styles.bar}>
        <span style={styles.barLabel}>🔗 {window.location.href}</span>
      </div>
      <iframe
        src={targetUrl}
        style={styles.iframe}
        title="Masked Link"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        onError={() => setBlocked(true)}
        onLoad={(e) => {
          // Detect X-Frame-Options block — iframe loads but is blank
          try {
            const doc = (e.target as HTMLIFrameElement).contentDocument;
            if (!doc || doc.body.innerHTML === '') setBlocked(true);
          } catch {
            setBlocked(true);
          }
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' },
  bar: { background: '#1e293b', padding: '6px 16px', display: 'flex', alignItems: 'center', flexShrink: 0 },
  barLabel: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iframe: { flex: 1, border: 'none', width: '100%' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 },
  btn: { padding: '10px 24px', background: '#3b82f6', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 500 },
};
