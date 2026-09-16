/**
 * AnchorSettingsModal
 * Lets a funnel admin browse all platform anchor questions and attach them
 * (with priority) to the current funnel.
 * Attached anchors = other funnels whose gate we check when the user fails everything.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Anchor, Search, Check, GripVertical, Loader2, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────

interface AnchorQuestion {
  anchor_id: string;
  owner_funnel_id: string;
  owner_funnel_name: string;
  question_text: string;
  options: string[];
  correct_answers: string[];
  source_survey_name: string;
  created_at?: string;
}

interface AttachedAnchor {
  anchor_id: string;
  priority: number;
  owner_funnel_id: string;
  owner_funnel_name: string;
  question_text: string;
  correct_answers: string[];
}

interface Props {
  funnelId: string;
  funnelName: string;
  ownAnchorId?: string | null;
  initialAttached: AttachedAnchor[];
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: (attached: AttachedAnchor[]) => void;
}

// ─── Component ────────────────────────────────────────────

const AnchorSettingsModal: React.FC<Props> = ({
  funnelId, funnelName, ownAnchorId, initialAttached, isDarkMode, onClose, onSaved
}) => {
  const apiBase = getApiBaseUrl();

  const [allAnchors,     setAllAnchors]     = useState<AnchorQuestion[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [attached,       setAttached]       = useState<AttachedAnchor[]>(
    [...initialAttached].sort((a, b) => a.priority - b.priority)
  );
  const [saving,         setSaving]         = useState(false);
  const [saveMsg,        setSaveMsg]        = useState('');

  const authH = useCallback(() => {
    const t = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || '';
    return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  }, []);

  const fetchAnchors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/anchor-questions`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        // Exclude this funnel's own anchor — you can't attach your own gate to yourself
        setAllAnchors((data.anchor_questions || []).filter(
          (a: AnchorQuestion) => a.owner_funnel_id !== funnelId && a.anchor_id !== ownAnchorId
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, authH, funnelId, ownAnchorId]);

  useEffect(() => { fetchAnchors(); }, [fetchAnchors]);

  const isAttached = (anchor_id: string) => attached.some(a => a.anchor_id === anchor_id);

  const toggleAttach = (anchor: AnchorQuestion) => {
    if (isAttached(anchor.anchor_id)) {
      setAttached(prev => {
        const next = prev.filter(a => a.anchor_id !== anchor.anchor_id)
          .map((a, i) => ({ ...a, priority: i + 1 }));
        return next;
      });
    } else {
      setAttached(prev => [
        ...prev,
        {
          anchor_id:       anchor.anchor_id,
          priority:        prev.length + 1,
          owner_funnel_id: anchor.owner_funnel_id,
          owner_funnel_name: anchor.owner_funnel_name,
          question_text:   anchor.question_text,
          correct_answers: anchor.correct_answers,
        }
      ]);
    }
  };

  const movePriority = (anchor_id: string, direction: 'up' | 'down') => {
    setAttached(prev => {
      const sorted = [...prev].sort((a, b) => a.priority - b.priority);
      const idx = sorted.findIndex(a => a.anchor_id === anchor_id);
      if (direction === 'up' && idx > 0) {
        [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
      } else if (direction === 'down' && idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      }
      return sorted.map((a, i) => ({ ...a, priority: i + 1 }));
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${apiBase}/api/funnels/${funnelId}/attached-anchors`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify({ attached_anchors: attached }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveMsg('Saved!');
      onSaved(attached);
      setTimeout(() => { setSaveMsg(''); onClose(); }, 800);
    } catch (e: any) {
      setSaveMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ───────────────────────────────────────────────
  const BORDER = isDarkMode ? '#374151' : '#e5e7eb';
  const BG     = isDarkMode ? '#1f2937' : '#ffffff';
  const BG2    = isDarkMode ? '#111827' : '#f9fafb';
  const TEXT   = isDarkMode ? '#f3f4f6' : '#111827';
  const MUTED  = isDarkMode ? '#9ca3af' : '#6b7280';
  const AMBER  = '#f59e0b';

  const filtered = allAnchors.filter(a =>
    !search ||
    a.question_text.toLowerCase().includes(search.toLowerCase()) ||
    a.owner_funnel_name.toLowerCase().includes(search.toLowerCase()) ||
    a.source_survey_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 720, maxHeight: '92vh',
        borderRadius: 16, background: BG, border: `1px solid ${BORDER}`,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Anchor size={16} color={AMBER} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Anchor Settings</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Attaching anchors to: <strong>{funnelName}</strong></p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={16} color={MUTED} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ── LEFT: All platform anchor questions ── */}
          <div style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginBottom: 8 }}>
                All Anchor Questions
              </p>
              <div style={{ position: 'relative' }}>
                <Search size={12} color={MUTED} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search anchors..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontSize: 12, padding: '7px 8px 7px 26px',
                    borderRadius: 8, border: `1px solid ${BORDER}`,
                    background: BG2, color: TEXT, outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <Loader2 size={20} color={AMBER} className="animate-spin" />
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <p style={{ textAlign: 'center', padding: 24, fontSize: 12, color: MUTED }}>
                  {allAnchors.length === 0
                    ? 'No anchor questions found. Create funnels with anchor questions first.'
                    : 'No matches for your search.'}
                </p>
              )}
              {!loading && filtered.map(anchor => {
                const attached_flag = isAttached(anchor.anchor_id);
                return (
                  <div
                    key={anchor.anchor_id}
                    onClick={() => toggleAttach(anchor)}
                    style={{
                      padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                      border: `1px solid ${attached_flag ? AMBER : BORDER}`,
                      background: attached_flag ? (isDarkMode ? '#451a03' : '#fffbeb') : BG2,
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                        border: `2px solid ${attached_flag ? AMBER : BORDER}`,
                        background: attached_flag ? AMBER : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {attached_flag && <Check size={10} color="#fff" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 2 }}>
                          {anchor.question_text}
                        </p>
                        <p style={{ fontSize: 10, color: MUTED }}>
                          {anchor.source_survey_name} · {anchor.owner_funnel_name}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {anchor.options.map(opt => {
                            const isCorrect = anchor.correct_answers.includes(opt);
                            return (
                              <span key={opt} style={{
                                fontSize: 10, padding: '1px 7px', borderRadius: 10,
                                background: isCorrect ? '#dcfce7' : (isDarkMode ? '#374151' : '#f3f4f6'),
                                color: isCorrect ? '#166534' : MUTED,
                                fontWeight: isCorrect ? 700 : 400,
                                border: isCorrect ? '1px solid #86efac' : `1px solid ${BORDER}`,
                              }}>
                                {isCorrect && '✓ '}{opt}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Attached + priority ── */}
          <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED }}>
                Attached ({attached.length}) — Priority Order
              </p>
              <p style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
                Checked top-to-bottom when user fails all surveys. First qualifying anchor wins.
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {attached.length === 0 && (
                <p style={{ textAlign: 'center', padding: 24, fontSize: 12, color: MUTED }}>
                  Select anchors from the left panel.
                </p>
              )}
              {[...attached].sort((a, b) => a.priority - b.priority).map((a, idx) => (
                <div key={a.anchor_id} style={{
                  padding: '9px 10px', borderRadius: 10, marginBottom: 6,
                  border: `1px solid ${BORDER}`, background: BG2,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  {/* Priority badge */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: AMBER, color: '#fff', fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {a.priority}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.question_text}
                    </p>
                    <p style={{ fontSize: 10, color: MUTED }}>→ {a.owner_funnel_name}</p>
                  </div>

                  {/* Up/down + remove */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button
                      disabled={idx === 0}
                      onClick={() => movePriority(a.anchor_id, 'up')}
                      style={{ padding: '1px 4px', borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 10, color: TEXT }}
                    >↑</button>
                    <button
                      disabled={idx === attached.length - 1}
                      onClick={() => movePriority(a.anchor_id, 'down')}
                      style={{ padding: '1px 4px', borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, cursor: idx === attached.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === attached.length - 1 ? 0.3 : 1, fontSize: 10, color: TEXT }}
                    >↓</button>
                    <button
                      onClick={() => toggleAttach(allAnchors.find(x => x.anchor_id === a.anchor_id) || { anchor_id: a.anchor_id } as any)}
                      style={{ padding: '1px 4px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#ef4444' }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 11, color: MUTED }}>
            {attached.length} anchor{attached.length !== 1 ? 's' : ''} attached
            {attached.length > 0 && ` · checked in priority order at end of funnel`}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: 11, color: saveMsg === 'Saved!' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {saveMsg}
              </span>
            )}
            <button onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: BG2, cursor: 'pointer', fontSize: 12, color: TEXT }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: AMBER, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? 'Saving…' : 'Save anchor config'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnchorSettingsModal;
