import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OptimizedLoader from './OptimizedLoader';
import TemplateSelector from './TemplateSelector';
import type { Survey, Question, AnimationConfig } from '../types/Survey';
import { generateSurveyLink, type SurveyLinkParams } from '../utils/surveyLinkUtils';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Save, ArrowLeft, Grid3X3, Copy, CheckCircle, Settings, ExternalLink, Share2, Trash2, X, ChevronUp, ChevronDown, Zap, Sparkles, RefreshCw, GitBranch, Mail, Send, Loader2, CornerDownLeft } from 'lucide-react';
import { LOGO_BASE64 } from '../utils/logoBase64';
import './SurveyEditor.css';
import { BranchFlowEditor, SimpleBranchingRules } from './branching';

// ── Branching summary for a single question ──────────────────────────────────
interface QuestionBranchInfo {
  hasRedirect: boolean;
  hasEndHere: boolean;
  hasCondition: boolean;   // show_if (conditional display)
}
type BranchMap = Record<string, QuestionBranchInfo>; // keyed by question id

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☰' },
  { value: 'short_answer', label: 'Short Answer', icon: '✎' },
  { value: 'yes_no', label: 'Yes / No', icon: '◑' },
  { value: 'rating', label: 'Rating', icon: '★' },
  { value: 'range', label: 'Scale', icon: '⊞' },
];

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const QUESTION_ANIMATIONS = [
  { value: 'fadeSlideUp', label: 'Fade & Slide Up', icon: '↑', desc: 'Smooth upward entrance' },
  { value: 'typewriter', label: 'Typewriter', icon: '⌨', desc: 'Text types letter by letter' },
  { value: 'flipIn', label: 'Flip In', icon: '🔄', desc: '3D flip rotation' },
  { value: 'zoomBounce', label: 'Zoom Bounce', icon: '💥', desc: 'Zoom in with bounce' },
  { value: 'slideFromLeft', label: 'Slide from Left', icon: '←', desc: 'Slides in from left' },
  { value: 'blurReveal', label: 'Blur Reveal', icon: '✨', desc: 'Blurs in from nothing' },
] as const;

const ANSWER_ANIMATIONS = [
  { value: 'fadeIn', label: 'Fade In', icon: '◐', desc: 'Simple fade appearance' },
  { value: 'popScale', label: 'Pop Scale', icon: '🫧', desc: 'Pops in with scale' },
  { value: 'slideUp', label: 'Slide Up', icon: '⬆', desc: 'Slides up into place' },
  { value: 'staggerFade', label: 'Stagger Fade', icon: '▦', desc: 'Options appear one by one' },
  { value: 'elastic', label: 'Elastic', icon: '🪀', desc: 'Springy elastic entrance' },
  { value: 'glowReveal', label: 'Glow Reveal', icon: '💡', desc: 'Glows in with highlight' },
] as const;

const DEFAULT_ANIMATION: AnimationConfig = {
  questionAnimation: 'fadeSlideUp',
  answerAnimation: 'fadeIn',
  delayMs: 100,
  speedMs: 400,
  autoAdvance: false,
  autoAdvanceDelay: 1500,
};

// Theme colors per template — applied to the center editor panel
interface EditorTheme {
  bg: string;         // center panel background
  paper: string;      // paper card background
  paperInner: string; // option boxes / inner elements
  border: string;     // borders
  accent: string;     // badge, links, focus
  accentShadow: string;
  pin: string;        // pin color
  text: string;       // primary text
  textLight: string;  // secondary text
  dashed: string;     // dashed underline on question
}

const TEMPLATE_THEMES: Record<string, EditorTheme> = {
  custom: {
    bg: '#ffffff', paper: '#F5F1E8', paperInner: '#FDFCFA', border: '#EBE8E3',
    accent: '#C4785C', accentShadow: 'rgba(196,120,92,0.25)', pin: '#2D2520',
    text: '#2D2520', textLight: '#9B9189', dashed: 'rgba(196,120,92,0.3)',
  },
  customer_feedback: {
    bg: '#F0F7F7', paper: '#E6F2F0', paperInner: '#F5FAF9', border: '#C8DDD9',
    accent: '#0D9488', accentShadow: 'rgba(13,148,136,0.25)', pin: '#2D2520',
    text: '#1A3A36', textLight: '#6B8F8A', dashed: 'rgba(13,148,136,0.3)',
  },
  employee_checkin: {
    bg: '#F5F3FF', paper: '#EDE9FE', paperInner: '#F8F7FF', border: '#D4CCF0',
    accent: '#7C3AED', accentShadow: 'rgba(124,58,237,0.25)', pin: '#2D2520',
    text: '#2E1A5E', textLight: '#8B7AAF', dashed: 'rgba(124,58,237,0.3)',
  },
  event_feedback: {
    bg: '#FFF7ED', paper: '#FEF0E0', paperInner: '#FFFAF5', border: '#F0D9BE',
    accent: '#EA580C', accentShadow: 'rgba(234,88,12,0.25)', pin: '#2D2520',
    text: '#431407', textLight: '#A0764E', dashed: 'rgba(234,88,12,0.3)',
  },
  product_feedback: {
    bg: '#EFF6FF', paper: '#DBEAFE', paperInner: '#F0F7FF', border: '#BFDBFE',
    accent: '#2563EB', accentShadow: 'rgba(37,99,235,0.25)', pin: '#2D2520',
    text: '#1E3A5F', textLight: '#6B8DB5', dashed: 'rgba(37,99,235,0.3)',
  },
  team_collaboration: {
    bg: '#FEFCE8', paper: '#FEF9C3', paperInner: '#FFFDE8', border: '#E5DFA0',
    accent: '#CA8A04', accentShadow: 'rgba(202,138,4,0.25)', pin: '#2D2520',
    text: '#3D3510', textLight: '#92860E', dashed: 'rgba(202,138,4,0.3)',
  },
  onboarding_review: {
    bg: '#FDF2F8', paper: '#FCE7F3', paperInner: '#FFF5FA', border: '#F0C6DB',
    accent: '#DB2777', accentShadow: 'rgba(219,39,119,0.25)', pin: '#2D2520',
    text: '#4A0D2E', textLight: '#A85A82', dashed: 'rgba(219,39,119,0.3)',
  },
  website_experience: {
    bg: '#F0FDF4', paper: '#DCFCE7', paperInner: '#F5FFF8', border: '#BBF7D0',
    accent: '#16A34A', accentShadow: 'rgba(22,163,74,0.25)', pin: '#2D2520',
    text: '#14532D', textLight: '#5E9B72', dashed: 'rgba(22,163,74,0.3)',
  },
  training_feedback: {
    bg: '#FFF1F2', paper: '#FFE4E6', paperInner: '#FFF8F8', border: '#FECDD3',
    accent: '#E11D48', accentShadow: 'rgba(225,29,72,0.25)', pin: '#2D2520',
    text: '#4C0519', textLight: '#A8546A', dashed: 'rgba(225,29,72,0.3)',
  },
  service_cancellation: {
    bg: '#F8FAFC', paper: '#F1F5F9', paperInner: '#F8FAFC', border: '#CBD5E1',
    accent: '#475569', accentShadow: 'rgba(71,85,105,0.25)', pin: '#2D2520',
    text: '#1E293B', textLight: '#94A3B8', dashed: 'rgba(71,85,105,0.3)',
  },
};

const getTheme = (templateType: string): EditorTheme =>
  TEMPLATE_THEMES[templateType] || TEMPLATE_THEMES.custom;

