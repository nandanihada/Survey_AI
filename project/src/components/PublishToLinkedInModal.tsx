/**
 * PublishToLinkedInModal
 *
 * Handles the full LinkedIn publish flow:
 *  1. Check if LinkedIn account is connected
 *  2. Generate AI copy (commentary, title, description) — all editable
 *  3. Preview the generated card image
 *  4. Publish to LinkedIn
 */
import React, { useState, useEffect } from 'react';
import {
  X, Linkedin, RefreshCw, Send, CheckCircle,
  AlertCircle, Loader, ExternalLink, Link2,
  User, Unlink, Sparkles, Image as ImageIcon,
  ChevronDown, ChevronUp, Calendar, Clock, Trash2,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedInAccount {
  connected: boolean;
  name?: string;
  person_urn?: string;
  expires_at?: string;
}

interface PostCopy {
  commentary: string;
  title: string;
  description: string;
}

interface Props {
  surveyShortId: string;
  surveyTitle: string;
  sourceType?: 'survey' | 'funnel';
  existingPostUrn?: string | null;
  onClose: () => void;
  onPublished: (postUrn: string, postUrl: string) => void;
}

// ─── LinkedIn brand colours ───────────────────────────────────────────────────
const LI_BLUE   = '#0A66C2';
const LI_BLUE_D = '#004182';

// ─── Component ────────────────────────────────────────────────────────────────

const PublishToLinkedInModal: React.FC<Props> = ({
  surveyShortId,
  surveyTitle,
  sourceType = 'survey',
  existingPostUrn,
  onClose,
  onPublished,
}) => {
  const baseUrl = getApiBaseUrl();

  // ── State ──────────────────────────────────────────────────────────────────
  const [account, setAccount]             = useState<LinkedInAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const [copy, setCopy]                   = useState<PostCopy>({ commentary: '', title: '', description: '' });
  const [copyLoading, setCopyLoading]     = useState(false);

  const [imageDataUrl, setImageDataUrl]   = useState<string>('');
  const [imageLoading, setImageLoading]   = useState(false);

  const [publishing, setPublishing]       = useState(false);
  const [result, setResult]               = useState<{ success: boolean; message: string; postUrl?: string } | null>(null);

  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [audience, setAudience]           = useState('');

  // ── Scheduling state ───────────────────────────────────────────────────────
  const [scheduleMode, setScheduleMode]   = useState(false);
  const [scheduleDate, setScheduleDate]   = useState('');   // YYYY-MM-DD
  const [scheduleTime, setScheduleTime]   = useState('');   // HH:MM
  const [scheduling, setScheduling]       = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scheduledItems, setScheduledItems] = useState<{ _id: string; publish_at: string }[]>([]);

  // ── On mount: check account + pre-generate copy ────────────────────────────
  useEffect(() => {
    checkAccount();
    generateImage(); // auto-generate image preview on open
    fetchScheduled();
  }, [surveyShortId]);

  const token = () => localStorage.getItem('auth_token') || '';

  // ── Account check ──────────────────────────────────────────────────────────
  const checkAccount = async () => {
    setAccountLoading(true);
    try {
      const res  = await fetch(`${baseUrl}/api/linkedin/status`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setAccount(data);
      if (data.connected) {
        // Auto-generate copy once we know the account is connected
        generateCopy(data.connected);
      }
    } catch {
      setAccount({ connected: false });
    } finally {
      setAccountLoading(false);
    }
  };

  // ── Generate copy ──────────────────────────────────────────────────────────
  const generateCopy = async (isConnected = true) => {
    if (!isConnected) return;
    setCopyLoading(true);
    try {
      const res  = await fetch(
        `${baseUrl}/api/admin/surveys/${surveyShortId}/linkedin-generate-copy`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ audience }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setCopy({ commentary: data.commentary, title: data.title, description: data.description });
      }
    } catch {
      // silent — user can type manually
    } finally {
      setCopyLoading(false);
    }
  };

  // ── Generate preview image ─────────────────────────────────────────────────
  const generateImage = async () => {
    setImageLoading(true);
    try {
      const res  = await fetch(
        `${baseUrl}/api/admin/surveys/${surveyShortId}/linkedin-generate-image`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: copy.title || surveyTitle }),
        },
      );
      const data = await res.json();
      if (data.success) setImageDataUrl(data.image_data_url);
    } catch {
      // silent
    } finally {
      setImageLoading(false);
    }
  };
  // ── Disconnect LinkedIn ────────────────────────────────────────────────────
  const disconnectLinkedIn = async () => {
    if (!window.confirm('Disconnect your LinkedIn account?')) return;
    try {
      await fetch(`${baseUrl}/api/linkedin/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      setAccount({ connected: false });
      setCopy({ commentary: '', title: '', description: '' });
      setImageDataUrl('');
    } catch {
      // silent
    }
  };

  // ── Scheduled items ────────────────────────────────────────────────────────
  const fetchScheduled = async () => {
    try {
      const res  = await fetch(`${baseUrl}/api/admin/surveys/${surveyShortId}/linkedin-schedule`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) setScheduledItems(data.scheduled || []);
    } catch { /* silent */ }
  };

  const handleSchedule = async () => {
    if (!copy.commentary.trim() || !copy.title.trim()) {
      setScheduleResult({ success: false, message: 'Commentary and title are required.' });
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      setScheduleResult({ success: false, message: 'Please pick a date and time.' });
      return;
    }
    const localDt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(localDt.getTime())) {
      setScheduleResult({ success: false, message: 'Invalid date or time.' });
      return;
    }
    const publishAt = localDt.toISOString(); // always UTC
    setScheduling(true);
    setScheduleResult(null);
    try {
      const res  = await fetch(`${baseUrl}/api/admin/surveys/${surveyShortId}/linkedin-schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_at: publishAt, commentary: copy.commentary, title: copy.title, description: copy.description }),
      });
      const data = await res.json();
      setScheduleResult({ success: data.success, message: data.message || data.error });
      if (data.success) { fetchScheduled(); setScheduleDate(''); setScheduleTime(''); }
    } catch {
      setScheduleResult({ success: false, message: 'Network error.' });
    } finally {
      setScheduling(false);
    }
  };

  const cancelScheduled = async (scheduleId: string) => {
    try {
      await fetch(`${baseUrl}/api/admin/linkedin-schedule/${scheduleId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
      });
      fetchScheduled();
    } catch { /* silent */ }
  };

  // ── Connect LinkedIn (redirect) ────────────────────────────────────────────
  const connectLinkedIn = () => {
    const t = token();
    let userId = '';
    try {
      // JWT payload is the second segment, base64url-encoded
      const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      userId = payload.user_id || payload.sub || payload.id || '';
    } catch { /* ignore decode errors */ }
    const baseUrl = getApiBaseUrl();
    window.location.href = `${baseUrl}/auth/linkedin?user_id=${encodeURIComponent(userId)}`;
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!copy.commentary.trim()) {
      setResult({ success: false, message: 'Commentary is required.' });
      return;
    }
    if (!copy.title.trim()) {
      setResult({ success: false, message: 'Post title is required.' });
      return;
    }

    setPublishing(true);
    setResult(null);

    try {
      const res  = await fetch(
        `${baseUrl}/api/admin/surveys/${surveyShortId}/publish-to-linkedin`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentary:  copy.commentary,
            title:       copy.title,
            description: copy.description,
          }),
        },
      );
      const data = await res.json();

      if (data.auth_required) {
        connectLinkedIn();
        return;
      }

      if (data.success) {
        setResult({ success: true, message: data.message, postUrl: data.post_url });
        onPublished(data.post_urn, data.post_url);
      } else {
        setResult({ success: false, message: data.error || 'Publishing failed.' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const C = {
    overlay: {
      position: 'fixed' as const, inset: 0,
      background: 'rgba(10,15,30,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    modal: {
      background: '#FAFBFD', borderRadius: 18,
      width: '100%', maxWidth: 860, maxHeight: '92vh', height: '80vh',
      display: 'flex', flexDirection: 'column' as const,
      boxShadow: '0 24px 80px rgba(10,15,30,0.30)', border: '1px solid #E2E8F0',
      overflow: 'hidden', fontFamily: "'Outfit', -apple-system, sans-serif",
    },
    header: {
      padding: '16px 24px', borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #0A1628 0%, #0E1E38 100%)',
    },
    body: {
      flex: '1 1 0', display: 'flex', overflow: 'hidden', minHeight: 300,
    },
    panel: {
      flex: '1 1 0', overflowY: 'auto' as const, padding: '22px 24px',
      display: 'flex', flexDirection: 'column' as const, gap: 16,
      scrollbarWidth: 'none' as const,
    },
    divider: { width: 1, background: '#E2E8F0', flexShrink: 0 },
    footer: {
      padding: '14px 24px', borderTop: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
      background: '#F8FAFC', flexShrink: 0,
    },
    label: { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 5, display: 'block' },
    input: {
      width: '100%', border: '1px solid #E2E8F0', borderRadius: 9, padding: '9px 12px',
      fontSize: 13, color: '#1E293B', background: '#FFFFFF', fontFamily: 'inherit',
      outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
    },
    textarea: {
      width: '100%', border: '1px solid #E2E8F0', borderRadius: 9, padding: '9px 12px',
      fontSize: 13, color: '#1E293B', background: '#FFFFFF', fontFamily: 'inherit',
      outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const,
      minHeight: 110, lineHeight: 1.6,
    },
    charHint: { fontSize: 10, color: '#94A3B8', textAlign: 'right' as const, marginTop: 3 },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={C.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={C.modal}>

        {/* ── Header ── */}
        <div style={C.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: LI_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Linkedin size={20} color="#fff" fill="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
                {existingPostUrn ? 'Re-publish to LinkedIn' : 'Publish to LinkedIn'}
              </p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                {surveyTitle} · {sourceType}
              </p>
            </div>
            {existingPostUrn && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1E3A5F', border: '1px solid #2D5A8E', borderRadius: 8, padding: '3px 10px', marginLeft: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: '#7DD3FC', fontWeight: 600 }}>Already posted</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={14} color="#94A3B8" />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={C.body}>

          {/* LEFT — Post copy editor */}
          <div style={{ ...C.panel, maxWidth: 480 }}>

            {/* Account status */}
            {accountLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F1F5F9', borderRadius: 10 }}>
                <Loader size={14} color="#64748B" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: '#64748B' }}>Checking LinkedIn connection…</span>
              </div>
            ) : account?.connected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#EFF8FF', border: '1px solid #BAE6FD', borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: LI_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={15} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', margin: 0 }}>{account.name}</p>
                  <p style={{ fontSize: 10, color: '#64748B', margin: 0 }}>LinkedIn connected</p>
                </div>
                <button
                  onClick={disconnectLinkedIn}
                  title="Disconnect"
                  style={{ background: 'none', border: '1px solid #BAE6FD', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748B' }}
                >
                  <Unlink size={10} /> Disconnect
                </button>
              </div>
            ) : (
              <div style={{ padding: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, textAlign: 'center' }}>
                <Linkedin size={28} color={LI_BLUE} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: '0 0 6px' }}>Connect your LinkedIn account</p>
                <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 14px' }}>You need to connect LinkedIn once to post surveys from Pepperwahl.</p>
                <button
                  onClick={connectLinkedIn}
                  style={{
                    background: LI_BLUE, color: '#fff', border: 'none', borderRadius: 9,
                    padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7,
                  }}
                >
                  <Linkedin size={14} fill="#fff" /> Connect LinkedIn
                </button>
              </div>
            )}

            {/* Copy fields — only show when connected */}
            {account?.connected && (
              <>
                {/* Commentary */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label style={C.label}>Post commentary</label>
                    <button
                      onClick={() => generateCopy(true)}
                      disabled={copyLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: copyLoading ? '#E2E8F0' : `linear-gradient(135deg, ${LI_BLUE}, ${LI_BLUE_D})`,
                        color: copyLoading ? '#94A3B8' : '#fff', border: 'none', borderRadius: 7,
                        padding: '4px 10px', fontSize: 10, fontWeight: 700,
                        cursor: copyLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {copyLoading
                        ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                        : <><Sparkles size={10} /> Regenerate</>
                      }
                    </button>
                  </div>
                  <textarea
                    style={C.textarea}
                    placeholder="Write your LinkedIn post here… (shown as the main post text)"
                    value={copy.commentary}
                    onChange={e => setCopy(p => ({ ...p, commentary: e.target.value }))}
                  />
                  <p style={C.charHint}>{copy.commentary.length} / 2500 chars</p>
                </div>

                {/* Article title */}
                <div>
                  <label style={C.label}>Article card title <span style={{ color: '#94A3B8', fontWeight: 400, textTransform: 'none' }}>· max 70 chars</span></label>
                  <input
                    style={C.input}
                    placeholder="Compelling title shown on the link card…"
                    value={copy.title}
                    maxLength={70}
                    onChange={e => setCopy(p => ({ ...p, title: e.target.value }))}
                  />
                  <p style={C.charHint}>{copy.title.length} / 70</p>
                </div>

                {/* Article description */}
                <div>
                  <label style={C.label}>Article card description <span style={{ color: '#94A3B8', fontWeight: 400, textTransform: 'none' }}>· max 120 chars</span></label>
                  <input
                    style={C.input}
                    placeholder="One-line description shown under the title…"
                    value={copy.description}
                    maxLength={120}
                    onChange={e => setCopy(p => ({ ...p, description: e.target.value }))}
                  />
                  <p style={C.charHint}>{copy.description.length} / 120</p>
                </div>

                {/* Advanced: audience */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#64748B', fontFamily: 'inherit', padding: 0 }}
                  >
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Advanced options
                  </button>
                  {showAdvanced && (
                    <div style={{ marginTop: 10 }}>
                      <label style={C.label}>Target audience (improves AI copy)</label>
                      <input
                        style={C.input}
                        placeholder="e.g. marketing professionals, HR managers…"
                        value={audience}
                        onChange={e => setAudience(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Result message */}
            {result && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                background: result.success ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${result.success ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: 10,
              }}>
                {result.success
                  ? <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: result.success ? '#15803D' : '#DC2626', margin: 0, fontWeight: 600 }}>
                    {result.message}
                  </p>
                  {result.postUrl && (
                    <a
                      href={result.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: LI_BLUE, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                    >
                      <ExternalLink size={10} /> View on LinkedIn
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={C.divider} />

          {/* RIGHT — Image preview */}
          <div style={{ ...C.panel, minWidth: 280, maxWidth: 340 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: '0 0 4px' }}>Image preview</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                A 1200×627 card is auto-generated and attached to your post as the article thumbnail.
              </p>
            </div>

            {/* Image preview box */}
            <div style={{
              width: '100%', position: 'relative', paddingTop: '52.25%',
              background: '#0A0F1E', borderRadius: 12, overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imageLoading ? (
                  <div style={{ textAlign: 'center', color: '#64748B' }}>
                    <Loader size={22} color="#64748B" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                    <p style={{ fontSize: 11, margin: 0 }}>Generating image…</p>
                  </div>
                ) : imageDataUrl ? (
                  <img src={imageDataUrl} alt="LinkedIn post card" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#334155' }}>
                    <ImageIcon size={28} color="#475569" style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: 11, margin: 0, color: '#94A3B8' }}>Click "Preview image" to generate</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={imageLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: imageLoading ? '#E2E8F0' : '#F1F5F9',
                color: imageLoading ? '#94A3B8' : '#475569',
                border: '1px solid #E2E8F0', borderRadius: 9,
                padding: '9px 0', fontSize: 12, fontWeight: 600,
                cursor: imageLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', width: '100%',
              }}
            >
              {imageLoading
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><ImageIcon size={13} /> {imageDataUrl ? 'Regenerate image' : 'Preview image'}</>
              }
            </button>

            {/* Survey link info */}
            <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Link2 size={11} color="#64748B" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Survey link</span>
              </div>
              <p style={{ fontSize: 11, color: '#475569', margin: 0, wordBreak: 'break-all' }}>
                survey.pepperwahl.com/survey/{surveyShortId}
                {sourceType === 'funnel' ? `?f=${surveyShortId}` : ''}
              </p>
            </div>

            {/* Tips */}
            <div style={{ padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>Tips</p>
              <ul style={{ fontSize: 10, color: '#78350F', margin: 0, paddingLeft: 16, lineHeight: 1.7 }}>
                <li>Hook must appear in the first 200 chars of commentary</li>
                <li>LinkedIn limits ~100 API calls/day per member</li>
                <li>Each publish uses 3–4 API calls</li>
                <li>Tokens expire in 60 days — auto-refreshed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ ...C.footer, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>

          {/* Scheduled items list */}
          {scheduledItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Scheduled</p>
              {scheduledItems.map(it => (
                <div key={it._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF8FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '6px 10px' }}>
                  <span style={{ fontSize: 11, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} /> {new Date(it.publish_at).toLocaleString()}
                  </span>
                  <button onClick={() => cancelScheduled(it._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2 }} title="Cancel">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Schedule toggle */}
          {account?.connected && !result?.success && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => { setScheduleMode(v => !v); setScheduleResult(null); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: scheduleMode ? '#EFF8FF' : '#F8FAFC', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: scheduleMode ? '#0369A1' : '#475569' }}>
                  <Calendar size={13} /> Schedule for later
                </span>
                {scheduleMode ? <ChevronUp size={13} color="#64748B" /> : <ChevronDown size={13} color="#64748B" />}
              </button>

              {scheduleMode && (
                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Date</label>
                      <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 7, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Time (local)</label>
                      <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 7, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const }} />
                    </div>
                  </div>
                  {scheduleResult && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: scheduleResult.success ? '#15803D' : '#DC2626' }}>
                      {scheduleResult.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      {scheduleResult.message}
                    </div>
                  )}
                  <button onClick={handleSchedule} disabled={scheduling || !scheduleDate || !scheduleTime}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: scheduling ? '#E2E8F0' : LI_BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: scheduling ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {scheduling ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Scheduling…</> : <><Calendar size={12} /> Confirm Schedule</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Immediate publish / cancel row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 9, padding: '9px 18px', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            {account?.connected && !result?.success && !scheduleMode && (
              <button onClick={handlePublish} disabled={publishing || !copy.commentary.trim() || !copy.title.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: publishing || !copy.commentary.trim() || !copy.title.trim() ? '#CBD5E1' : `linear-gradient(135deg, ${LI_BLUE} 0%, ${LI_BLUE_D} 100%)`,
                  color: '#fff', border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: 13, fontWeight: 700,
                  cursor: publishing || !copy.commentary.trim() || !copy.title.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', boxShadow: publishing ? 'none' : '0 2px 8px rgba(10,102,194,0.35)',
                }}>
                {publishing ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</> : <><Send size={14} /> Publish to LinkedIn</>}
              </button>
            )}
            {result?.success && (
              <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#16A34A', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <CheckCircle size={14} /> Done
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PublishToLinkedInModal;
