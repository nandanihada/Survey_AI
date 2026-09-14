/**
 * LoadingAnimationTab
 *
 * Admin panel tab for choosing which loading animation appears when users
 * generate a survey. Shows a live preview of each of the 5 designs,
 * lets the admin click one to select it, and saves via the backend API.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Save, Zap } from 'lucide-react';
import SearchLoader, { ANIMATION_OPTIONS, AnimationId } from '../SearchLoader';
import { getApiBaseUrl } from '../../utils/deploymentFix';

type Toast = { type: 'success' | 'error'; text: string } | null;

const S = {
  card: {
    background: '#FDFCFA',
    border: '1px solid #EBE8E3',
    borderRadius: 10,
    padding: '20px 24px',
  } as React.CSSProperties,
  btn: (accent = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
    background: accent ? '#C4785C' : '#F5F1E8',
    color: accent ? '#fff' : '#6B6158',
    boxShadow: accent ? '0 2px 8px rgba(196,120,92,.25)' : 'none',
  }),
};

const LoadingAnimationTab: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const token = () => localStorage.getItem('auth_token') || '';
  const apiBase = `${baseUrl}/api/admin/loading-animation`;

  const [current, setCurrent]   = useState<AnimationId>('gooey');
  const [selected, setSelected] = useState<AnimationId>('gooey');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<Toast>(null);

  const flash = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load current setting
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiBase, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) {
          const data = await res.json();
          const id = data.animation_id as AnimationId;
          setCurrent(id); setSelected(id);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [apiBase]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ animation_id: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCurrent(selected);
      flash('success', `Animation set to "${ANIMATION_OPTIONS.find(o => o.id === selected)?.label}".`);
    } catch (e) {
      flash('error', `Save failed: ${e}`);
    } finally { setSaving(false); }
  };

  const isDirty = selected !== current;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: '#9B9189' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13 }}>Loading…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, fontFamily: "'Outfit', -apple-system, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 8,
          background: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`,
          color: toast.type === 'success' ? '#15803D' : '#DC2626',
          borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,.08)',
        }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #C4785C 0%, #A8624A 100%)',
            boxShadow: '0 2px 8px rgba(196,120,92,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="#fff" />
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2D2520' }}>
            Survey Creation Animation
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#9B9189', paddingLeft: 42 }}>
          Choose which loading animation users see while their survey is being generated.
        </p>
      </div>

      {/* Info bar */}
      <div style={{ ...S.card, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: '#F5F1E8', color: '#6B6158', border: '1px solid #EBE8E3',
          }}>
            Active: {ANIMATION_OPTIONS.find(o => o.id === current)?.label ?? current}
          </div>
          {isDirty && (
            <span style={{ fontSize: 11, color: '#C4785C', fontWeight: 600 }}>
              Unsaved change — click Save to apply
            </span>
          )}
        </div>
        <button onClick={save} disabled={saving || !isDirty} style={{
          ...S.btn(isDirty),
          opacity: isDirty ? 1 : 0.45,
          cursor: isDirty ? 'pointer' : 'default',
        }}>
          {saving
            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            : <Save size={12} />}
          {saving ? 'Saving…' : 'Save Selection'}
        </button>
      </div>

      {/* Animation cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {ANIMATION_OPTIONS.map(opt => {
          const isActive  = opt.id === current;
          const isPicked  = opt.id === selected;
          return (
            <div
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              style={{
                background: '#FDFCFA',
                border: `2px solid ${isPicked ? '#C4785C' : '#EBE8E3'}`,
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color .15s, box-shadow .15s',
                boxShadow: isPicked ? '0 0 0 3px rgba(196,120,92,.15)' : 'none',
              }}
            >
              {/* Preview area */}
              <div style={{ background: '#F9F7F4', borderBottom: '1px solid #EBE8E3' }}>
                <SearchLoader
                  animationId={opt.id}
                  inline
                  message="Generating your survey…"
                />
              </div>

              {/* Info row */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2D2520' }}>{opt.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9B9189' }}>{opt.description}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 10 }}>
                  {isActive && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC',
                    }}>Live</span>
                  )}
                  {isPicked && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      background: '#FEF3E8', color: '#C4785C', border: '1px solid #F8C8A8',
                    }}>Selected</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default LoadingAnimationTab;