// ── Standalone Mail Invite Tab (stable component identity = no remount flicker) ──
interface MailInviteTabProps {
  surveyId: string | undefined;
  surveyTitle: string;
  senderName: string;
  shareLink: string;
  apiBaseUrl: string;
}
const MailInviteTab: React.FC<MailInviteTabProps> = ({ surveyId, surveyTitle, senderName, shareLink, apiBaseUrl }) => {
  const [mailTemplate, setMailTemplate] = useState<'minimal' | 'bold'>('minimal');
  const [mailEmails, setMailEmails] = useState('');
  const [mailMessage, setMailMessage] = useState('');
  const [mailSending, setMailSending] = useState(false);
  const [mailResult, setMailResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const previewLink = shareLink || '#';
  const logoUrl = LOGO_BASE64;

  const buildHtml = (tmpl: 'minimal' | 'bold', msg: string) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const title = esc(surveyTitle);

    // Variant colours — both paperish, just different accent tones
    const accentColor  = tmpl === 'bold' ? '#2C3E50' : '#C4785C';
    const headerBg     = tmpl === 'bold' ? '#2C3E50' : '#3D2B1F';
    const ctaBg        = tmpl === 'bold' ? '#2C3E50' : '#C4785C';
    const cardBorder   = tmpl === 'bold' ? '#CBD5E1' : '#E8DDD5';
    const cardBg       = tmpl === 'bold' ? '#F8FAFC' : '#FBF8F5';

    const msgBlock = msg.trim()
      ? `<tr><td style="padding:0 44px 28px;">
          <div style="border-left:3px solid ${accentColor};padding:12px 18px;background:#FAFAFA;">
            <p style="margin:0;font-size:14px;color:#555;line-height:1.8;font-style:italic;">${esc(msg)}</p>
          </div>
        </td></tr>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Survey Invitation</title>
</head>
<body style="margin:0;padding:0;background:#EFEFEC;font-family:Georgia,'Times New Roman',serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEFEC;padding:40px 20px;">
<tr><td align="center">

<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#FFFFFF;border:1px solid #DDD8D2;">

  <!-- Header bar -->
  <tr>
    <td style="background:${headerBg};padding:28px 44px;border-bottom:3px solid ${accentColor};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <img src="${logoUrl}" alt="Pepperwahl" width="36" height="36"
                 style="display:inline-block;vertical-align:middle;border-radius:4px;margin-right:10px;" />
            <span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;vertical-align:middle;letter-spacing:0.5px;">Pepperwahl</span>
          </td>
          <td align="right">
            <span style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:1px;text-transform:uppercase;">Survey Invitation</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:44px 44px 20px;">
      <p style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1A1A1A;line-height:1.3;font-family:Georgia,serif;">
        We'd love to hear<br/>your thoughts.
      </p>
      <p style="margin:0;font-size:15px;color:#666;line-height:1.8;font-family:Arial,sans-serif;">
        Your feedback matters. A few minutes of your time helps us build something genuinely better for everyone.
      </p>
    </td>
  </tr>

  ${msgBlock}

  <!-- Survey card -->
  <tr>
    <td style="padding:12px 44px 32px;">
      <div style="border:1px solid ${cardBorder};background:${cardBg};padding:28px 32px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${accentColor};font-family:Arial,sans-serif;">Survey</p>
        <p style="margin:0 0 12px;font-size:19px;font-weight:700;color:#1A1A1A;line-height:1.4;font-family:Georgia,serif;">${title}</p>
        <p style="margin:0;font-size:13px;color:#888;font-family:Arial,sans-serif;">Takes approximately 2 minutes to complete.</p>
      </div>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 44px 36px;">
      <a href="${previewLink}"
         style="display:inline-block;background:${ctaBg};color:#FFFFFF;text-decoration:none;
                font-size:14px;font-weight:700;padding:14px 36px;
                font-family:Arial,sans-serif;letter-spacing:0.5px;">
        Take the Survey
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#AAA;font-family:Arial,sans-serif;">
        Or copy this link: <a href="${previewLink}" style="color:${accentColor};text-decoration:none;">${previewLink}</a>
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:0 44px;"><div style="height:1px;background:#E8E4DF;"></div></td></tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 44px;">
      <p style="margin:0 0 4px;font-size:12px;color:#999;font-family:Arial,sans-serif;line-height:1.7;">
        This invitation was sent via <strong style="color:#555;">Pepperwahl</strong>.
        Thank you for taking the time.
      </p>
      <p style="margin:0;font-size:11px;color:#BBB;font-family:Arial,sans-serif;">
        Team Pepperwahl &nbsp;&middot;&nbsp; pepperwahl.com
      </p>
    </td>
  </tr>

</table>

</td></tr>
</table>

</body>
</html>`;
  };

  return (
    <div style={{ display: 'flex', minHeight: 480 }}>
      {/* Left: Controls */}
      <div style={{ flex: '0 0 300px', padding: '20px 20px 20px 24px', borderRight: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Template toggle */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['minimal', 'bold'] as const).map(t => (
              <button key={t} onClick={() => setMailTemplate(t)}
                style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `2px solid ${mailTemplate === t ? '#ef4444' : '#e5e7eb'}`, background: mailTemplate === t ? '#fff5f5' : '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: mailTemplate === t ? '#ef4444' : '#6b7280', transition: 'all 0.15s' }}
              >{t === 'minimal' ? 'Warm Paper' : 'Dark Slate'}</button>
            ))}
          </div>
        </div>
        {/* Recipients */}
        <div>
          {(() => {
            // Extract all valid emails using regex — works regardless of separator
            const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
            const parsed = mailEmails.match(emailRegex) || [];
            const count = parsed.length;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#374151' }}>
                    Recipients <span style={{ color: '#9ca3af', fontWeight: 400 }}>(any format — commas, spaces, newlines, or no separator)</span>
                  </p>
                  {count > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: 20, border: '1px solid #bbf7d0' }}>
                      {count} detected
                    </span>
                  )}
                </div>
                <textarea value={mailEmails}
                  onChange={e => setMailEmails(e.target.value)}
                  onBlur={e => {
                    // On blur: extract all emails and reformat one per line
                    const emails = e.target.value.match(emailRegex) || [];
                    if (emails.length > 0) setMailEmails(emails.join('\n'));
                  }}
                  placeholder={"Paste in any format:\nalice@x.com bob@x.combob@y.comalice@z.com"}
                  rows={4}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#374151', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </>
            );
          })()}
        </div>
        {/* Personal message */}
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#374151' }}>Personal Message <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — live in preview →)</span></p>
          <textarea value={mailMessage} onChange={e => setMailMessage(e.target.value)}
            placeholder="Type here... it shows as a quote in the email"
            rows={3}
            style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#374151', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
        {/* Result */}
        {mailResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: mailResult.type === 'success' ? '#f0fdf4' : '#fff5f5', color: mailResult.type === 'success' ? '#15803d' : '#dc2626', border: `1px solid ${mailResult.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            {mailResult.type === 'success' ? <CheckCircle size={13} /> : <X size={13} />}
            {mailResult.text}
          </div>
        )}

        {/* Send button — uses Gmail API if Google token available, else mailto fallback */}
        <button disabled={mailSending || !mailEmails.trim()}
          onClick={async () => {
            const rawEmails = mailEmails.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
            if (!rawEmails.length) return;
            setMailSending(true);
            setMailResult(null);

            const googleToken = localStorage.getItem('google_access_token');

            if (googleToken) {
              // ── Gmail API path: send rich HTML from user's own Gmail ──
              const html = buildHtml(mailTemplate, mailMessage);
              const subject = `You've been invited to take a survey: ${surveyTitle}`;
              let sent = 0, failed = 0;

              for (const email of rawEmails) {
                // Build RFC 2822 message
                const mime = [
                  `To: ${email}`,
                  `Subject: ${subject}`,
                  `MIME-Version: 1.0`,
                  `Content-Type: text/html; charset=UTF-8`,
                  ``,
                  html,
                ].join('\r\n');

                const encoded = btoa(unescape(encodeURIComponent(mime)))
                  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                try {
                  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${googleToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ raw: encoded }),
                  });
                  if (res.ok) sent++;
                  else {
                    const err = await res.json().catch(() => ({}));
                    // Token may have expired — fall through to mailto
                    if (res.status === 401) {
                      localStorage.removeItem('google_access_token');
                      setMailResult({ type: 'error', text: 'Gmail session expired. Please sign out and sign in with Google again, then retry.' });
                      setMailSending(false);
                      return;
                    }
                    if (res.status === 403) {
                      setMailResult({ type: 'error', text: 'Gmail permission denied. Sign out, sign back in with Google, and grant Gmail access when prompted.' });
                      setMailSending(false);
                      return;
                    }
                    console.error('Gmail send error:', err);
                    failed++;
                  }
                } catch { failed++; }
              }

              setMailResult({
                type: sent > 0 ? 'success' : 'error',
                text: sent > 0
                  ? `✓ Sent from your Gmail to ${sent} recipient${sent > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`
                  : 'Failed to send. Try signing out and back in with Google.',
              });
              if (sent > 0) { setMailEmails(''); setMailMessage(''); }

            } else {
              // ── Fallback: backend SMTP for non-Google users ──
              // Same HTML template, sent from our server on their behalf
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 15000);
              try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`${apiBaseUrl}/api/surveys/${surveyId}/send-invite`, {
                  method: 'POST',
                  signal: controller.signal,
                  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify({ emails: rawEmails, template: mailTemplate, message: mailMessage, survey_link: shareLink }),
                });
                clearTimeout(timer);
                const data = await res.json();
                if (res.ok && data.success) {
                  setMailResult({ type: 'success', text: data.message });
                  setMailEmails(''); setMailMessage('');
                } else {
                  setMailResult({ type: 'error', text: data.error || 'Failed to send' });
                }
              } catch (err: any) {
                clearTimeout(timer);
                if (err?.name === 'AbortError') {
                  setMailResult({ type: 'error', text: 'Request timed out. Backend may be unavailable.' });
                } else {
                  setMailResult({ type: 'error', text: `Network error: ${err?.message || 'Could not reach server'}` });
                }
              }
            }

            setMailSending(false);
          }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: mailSending || !mailEmails.trim() ? '#d1d5db' : '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: mailSending || !mailEmails.trim() ? 'not-allowed' : 'pointer' }}
        >
          {mailSending
            ? <><Loader2 size={13} className="animate-spin" /> Sending...</>
            : localStorage.getItem('google_access_token')
              ? <><Send size={13} /> Send via My Gmail</>
              : <><Send size={13} /> Send Invites</>
          }
        </button>

        <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
          {localStorage.getItem('google_access_token')
            ? '✓ Signed in with Google — sends HTML email directly from your account'
            : 'Opens Gmail compose pre-filled in a new tab. Sign in with Google for silent direct sending.'}
        </p>
      </div>

      {/* Right: Live iframe preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#EFEFEC', minWidth: 0 }}>
        <div style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 8, fontSize: 10, color: '#9B9189', fontFamily: 'monospace' }}>Email Preview (live)</span>
        </div>
        <iframe
          srcDoc={buildHtml(mailTemplate, mailMessage)}
          style={{ flex: 1, border: 'none', width: '100%', minHeight: 420 }}
          sandbox="allow-same-origin"
          title="Email Preview"
        />
      </div>
    </div>
  );
};

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [urlParams] = useState<SurveyLinkParams>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showBranchingEditor, setShowBranchingEditor] = useState(false);
  const [branchingViewMode, setBranchingViewMode] = useState<'simple' | 'flow'>('simple');
  const [flowRefreshKey, setFlowRefreshKey] = useState(0);
  const [branchMap, setBranchMap] = useState<BranchMap>({});
  const [mobilePanel, setMobilePanel] = useState<'questions' | 'editor' | 'settings'>('editor');
  // When opening branching modal, optionally scroll/focus to a specific question row
  const [branchFocusQuestionId, setBranchFocusQuestionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openBranching') === '1') {
      setShowBranchingEditor(true);
      setBranchingViewMode('simple');
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [shareLinkRevealed, setShareLinkRevealed] = useState(false);
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);

  // Mail invite state
  const [shareTab, setShareTab] = useState<'link' | 'mail'>('link');
  const [mailResult, setMailResult] = useState<{type: 'success'|'error'; text: string} | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);

  // ── AI Editor Assistant ──────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showAiBox, setShowAiBox] = useState(false);
  const [aiHistory, setAiHistory] = useState<Array<{
    prompt: string;
    result: string;
    status: 'success' | 'error' | 'info';
    timestamp: Date;
  }>>([]);
  const aiHistoryEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll AI history to bottom when new entry added — must be AFTER aiHistory is declared
  useEffect(() => {
    if (aiHistoryEndRef.current) {
      aiHistoryEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiHistory]);

  // Collaborator state
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorLookup, setCollaboratorLookup] = useState<{id: string; name: string; email: string} | null>(null);
  const [collaboratorLookupError, setCollaboratorLookupError] = useState('');
  const [collaboratorLookupLoading, setCollaboratorLookupLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<{id: string; name: string; email: string}[]>([]);
  const [collaboratorAdding, setCollaboratorAdding] = useState(false);

  const animConfig = survey?.animation || DEFAULT_ANIMATION;
  const updateAnimation = (field: keyof AnimationConfig, value: AnimationConfig[keyof AnimationConfig]) => {
    if (!survey) return;
    setSurvey({ ...survey, animation: { ...animConfig, [field]: value } });
  };

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://surevy-pepperwahl.onrender.com';

  const shareLink = id
    ? generateSurveyLink(id, user?.simpleUserId?.toString(), urlParams, user?.name || user?.email?.split('@')[0] || `user_${user?.simpleUserId}`)
    : '';

  useEffect(() => {
    if (!id) return;
    const fetchSurvey = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBaseUrl}/survey/${id}/view`);
        if (!res.ok) throw new Error(`Failed to fetch survey: ${res.status}`);
        const data = await res.json();
        const surveyData = data.survey || data;
        if (!surveyData || !surveyData.questions) throw new Error('Invalid survey data received');
        setSurvey(surveyData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load survey';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSurvey();
  }, [id, apiBaseUrl]);

  // ── Fetch branching rules in background to build indicator map ──────────────
  const fetchBranchMap = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/surveys/${id}/branching-rules`);
      if (!res.ok) return;
      const data = await res.json();
      const map: BranchMap = {};
      for (const rule of (data.rules || [])) {
        map[rule.id] = {
          hasRedirect: !!rule.redirect_enabled,
          hasEndHere: !!rule.end_here_enabled,
          hasCondition: !rule.always_show && !!rule.depends_on,
        };
      }
      setBranchMap(map);
    } catch {
      // silent — indicators are a nice-to-have, don't break the editor
    }
  }, [id, apiBaseUrl]);

  useEffect(() => {
    fetchBranchMap();
  }, [fetchBranchMap]);

  // Load collaborators when settings modal opens
  const openSettings = useCallback(async () => {
    setShowSettings(true);
    setCollaboratorEmail('');
    setCollaboratorLookup(null);
    setCollaboratorLookupError('');
    if (!id) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${apiBaseUrl}/api/surveys/${id}/collaborators`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators || []);
      }
    } catch { /* silent */ }
  }, [id, apiBaseUrl]);

  // Look up a user by email
  const handleLookupEmail = useCallback(async () => {
    const email = collaboratorEmail.trim().toLowerCase();
    if (!email) return;
    setCollaboratorLookupLoading(true);
    setCollaboratorLookup(null);
    setCollaboratorLookupError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${apiBaseUrl}/api/surveys/user-lookup?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        setCollaboratorLookupError(data.message || 'No account found with that email');
      } else if (data.user.id === user?.id) {
        setCollaboratorLookupError("That's your own account");
      } else if (collaborators.some(c => c.id === data.user.id)) {
        setCollaboratorLookupError('Already added as a collaborator');
      } else {
        setCollaboratorLookup(data.user);
      }
    } catch {
      setCollaboratorLookupError('Lookup failed, please try again');
    } finally {
      setCollaboratorLookupLoading(false);
    }
  }, [collaboratorEmail, apiBaseUrl, collaborators, user?.id]);

  // Add the looked-up user as a collaborator
  const handleAddCollaborator = useCallback(async () => {
    if (!collaboratorLookup || !id) return;
    setCollaboratorAdding(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${apiBaseUrl}/api/surveys/${id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: collaboratorLookup.id }),
      });
      if (res.ok) {
        setCollaborators(prev => [...prev, collaboratorLookup]);
        setCollaboratorLookup(null);
        setCollaboratorEmail('');
      } else {
        const data = await res.json();
        setCollaboratorLookupError(data.error || 'Failed to add collaborator');
      }
    } catch {
      setCollaboratorLookupError('Failed to add collaborator');
    } finally {
      setCollaboratorAdding(false);
    }
  }, [collaboratorLookup, id, apiBaseUrl]);

  // Remove a collaborator
  const handleRemoveCollaborator = useCallback(async (collaboratorId: string) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${apiBaseUrl}/api/surveys/${id}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
    } catch { /* silent */ }
  }, [id, apiBaseUrl]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch(`${apiBaseUrl}/survey/${survey.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });
      if (!res.ok) throw new Error(`Failed to save survey: ${res.status}`);
      setSaveStatus('saved');
      setSaveMessage('Saved!');
      setTimeout(() => { setSaveStatus('idle'); setSaveMessage(''); }, 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      const message = err instanceof Error ? err.message : 'Save failed';
      setSaveMessage(message);
      setTimeout(() => { setSaveStatus('idle'); setSaveMessage(''); }, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [survey, apiBaseUrl]);

  const addNewQuestion = useCallback(() => {
    if (!survey) return;
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      question: 'New Question',
      type: 'short_answer',
      required: false,
    };
    const updated = { ...survey, questions: [...survey.questions, newQuestion] };
    setSurvey(updated);
    setActiveQuestionIndex(updated.questions.length - 1);
  }, [survey]);

  const copyToClipboard = async () => {
    try {
      const shareText = `Hey! Take this quick 2-minute survey 👉 ${shareLink}`;
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = `Hey! Take this quick 2-minute survey 👉 ${shareLink}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    updated.questions[index] = { ...updated.questions[index], [field]: value };
    setSurvey(updated);
  };

  const updateQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[qIndex] };
    q.options = [...(q.options || [])];
    q.options[optIndex] = value;
    updated.questions[qIndex] = q;
    setSurvey(updated);
  };

  const addOption = (qIndex: number) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[qIndex] };
    q.options = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
    updated.questions[qIndex] = q;
    setSurvey(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[qIndex] };
    q.options = [...(q.options || [])];
    q.options.splice(optIndex, 1);
    updated.questions[qIndex] = q;
    setSurvey(updated);
  };

  const deleteQuestion = (index: number) => {
    if (!survey || survey.questions.length <= 1) return;
    const updated = { ...survey };
    updated.questions = updated.questions.filter((_, i) => i !== index);
    setSurvey(updated);
    if (activeQuestionIndex >= updated.questions.length) {
      setActiveQuestionIndex(Math.max(0, updated.questions.length - 1));
    }
  };

  const changeQuestionType = (index: number, newType: string) => {
    if (!survey) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    const q = { ...updated.questions[index], type: newType as Question['type'] };
    if (newType === 'yes_no') {
      q.options = ['Yes', 'No'];
    } else if ((newType === 'multiple_choice' || newType === 'radio') && (!q.options || q.options.length === 0)) {
      q.options = ['Option 1', 'Option 2'];
    }
    updated.questions[index] = q;
    setSurvey(updated);
    // Auto-generate AI options when switching to multiple choice (only if question has real text)
    if ((newType === 'multiple_choice' || newType === 'radio') && q.question && q.question !== 'New Question') {
      generateOptionsForQuestion(q.question, newType, index);
    }
  };

  const generateOptionsForQuestion = async (questionText: string, questionType: string, index: number) => {
    setIsGeneratingOptions(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/refine-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, type: questionType, action: 'generate_options' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.options && data.options.length > 0) {
          setSurvey(prev => {
            if (!prev) return prev;
            const updated = { ...prev };
            updated.questions = [...updated.questions];
            updated.questions[index] = { ...updated.questions[index], options: data.options };
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate options:', err);
    } finally {
      setIsGeneratingOptions(false);
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!survey) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= survey.questions.length) return;
    const updated = { ...survey };
    updated.questions = [...updated.questions];
    [updated.questions[index], updated.questions[newIndex]] = [updated.questions[newIndex], updated.questions[index]];
    setSurvey(updated);
    setActiveQuestionIndex(newIndex);
  };

  const refineQuestion = async (index: number) => {
    if (!survey) return;
    const q = survey.questions[index];
    setIsRefining(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/refine-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, type: q.type, action: 'refine' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.refined_question) {
          updateQuestion(index, 'question', data.refined_question);
        }
      }
    } catch (err) {
      console.error('Failed to refine question:', err);
    } finally {
      setIsRefining(false);
    }
  };

  // ── AI Editor Command Handler ────────────────────────────────────────────
  const handleAiCommand = useCallback(async () => {
    if (!survey || !aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/surveys/${survey.id || id}/ai-editor-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          active_index: activeQuestionIndex,
          questions: survey.questions.map((q, i) => ({
            id: q.id || `q${i+1}`,
            question: q.question,
            type: q.type,
            options: q.options || [],
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        const errMsg = err.error || 'AI command failed';
        setAiMessage({ type: 'error', text: errMsg });
        setAiHistory(h => [...h, { prompt: aiPrompt.trim(), result: errMsg, status: 'error', timestamp: new Date() }]);
        return;
      }

      const { ops, message } = await res.json();

      if (!ops || ops.length === 0) {
        setAiMessage({ type: 'info', text: message || 'No changes made.' });
        setAiHistory(h => [...h, { prompt: aiPrompt.trim(), result: message || 'No changes made.', status: 'info', timestamp: new Date() }]);
        return;
      }

      // Apply ops to survey state
      setSurvey(prev => {
        if (!prev) return prev;
        let updated = { ...prev, questions: [...prev.questions] };

        for (const op of ops) {
          const qs = updated.questions;

          if (op.type === 'add_question') {
            const newQ: Question = {
              id: `question_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              question: op.question || 'New Question',
              type: (op.q_type || 'short_answer') as Question['type'],
              options: op.options || (op.q_type === 'yes_no' ? ['Yes', 'No'] : []),
              required: false,
            };
            const afterIdx = op.after_index ?? -1;
            if (afterIdx < 0 || afterIdx >= qs.length) {
              updated.questions = [...qs, newQ];
            } else {
              const arr = [...qs];
              arr.splice(afterIdx + 1, 0, newQ);
              updated.questions = arr;
            }
          }

          else if (op.type === 'delete_question') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length && qs.length > 1) {
              updated.questions = qs.filter((_, i) => i !== idx);
            }
          }

          else if (op.type === 'move_question') {
            const { from_index: from, to_index: to } = op;
            if (from >= 0 && to >= 0 && from < qs.length && to < qs.length && from !== to) {
              const arr = [...qs];
              const [moved] = arr.splice(from, 1);
              arr.splice(to, 0, moved);
              updated.questions = arr;
            }
          }

          else if (op.type === 'reorder') {
            const newOrder: number[] = op.new_order;
            if (Array.isArray(newOrder) && newOrder.length === qs.length) {
              updated.questions = newOrder.map(i => qs[i]);
            }
          }

          else if (op.type === 'change_type') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length) {
              const arr = [...qs];
              const newType = op.new_type as Question['type'];
              arr[idx] = {
                ...arr[idx],
                type: newType,
                options: op.options || (newType === 'yes_no' ? ['Yes', 'No'] : arr[idx].options || []),
              };
              updated.questions = arr;
            }
          }

          else if (op.type === 'update_text') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length) {
              const arr = [...qs];
              arr[idx] = { ...arr[idx], question: op.question };
              updated.questions = arr;
            }
          }

          else if (op.type === 'add_redirect') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length) {
              const arr = [...qs];
              let rawUrl = op.url || '';
              // Auto-prepend https:// if missing protocol
              if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
                rawUrl = 'https://' + rawUrl;
              }
              (arr[idx] as any).redirect_config = {
                enabled: true,
                url: rawUrl,
                condition: op.condition || 'always',
                color: '#f59e0b',
                allow_resume: true,
                resume_expiry_hours: 24,
              };
              updated.questions = arr;
            }
          }

          else if (op.type === 'end_survey') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length) {
              const arr = [...qs];
              (arr[idx] as any).end_here = {
                enabled: true,
                condition: op.condition || 'always',
              };
              updated.questions = arr;
            }
          }

          else if (op.type === 'remove_redirect') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length) {
              const arr = [...qs];
              (arr[idx] as any).redirect_config = null;
              updated.questions = arr;
            }
          }

          else if (op.type === 'remove_end') {
            const idx = op.index;
            if (idx >= 0 && idx < qs.length) {
              const arr = [...qs];
              (arr[idx] as any).end_here = null;
              updated.questions = arr;
            }
          }
        }

        // Re-number question IDs to stay consistent
        updated.questions = updated.questions.map((q, i) => ({
          ...q,
          id: q.id || `q${i+1}`,
        }));

        return updated;
      });

      // Refresh branch map for indicators
      setTimeout(() => fetchBranchMap(), 300);

      setAiMessage({ type: 'success', text: message || 'Done!' });
      setAiHistory(h => [...h, { prompt: aiPrompt.trim(), result: message || 'Done!', status: 'success', timestamp: new Date() }]);
      setAiPrompt('');

      // Clamp active index if questions were deleted
      setSurvey(prev => {
        if (!prev) return prev;
        if (activeQuestionIndex >= prev.questions.length) {
          setActiveQuestionIndex(Math.max(0, prev.questions.length - 1));
        }
        return prev;
      });

    } catch (err) {
      setAiMessage({ type: 'error', text: 'Network error. Try again.' });
      setAiHistory(h => [...h, { prompt: aiPrompt.trim(), result: 'Network error. Try again.', status: 'error', timestamp: new Date() }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMessage(null), 5000);
    }
  }, [survey, aiPrompt, aiLoading, apiBaseUrl, id, activeQuestionIndex, fetchBranchMap]);

  if (isLoading) return <OptimizedLoader type="page" message="Loading survey editor..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Survey not found</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  const activeQ = survey.questions[activeQuestionIndex];
  const typeIcon = QUESTION_TYPES.find(t => t.value === activeQ?.type)?.icon || '✎';
  const hasOptions = activeQ && (activeQ.type === 'multiple_choice' || activeQ.type === 'yes_no' || activeQ.type === 'radio');
  const theme = getTheme(survey.template_type || 'custom');

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0">
        <div className="px-3 sm:px-6 flex items-center justify-between h-12 sm:h-14 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => { if (window.history.length > 1) { navigate(-1); } else { navigate('/dashboard'); } }} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs sm:text-sm transition-colors flex-shrink-0">
              <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <input
              type="text"
              value={survey.title || ''}
              onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
              className="text-xs sm:text-sm font-semibold text-gray-900 bg-transparent border-none outline-none min-w-0 flex-1 max-w-[140px] sm:max-w-[220px] hover:bg-gray-50 focus:bg-gray-50 rounded px-1 sm:px-2 py-1 transition-colors"
              placeholder="Untitled Survey"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => openSettings()}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings size={12} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={() => setShowBranchingEditor(true)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <GitBranch size={12} /> <span className="hidden sm:inline">Branching</span>
            </button>
            <button
              onClick={() => { setShareLinkRevealed(false); setShowSharePopup(true); setTimeout(() => setShareLinkRevealed(true), 1800); }}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 size={12} /> <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors text-[10px] sm:text-xs font-medium"
            >
              <Save size={12} /> {isSaving ? '...' : 'Save'}
            </button>
          </div>
        </div>
        {/* Inline description below title */}
        <div className="px-4 sm:px-6 pb-2">
          <input
            type="text"
            value={survey.subtitle || ''}
            onChange={(e) => setSurvey({ ...survey, subtitle: e.target.value })}
            className="text-xs text-gray-400 bg-transparent border-none outline-none w-full max-w-md hover:bg-gray-50 focus:bg-gray-50 rounded px-2 py-1 transition-colors"
            placeholder="Add a description..."
          />
        </div>
      </div>

      {/* ── Settings Modal (floating) ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'editorModalIn 0.25s ease-out' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Settings size={15} /> Survey Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <Grid3X3 size={12} /> Choose a Template
              </label>
              <TemplateSelector
                selectedTemplate={survey.template_type || 'custom'}
                onSelectTemplate={(newTemplate) => setSurvey({ ...survey, template_type: newTemplate })}
                isDarkMode={false}
              />

              {/* Location collection toggle */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Ask respondents for location</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">When on, the browser shows a location permission popup to people who fill your survey.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={survey.collect_location === true}
                    onClick={() => setSurvey({ ...survey, collect_location: survey.collect_location === true ? false : true })}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                      survey.collect_location === true ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        survey.collect_location === true ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* ── Collaborators ── */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Share2 size={12} /> Share with another account
                </p>
                <p className="text-[11px] text-gray-400 mb-3">
                  Add a registered user by their email — this survey will appear in their dashboard too.
                </p>

                {/* Email input + lookup */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={collaboratorEmail}
                    onChange={e => { setCollaboratorEmail(e.target.value); setCollaboratorLookup(null); setCollaboratorLookupError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLookupEmail()}
                    placeholder="Enter their email address"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    onClick={handleLookupEmail}
                    disabled={collaboratorLookupLoading || !collaboratorEmail.trim()}
                    className="px-3 py-2 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
                  >
                    {collaboratorLookupLoading ? '...' : 'Find'}
                  </button>
                </div>

                {/* Error */}
                {collaboratorLookupError && (
                  <p className="mt-2 text-[11px] text-red-500">{collaboratorLookupError}</p>
                )}

                {/* Found user card */}
                {collaboratorLookup && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{collaboratorLookup.name || collaboratorLookup.email}</p>
                      <p className="text-[11px] text-gray-500">{collaboratorLookup.email}</p>
                    </div>
                    <button
                      onClick={handleAddCollaborator}
                      disabled={collaboratorAdding}
                      className="px-3 py-1.5 bg-green-600 text-white text-[11px] font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                    >
                      {collaboratorAdding ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                )}

                {/* Current collaborators list */}
                {collaborators.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] text-gray-400 font-medium">Shared with:</p>
                    {collaborators.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{c.name || c.email}</p>
                          <p className="text-[11px] text-gray-400">{c.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(c.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Popup (floating, animated with celebration) ── */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSharePopup(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
            style={{ maxWidth: 960, maxHeight: '92vh', animation: 'editorModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration phase */}
            {!shareLinkRevealed && (
              <div className="px-6 py-12 text-center relative overflow-hidden">
                {/* Floating particles */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        width: i % 3 === 0 ? 8 : 6,
                        height: i % 3 === 0 ? 8 : 6,
                        borderRadius: i % 2 === 0 ? '50%' : '2px',
                        background: ['#C4785C', '#E8B4A0', '#2D2520', '#D4C5B3', '#9B9189', '#F5F1E8'][i % 6],
                        left: `${10 + (i * 7.5)}%`,
                        top: '-10px',
                        opacity: 0,
                        animation: `shareConfetti 1.8s ${i * 0.1}s ease-out forwards`,
                      }}
                    />
                  ))}
                </div>
                {/* Chilli icon pulse */}
                <div style={{ animation: 'sharePulse 0.6s ease-out' }}>
                  <img
                    src="/logo.png"
                    alt=""
                    style={{ width: 48, height: 48, margin: '0 auto 16px', objectFit: 'contain' }}
                  />
                </div>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700,
                  color: '#2D2520', marginBottom: 6,
                  animation: 'shareTextIn 0.5s 0.2s ease-out both',
                }}>
                  Your survey is ready!
                </h3>
                <p style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#9B9189',
                  animation: 'shareTextIn 0.5s 0.4s ease-out both',
                }}>
                  Generating your share link...
                </p>
                {/* Loading dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#C4785C',
                      animation: `shareDot 1s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Link revealed phase */}
            {shareLinkRevealed && (
              <div style={{ animation: 'shareReveal 0.4s ease-out' }} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Share2 size={15} /> Share Survey
                  </h3>
                  <button onClick={() => { setShowSharePopup(false); setShareTab('link'); setMailResult(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 shrink-0">
                  {(['link', 'mail'] as const).map(tab => (
                    <button key={tab} onClick={() => { setShareTab(tab); setMailResult(null); }}
                      className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${shareTab === tab ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      {tab === 'link' ? <ExternalLink size={12} /> : <Mail size={12} />}
                      {tab === 'link' ? 'Copy Link' : 'Send Mail'}
                    </button>
                  ))}
                </div>
                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1">

                {/* ── Tab: Link ── */}
                {shareTab === 'link' && (
                  <div className="px-6 py-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Survey Link</label>
                      <div className="flex gap-2">
                        <input type="text" value={shareLink} readOnly className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-xs bg-gray-50 truncate font-mono" />
                        <button onClick={copyToClipboard} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors font-medium whitespace-nowrap">
                          {copied ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                        </button>
                      </div>
                    </div>
                    <a href={shareLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      <ExternalLink size={13} /> Open in New Tab
                    </a>
                  </div>
                )}

                {/* ── Tab: Mail ── */}
                {shareTab === 'mail' && (
                  <MailInviteTab
                    surveyId={id}
                    surveyTitle={survey?.prompt?.slice(0, 80) || 'Your Survey'}
                    senderName={user?.name || user?.email?.split('@')[0] || 'Someone'}
                    shareLink={shareLink}
                    apiBaseUrl={apiBaseUrl}
                  />
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Animation Settings Modal ── */}
      {showAnimationPanel && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowAnimationPanel(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'editorModalIn 0.25s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Zap size={15} className="text-purple-500" /> Animation Settings
              </h3>
              <button onClick={() => setShowAnimationPanel(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
              {/* Two-column: Question & Answer animations */}
              <div className="grid grid-cols-2 gap-5">
                {/* Question Animation */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Question Animation</label>
                  <div className="space-y-1">
                    {QUESTION_ANIMATIONS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => updateAnimation('questionAnimation', a.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                          animConfig.questionAnimation === a.value
                            ? 'bg-purple-100 text-purple-700 font-medium ring-1 ring-purple-200'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base w-5 text-center">{a.icon}</span>
                        <div className="text-left">
                          <div>{a.label}</div>
                          <div className="text-[9px] text-gray-400">{a.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Answer Animation */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Answer Animation</label>
                  <div className="space-y-1">
                    {ANSWER_ANIMATIONS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => updateAnimation('answerAnimation', a.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                          animConfig.answerAnimation === a.value
                            ? 'bg-purple-100 text-purple-700 font-medium ring-1 ring-purple-200'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base w-5 text-center">{a.icon}</span>
                        <div className="text-left">
                          <div>{a.label}</div>
                          <div className="text-[9px] text-gray-400">{a.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliders row */}
              <div className="grid grid-cols-2 gap-5">
                {/* Delay */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Delay <span className="text-gray-400 normal-case font-normal">({animConfig.delayMs}ms)</span>
                  </label>
                  <input
                    type="range" min={0} max={2000} step={50}
                    value={animConfig.delayMs}
                    onChange={e => updateAnimation('delayMs', parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>None</span><span>2s</span>
                  </div>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Speed <span className="text-gray-400 normal-case font-normal">({animConfig.speedMs}ms)</span>
                  </label>
                  <input
                    type="range" min={200} max={1500} step={50}
                    value={animConfig.speedMs}
                    onChange={e => updateAnimation('speedMs', parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Fast</span><span>Slow</span>
                  </div>
                </div>
              </div>

              {/* Auto Advance */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Auto-advance</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Automatically move to next question after answering</p>
                  </div>
                  <div
                    onClick={() => updateAnimation('autoAdvance', !animConfig.autoAdvance)}
                    className={`w-10 h-[22px] rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      animConfig.autoAdvance ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      animConfig.autoAdvance ? 'translate-x-[22px]' : 'translate-x-[3px]'
                    }`} />
                  </div>
                </label>

                {animConfig.autoAdvance && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Advance Delay <span className="text-gray-400 normal-case font-normal">({(animConfig.autoAdvanceDelay / 1000).toFixed(1)}s)</span>
                    </label>
                    <input
                      type="range" min={500} max={5000} step={250}
                      value={animConfig.autoAdvanceDelay}
                      onChange={e => updateAnimation('autoAdvanceDelay', parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0.5s</span><span>5s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
              <button
                onClick={() => setShowAnimationPanel(false)}
                className="px-5 py-2 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main 3-Panel Layout ── */}
      <div className="flex flex-1 overflow-hidden flex-row">

        {/* ── Left Panel: Question List ── */}
        <div className={`
          bg-white border-r border-gray-200 flex flex-col shrink-0
          md:w-64 md:flex md:h-full
          ${mobilePanel === 'questions' ? 'flex w-full absolute inset-0 z-10 mt-0' : 'hidden md:flex'}
        `} style={{ top: 'auto' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</span>
            <button
              onClick={addNewQuestion}
              className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1 scrollbar-transparent">
            {(survey.questions || []).map((q, index) => {
              const qTypeIcon = QUESTION_TYPES.find(t => t.value === q.type)?.icon || '✎';
              const bInfo = branchMap[q.id];
              const hasBranch = bInfo && (bInfo.hasRedirect || bInfo.hasEndHere || bInfo.hasCondition);
              return (
                <button
                  key={q.id || index}
                  onClick={() => { setActiveQuestionIndex(index); setMobilePanel('editor'); }}
                  className={`text-left px-4 py-3 flex items-start gap-3 transition-colors w-full ${
                    index === activeQuestionIndex
                      ? 'bg-red-50 border-l-[3px] border-l-red-500'
                      : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                    index === activeQuestionIndex ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${index === activeQuestionIndex ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {q.question || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        {qTypeIcon} {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                      </span>
                      {/* ── Branch indicators ── */}
                      {bInfo?.hasCondition && (
                        <span
                          title="Conditional display — this question only shows based on a previous answer"
                          onClick={e => { e.stopPropagation(); setBranchFocusQuestionId(q.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                          className="branch-indicator branch-indicator--condition"
                        >
                          ⤷ Conditional
                        </span>
                      )}
                      {bInfo?.hasRedirect && (
                        <span
                          title="Redirect — user is sent to an external URL after answering"
                          onClick={e => { e.stopPropagation(); setBranchFocusQuestionId(q.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                          className="branch-indicator branch-indicator--redirect"
                        >
                          ↗ Redirect
                        </span>
                      )}
                      {bInfo?.hasEndHere && (
                        <span
                          title="End survey — survey stops after this question"
                          onClick={e => { e.stopPropagation(); setBranchFocusQuestionId(q.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                          className="branch-indicator branch-indicator--end"
                        >
                          ⊡ Ends
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Right-side dot if any branching is set */}
                  {hasBranch && (
                    <span className="branch-dot flex-shrink-0" title="Has branching rules" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Center Panel: Paper & Pin Editor ── */}
        <div className={`
          flex-1 flex items-start justify-center overflow-y-auto scrollbar-transparent
          ${mobilePanel === 'editor' ? 'flex' : 'hidden md:flex'}
        `} style={{
          background: theme.bg,
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
          transition: 'background 0.4s ease',
        }}>
          {activeQ ? (
            <div style={{ position: 'relative', maxWidth: 580, width: '100%', margin: '24px 12px 24px' }} className="sm:mx-6 sm:my-10">
              {/* Pin icon */}
              <div style={{
                position: 'absolute', top: -22, left: 28, width: 44, height: 44, zIndex: 20,
                transform: 'rotate(-25deg)',
                filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2))',
                pointerEvents: 'none',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="44" height="44">
                  <path fill={theme.pin} d="M288.6 76.8C344.8 20.6 436 20.6 492.2 76.8C548.4 133 548.4 224.2 492.2 280.4L328.2 444.4C293.8 478.8 238.1 478.8 203.7 444.4C169.3 410 169.3 354.3 203.7 319.9L356.5 167.3C369 154.8 389.3 154.8 401.8 167.3C414.3 179.8 414.3 200.1 401.8 212.6L249 365.3C239.6 374.7 239.6 389.9 249 399.2C258.4 408.5 273.6 408.6 282.9 399.2L446.9 235.2C478.1 204 478.1 153.3 446.9 122.1C415.7 90.9 365 90.9 333.8 122.1L169.8 286.1C116.7 339.2 116.7 425.3 169.8 478.4C222.9 531.5 309 531.5 362.1 478.4L492.3 348.3C504.8 335.8 525.1 335.8 537.6 348.3C550.1 360.8 550.1 381.1 537.6 393.6L407.4 523.6C329.3 601.7 202.7 601.7 124.6 523.6C46.5 445.5 46.5 318.9 124.6 240.8L288.6 76.8z"/>
                </svg>
              </div>

              {/* Paper card with rough edges */}
              <div style={{
                background: theme.paper,
                position: 'relative',
                clipPath: 'polygon(0.5% 0.8%, 3% 0.2%, 6% 1%, 9% 0.3%, 12% 0.9%, 16% 0.1%, 20% 0.7%, 24% 0.2%, 28% 1%, 32% 0.4%, 36% 0.8%, 40% 0.1%, 44% 0.6%, 48% 0.3%, 52% 0.9%, 56% 0.2%, 60% 0.7%, 64% 0.1%, 68% 0.8%, 72% 0.3%, 76% 1%, 80% 0.2%, 84% 0.6%, 88% 0.1%, 92% 0.9%, 95% 0.4%, 98% 0.8%, 100% 0.5%, 99.5% 4%, 100% 8%, 99.2% 12%, 99.8% 16%, 99.1% 20%, 99.6% 24%, 99.3% 28%, 99.9% 32%, 99.2% 36%, 99.7% 40%, 99.1% 44%, 99.5% 48%, 99.8% 52%, 99.2% 56%, 99.6% 60%, 99.1% 64%, 99.8% 68%, 99.3% 72%, 99.7% 76%, 99.1% 80%, 99.5% 84%, 99.8% 88%, 99.2% 92%, 99.6% 96%, 99.3% 100%, 96% 99.5%, 92% 99.9%, 88% 99.2%, 84% 99.7%, 80% 99.1%, 76% 99.6%, 72% 99.3%, 68% 99.8%, 64% 99.1%, 60% 99.5%, 56% 99.9%, 52% 99.2%, 48% 99.7%, 44% 99.1%, 40% 99.6%, 36% 99.3%, 32% 99.8%, 28% 99.1%, 24% 99.5%, 20% 99.9%, 16% 99.2%, 12% 99.7%, 8% 99.1%, 4% 99.6%, 1% 99.3%, 0% 99.5%, 0.5% 96%, 0% 92%, 0.8% 88%, 0.2% 84%, 0.9% 80%, 0.3% 76%, 0.7% 72%, 0.1% 68%, 0.8% 64%, 0.3% 60%, 0.6% 56%, 0.1% 52%, 0.9% 48%, 0.4% 44%, 0.7% 40%, 0.2% 36%, 0.8% 32%, 0.3% 28%, 0.6% 24%, 0.1% 20%, 0.9% 16%, 0.4% 12%, 0.7% 8%, 0.2% 4%)',
                boxShadow: '2px 3px 8px rgba(0,0,0,0.12), 4px 6px 20px rgba(0,0,0,0.08)',
                padding: 'clamp(20px, 5vw, 36px) clamp(16px, 4vw, 32px) clamp(18px, 4vw, 30px)',
                transition: 'background 0.4s ease',
              }}>
                {/* Paper texture overlay */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.7,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,90,43,0.02) 31px, rgba(139,90,43,0.02) 32px), repeating-linear-gradient(90deg, transparent, transparent 47px, rgba(139,90,43,0.01) 47px, rgba(139,90,43,0.01) 48px)',
                }} />

                {/* Chilli logo + question counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                  <img
                    src="/logo.png"
                    alt="PepperAds"
                    style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 28, height: 28, background: theme.accent, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 700,
                      boxShadow: `0 2px 6px ${theme.accentShadow}`,
                      transition: 'background 0.4s ease',
                    }}>
                      {activeQuestionIndex + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.textLight, textTransform: 'uppercase', letterSpacing: 1 }}>
                      of {survey.questions.length} · {typeIcon} {QUESTION_TYPES.find(t => t.value === activeQ.type)?.label}
                    </span>
                  </div>

                  {/* ── Branching status badges (center paper card) ── */}
                  {(() => {
                    const bInfo = branchMap[activeQ.id];
                    if (!bInfo || (!bInfo.hasRedirect && !bInfo.hasEndHere && !bInfo.hasCondition)) {
                      return (
                        <button
                          onClick={() => { setBranchFocusQuestionId(activeQ.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                          className="branch-card-btn branch-card-btn--none"
                          title="No branching set — click to configure"
                        >
                          <GitBranch size={11} /> No branching
                        </button>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {bInfo.hasCondition && (
                          <button
                            onClick={() => { setBranchFocusQuestionId(activeQ.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                            className="branch-card-btn branch-card-btn--condition"
                            title="Conditional — click to edit"
                          >
                            ⤷ Conditional
                          </button>
                        )}
                        {bInfo.hasRedirect && (
                          <button
                            onClick={() => { setBranchFocusQuestionId(activeQ.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                            className="branch-card-btn branch-card-btn--redirect"
                            title="Redirects after answer — click to edit"
                          >
                            ↗ Redirect
                          </button>
                        )}
                        {bInfo.hasEndHere && (
                          <button
                            onClick={() => { setBranchFocusQuestionId(activeQ.id); setShowBranchingEditor(true); setBranchingViewMode('simple'); }}
                            className="branch-card-btn branch-card-btn--end"
                            title="Ends survey here — click to edit"
                          >
                            ⊡ Ends Survey
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Editable question text */}
                <div className="relative group">
                  <textarea
                    value={activeQ.question}
                    onChange={(e) => updateQuestion(activeQuestionIndex, 'question', e.target.value)}
                    placeholder="Type your question here..."
                    rows={2}
                    style={{
                      width: '100%', fontSize: 22, fontWeight: 600, color: theme.text,
                      background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: "'Outfit', sans-serif", marginBottom: 6,
                      borderBottom: `2px dashed ${theme.dashed}`, paddingBottom: 6,
                      paddingRight: 44,
                      resize: 'none',
                      wordBreak: 'break-word',
                    }}
                  />
                  {/* AI Refine Button */}
                  <button
                    onClick={() => refineQuestion(activeQuestionIndex)}
                    disabled={isRefining}
                    title="AI: Rephrase this question"
                    className={`absolute top-1 right-1 z-10 p-2 rounded-lg transition-all ${
                      isRefining
                        ? 'bg-purple-100 text-purple-500 cursor-wait'
                        : 'bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600 opacity-0 group-hover:opacity-100'
                    }`}
                    style={{ pointerEvents: 'auto' }}
                  >
                    {isRefining ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                  </button>
                </div>

                {/* Description */}
                <input
                  type="text"
                  value={activeQ.questionDescription || ''}
                  onChange={(e) => updateQuestion(activeQuestionIndex, 'questionDescription', e.target.value)}
                  placeholder="Description (optional)"
                  style={{
                    width: '100%', fontSize: 14, color: theme.textLight, fontStyle: 'italic',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Outfit', sans-serif", marginBottom: 28,
                    position: 'relative', zIndex: 1,
                  }}
                />

                {/* ── Inline answer editing ── */}
                <div style={{ position: 'relative', zIndex: 1 }}>

                  {/* AI Options Loading */}
                  {isGeneratingOptions && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-2 bg-purple-50 rounded-lg">
                      <RefreshCw size={14} className="animate-spin text-purple-500" />
                      <span className="text-xs text-purple-600 font-medium">AI is generating options...</span>
                    </div>
                  )}

                  {/* Multiple Choice / Yes-No / Radio */}
                  {hasOptions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(activeQ.options || []).map((opt, optIdx) => {
                        const qStyle = activeQ.answerStyle || survey.answerStyle || 'classic';
                        const optionStyles: Record<string, React.CSSProperties> = {
                          classic: { border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.paperInner, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
                          underline: { border: 'none', borderBottom: `2px solid ${theme.border}`, borderRadius: 0, background: 'transparent', boxShadow: 'none' },
                          card: { border: 'none', borderLeft: '4px solid transparent', borderRadius: 16, background: 'linear-gradient(145deg, #ffffff, #fafafa)', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
                          pill: { border: `1.5px solid ${theme.border}`, borderRadius: 50, background: theme.paperInner, boxShadow: 'none' },
                          flat: { border: 'none', borderRadius: 8, background: '#f3f2ef', boxShadow: 'none' },
                        };
                        const keyStyles: Record<string, React.CSSProperties> = {
                          classic: { borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.paperInner },
                          underline: { borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.paperInner },
                          card: { borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #C4785C, #A8624A)', color: '#fff' },
                          pill: { borderRadius: '50%', border: `1px solid ${theme.border}`, background: theme.paperInner },
                          flat: { borderRadius: 6, border: 'none', background: '#e5e3df' },
                        };
                        return (
                        <div key={optIdx} className="group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            width: 34, height: 34,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: keyStyles[qStyle]?.color || theme.textLight, flexShrink: 0,
                            fontFamily: "'Outfit', sans-serif",
                            ...keyStyles[qStyle],
                          }}>
                            {OPTION_KEYS[optIdx] || optIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateQuestionOption(activeQuestionIndex, optIdx, e.target.value)}
                            placeholder={`Choice ${optIdx + 1}`}
                            style={{
                              flex: 1, padding: '10px 14px',
                              fontSize: 14, color: theme.text,
                              fontFamily: "'Outfit', sans-serif", outline: 'none',
                              ...optionStyles[qStyle],
                            }}
                            onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accentShadow}`; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                          />
                          <button
                            onClick={() => removeOption(activeQuestionIndex, optIdx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ padding: 4, color: theme.textLight, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        );
                      })}
                      <button
                        onClick={() => addOption(activeQuestionIndex)}
                        style={{
                          marginLeft: 46, marginTop: 4, fontSize: 13, fontWeight: 600,
                          color: theme.accent, background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        <Plus size={13} /> Add choice
                      </button>
                    </div>
                  )}

                  {/* Short Answer */}
                  {activeQ.type === 'short_answer' && (() => {
                    const qStyle = activeQ.answerStyle || survey.answerStyle || 'classic';
                    const textStyles: Record<string, React.CSSProperties> = {
                      classic: { border: `1px solid ${theme.border}`, borderRadius: 10, padding: '12px 16px', background: theme.paperInner, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
                      underline: { border: 'none', borderBottom: `2px solid ${theme.accent}`, borderRadius: 0, padding: '12px 4px', background: 'transparent' },
                      card: { border: 'none', borderLeft: '5px solid #e8d5cf', borderRadius: 12, padding: '14px 18px', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
                      pill: { border: `1.5px solid ${theme.border}`, borderRadius: 50, padding: '12px 24px', background: theme.paperInner },
                      flat: { border: 'none', borderRadius: 8, padding: '12px 16px', background: '#f3f2ef' },
                    };
                    return (
                      <div style={{ maxWidth: 420, ...textStyles[qStyle] }}>
                        <span style={{ fontSize: 14, color: theme.textLight, fontStyle: 'italic', fontFamily: "'Outfit', sans-serif" }}>
                          Respondent's answer will appear here...
                        </span>
                      </div>
                    );
                  })()}

                  {/* Rating */}
                  {activeQ.type === 'rating' && (() => {
                    const qStyle = activeQ.answerStyle || survey.answerStyle || 'classic';
                    const circleStyles: Record<string, React.CSSProperties> = {
                      classic: { border: `2px solid ${theme.border}`, borderRadius: '50%', background: theme.paperInner, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
                      underline: { border: 'none', borderBottom: `2px solid ${theme.accent}`, borderRadius: 0, background: 'transparent' },
                      card: { border: 'none', borderRadius: 12, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
                      pill: { border: `1.5px solid ${theme.border}`, borderRadius: '50%', background: theme.paperInner },
                      flat: { border: 'none', borderRadius: 8, background: '#f3f2ef' },
                    };
                    return (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} style={{
                            width: 48, height: 48,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 700, color: theme.textLight,
                            fontFamily: "'Outfit', sans-serif",
                            ...circleStyles[qStyle],
                          }}>
                            {n}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Scale */}
                  {activeQ.type === 'range' && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: theme.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, fontFamily: "'Outfit', sans-serif" }}>
                        <span>Not at all</span>
                        <span>Extremely</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                          <div key={n} style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: `2px solid ${theme.border}`, background: theme.paperInner,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: theme.textLight,
                            fontFamily: "'Outfit', sans-serif",
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          }}>
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Powered by - below the paper */}
              <div style={{
                textAlign: 'center', fontSize: 12, color: theme.textLight,
                fontFamily: "'Outfit', sans-serif", marginTop: 16, paddingBottom: 8,
              }}>
                Powered by <span style={{ color: theme.accent, fontWeight: 600 }}>Pepperwahl</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: theme.textLight, fontFamily: "'Outfit', sans-serif" }}>
              <p style={{ fontSize: 18, marginBottom: 12 }}>No questions yet</p>
              <button
                onClick={addNewQuestion}
                style={{
                  fontSize: 14, color: theme.accent, fontWeight: 600, background: 'none',
                  border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <Plus size={14} /> Add your first question
              </button>
            </div>
          )}
        </div>

        {/* ── Right Panel: Question Settings ── */}
        {activeQ && (
          <div className={`
            bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto scrollbar-transparent
            md:w-72 md:h-full
            ${mobilePanel === 'settings' ? 'flex w-full' : 'hidden md:flex'}
          `}>
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question Settings</h3>
            </div>
            <div className="px-4 md:px-5 py-3 md:py-4 space-y-4 md:space-y-5 flex-1">
              {/* Question Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Type</label>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
                  {QUESTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => changeQuestionType(activeQuestionIndex, t.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeQ.type === t.value
                          ? 'bg-red-50 text-red-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reorder */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Reorder</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => moveQuestion(activeQuestionIndex, 'up')}
                    disabled={activeQuestionIndex === 0}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp size={14} /> Move Up
                  </button>
                  <button
                    onClick={() => moveQuestion(activeQuestionIndex, 'down')}
                    disabled={activeQuestionIndex === survey.questions.length - 1}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown size={14} /> Move Down
                  </button>
                </div>
              </div>

              {/* Answer Style */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Answer Style</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { value: 'classic', label: 'Classic Box', preview: '┌───┐' },
                    { value: 'underline', label: 'Underline', preview: '────' },
                    { value: 'card', label: 'Card', preview: '▓▓▓▓' },
                    { value: 'pill', label: 'Pill', preview: '(══)' },
                    { value: 'flat', label: 'Flat', preview: '░░░░' },
                  ].map(style => {
                    const currentStyle = activeQ.answerStyle || survey.answerStyle || 'classic';
                    return (
                      <button
                        key={style.value}
                        onClick={() => {
                          // Apply to current question only by default
                          const updated = { ...survey };
                          updated.questions = [...updated.questions];
                          updated.questions[activeQuestionIndex] = { ...updated.questions[activeQuestionIndex], answerStyle: style.value };
                          setSurvey(updated);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentStyle === style.value
                            ? 'bg-blue-50 text-blue-600 font-medium border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className="text-[10px] font-mono w-8 text-center opacity-60">{style.preview}</span>
                        {style.label}
                      </button>
                    );
                  })}
                </div>
                {/* Apply to all button */}
                <button
                  onClick={() => {
                    const style = activeQ.answerStyle || survey.answerStyle || 'classic';
                    setSurvey(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        answerStyle: style as any,
                        questions: prev.questions.map(q => ({ ...q, answerStyle: style }))
                      };
                    });
                  }}
                  className="mt-2 w-full text-[10px] font-medium text-center py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  Apply to all questions
                </button>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <button
                  onClick={() => setShowAnimationPanel(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100"
                >
                  <Zap size={13} /> Animation Settings
                </button>

                <button
                  onClick={() => deleteQuestion(activeQuestionIndex)}
                  disabled={survey.questions.length <= 1}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={13} /> Delete Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="md:hidden flex items-center border-t border-gray-200 bg-white shrink-0 z-20">
        <button
          onClick={() => setMobilePanel('questions')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
            mobilePanel === 'questions' ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Questions
          {mobilePanel === 'questions' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t" />}
        </button>
        <button
          onClick={() => setMobilePanel('editor')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative ${
            mobilePanel === 'editor' ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editor
          {mobilePanel === 'editor' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t" />}
        </button>
        <button
          onClick={() => setMobilePanel('settings')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative ${
            mobilePanel === 'settings' ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
          {mobilePanel === 'settings' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t" />}
        </button>
      </div>

      {/* ── Save Status Toast ── */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-16 md:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto px-4 py-2.5 rounded-lg shadow-lg z-50 flex items-center justify-center sm:justify-start gap-2 text-sm ${
          saveStatus === 'saved' ? 'bg-green-500 text-white' : saveStatus === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {saveStatus === 'saving' && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />}
          <span className="font-medium">{saveMessage}</span>
        </div>
      )}

      {/* ── Branching Editor Modal ── */}
      {showBranchingEditor && survey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header with View Toggle */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-4">
                <GitBranch className="text-purple-600" size={24} />
                <h2 className="text-xl font-bold text-gray-800">Branching Logic</h2>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 border shadow-sm">
                <button
                  onClick={() => setBranchingViewMode('simple')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    branchingViewMode === 'simple' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📋 Simple Table
                </button>
                <button
                  onClick={() => setBranchingViewMode('flow')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    branchingViewMode === 'flow' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🔀 Flow Diagram
                </button>
              </div>
              
              <button
                onClick={() => { setShowBranchingEditor(false); setBranchFocusQuestionId(null); }}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4" style={branchingViewMode === 'flow' ? { padding: 0, overflow: 'hidden' } : {}}>
              {branchingViewMode === 'simple' ? (
                <SimpleBranchingRules
                  surveyId={survey.id || id || ''}
                  onClose={() => { setShowBranchingEditor(false); setBranchFocusQuestionId(null); }}
                  onRulesSaved={() => { setFlowRefreshKey(k => k + 1); fetchBranchMap(); }}
                  focusQuestionId={branchFocusQuestionId}
                />
              ) : (
                <BranchFlowEditor
                  surveyId={survey.id || id || ''}
                  questions={survey.questions}
                  onClose={() => setShowBranchingEditor(false)}
                  onSwitchToSimple={() => setBranchingViewMode('simple')}
                  refreshKey={flowRefreshKey}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Assistant FAB + Panel ── */}
      {/* FAB button — fixed bottom-right, always visible */}
      <button
        className={`ai-fab ${showAiBox ? 'ai-fab--active' : ''}`}
        onClick={() => setShowAiBox(v => !v)}
        title="AI Assistant"
        aria-label="Open AI Assistant"
      >
        {showAiBox ? (
          <X size={20} />
        ) : (
          /* Wand/sparkle icon — feels like "AI magic" */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
            <path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" />
            <path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" />
          </svg>
        )}
        {/* Pulse ring when closed */}
        {!showAiBox && <span className="ai-fab-pulse" />}
      </button>

      {/* AI panel — slides up from bottom-right above the FAB */}
      {showAiBox && (
        <div className="ai-fab-panel" onClick={e => e.stopPropagation()}>
          {/* Panel header */}
          <div className="ai-fab-panel-header">
            <div className="ai-fab-panel-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
                <path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" />
                <path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" />
              </svg>
              AI Assistant
            </div>
            <span className="ai-fab-panel-sub">Ctrl+Enter to send</span>
          </div>

          {/* Quick chips */}
          <div className="ai-editor-chips">
            {[
              'End survey after this Q if No',
              'Add redirect after this Q',
              'Add a Yes/No question after this Q',
              'Delete this question',
              'Move this Q to top',
            ].map(chip => (
              <button
                key={chip}
                className="ai-editor-chip"
                onClick={() => setAiPrompt(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat history — shows past prompts and AI responses */}
          {aiHistory.length > 0 && (
            <div className="ai-chat-history">
              {aiHistory.map((entry, i) => (
                <div key={i} className="ai-chat-entry">
                  {/* User bubble */}
                  <div className="ai-chat-user">
                    <span className="ai-chat-user-icon">You</span>
                    <span className="ai-chat-user-text">{entry.prompt}</span>
                  </div>
                  {/* AI response bubble */}
                  <div className={`ai-chat-ai ai-chat-ai--${entry.status}`}>
                    <span className="ai-chat-ai-icon">✦</span>
                    <span className="ai-chat-ai-text">{entry.result}</span>
                  </div>
                </div>
              ))}
              <div ref={aiHistoryEndRef} />
            </div>
          )}

          {/* Result message (current, fades out) */}
          {aiMessage && aiHistory.length === 0 && (
            <div className={`ai-editor-message ai-editor-message--${aiMessage.type}`}>
              {aiMessage.type === 'success' && '✓ '}
              {aiMessage.type === 'error' && '✕ '}
              {aiMessage.type === 'info' && 'ℹ '}
              {aiMessage.text}
            </div>
          )}

          {/* Input area */}
          <div className="ai-fab-panel-input">
            <textarea
              className="ai-editor-textarea"
              placeholder={`Tell AI what to do with this survey...\n"add redirect to https://x.com after Q3 if Yes"\n"end survey after Q2 if they answer No"\n"move Q4 before Q2"`}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              rows={3}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAiCommand();
                }
              }}
            />
            <button
              className={`ai-editor-send ${aiLoading ? 'loading' : ''}`}
              onClick={handleAiCommand}
              disabled={aiLoading || !aiPrompt.trim()}
              title="Send (Ctrl+Enter)"
            >
              {aiLoading
                ? <RefreshCw size={14} className="spinning" />
                : <CornerDownLeft size={14} />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyEditor;
