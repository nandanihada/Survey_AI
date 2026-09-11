/**
 * OnboardMailTab
 *
 * Admin panel tab for managing the onboarding email that fires automatically
 * every time a new user confirms their email address.
 *
 * Architecture:
 *  - Every named piece of the template is a typed field in `TemplateFields`.
 *  - `buildHtml(fields)` assembles the final HTML from those fields.
 *  - The backend stores both `template_fields` (for re-editing) and `html_body`
 *    (the rendered output that gets emailed).
 *  - An "Advanced HTML Override" escape hatch is available for power users.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, Eye, EyeOff,
  Loader2, Mail, RefreshCw, Save, Send, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

// ─── Template field types ─────────────────────────────────────────────────────

interface TemplateFields {
  // Email meta
  emailSubject:      string;
  // Header
  brandName:         string;
  headerLink:        string;           // "Open Platform" href
  // Hero section
  heroHeadline:      string;
  heroSubtext:       string;
  // Primary CTA banner
  ctaBannerTitle:    string;
  ctaBannerSubtext:  string;
  ctaBannerBtnText:  string;
  ctaBannerBtnLink:  string;
  // Eligibility block
  eligibilityTitle:  string;
  eligibilitySubtext:string;
  eligibilityBtnText:string;
  eligibilityBtnLink:string;          // survey link
  // Steps
  step1Title:        string;
  step1Body:         string;
  step2Title:        string;
  step2Body:         string;
  step3Title:        string;
  step3Body:         string;
  // Center CTA
  centerBtnText:     string;
  centerBtnLink:     string;
  sideLink1Text:     string;
  sideLink1Url:      string;
  sideLink2Text:     string;
  sideLink2Url:      string;
  // Pro tip
  proTipText:        string;
  // Footer
  footerBrand:       string;
  footerAddress:     string;
  footerUnsubUrl:    string;
  footerPrivacyUrl:  string;
  footerSupportUrl:  string;
}

const DEFAULT_FIELDS: TemplateFields = {
  emailSubject:       "Welcome to Pepperwahl — let's check if you're eligible!",
  brandName:          'Pepperwahl',
  headerLink:         'https://survey.pepperwahl.com',
  heroHeadline:       'Welcome to Pepperwahl. Smarter surveys, real-time responses, effortless insights.',
  heroSubtext:        "You've joined thousands of product managers, researchers, and creators gathering actionable customer intelligence with AI-generated forms.",
  ctaBannerTitle:     'Ready to explore?',
  ctaBannerSubtext:   'Launch your introductory survey project in less than 90 seconds.',
  ctaBannerBtnText:   'Create Your First Survey Now →',
  ctaBannerBtnLink:   'https://survey.pepperwahl.com',
  eligibilityTitle:   "Let's check — are you eligible?",
  eligibilitySubtext: 'Fill in this quick survey to unlock your personalised plan.',
  eligibilityBtnText: 'Take the Survey →',
  eligibilityBtnLink: '{{SURVEY_LINK}}',
  step1Title:         'Generate with AI in seconds',
  step1Body:          'Describe your goal, let Pepperwahl draft multi-step questions and logic branching tailored to your exact audience.',
  step2Title:         'Distribute anywhere',
  step2Body:          'Share via direct link, embed in web apps, or trigger frictionless question modules in email notifications.',
  step3Title:         'Inspect live analytics',
  step3Body:          'Monitor completion rates, sentiment analysis, and instant drop-off reports with archival ledger-grade clarity.',
  centerBtnText:      'Create Your First Survey Now →',
  centerBtnLink:      'https://survey.pepperwahl.com',
  sideLink1Text:      'Explore Templates',
  sideLink1Url:       'https://survey.pepperwahl.com/templates',
  sideLink2Text:      'Quickstart Docs',
  sideLink2Url:       'https://survey.pepperwahl.com/docs',
  proTipText:         'Import your existing product spec into the AI Builder prompt, and watch Pepperwahl automatically architect optimal branching logic with zero manual scripting.',
  footerBrand:        'Pepperwahl Survey Intelligence',
  footerAddress:      '© 2025 Pepperwahl Inc. 450 Mission St, Suite 400, San Francisco, CA 94105.',
  footerUnsubUrl:     'https://survey.pepperwahl.com/unsubscribe',
  footerPrivacyUrl:   'https://survey.pepperwahl.com/privacy',
  footerSupportUrl:   'https://survey.pepperwahl.com/contact',
};

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml(f: TemplateFields): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>${esc(f.brandName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet"/>
<style>
  body{margin:0;padding:0;background:#FAF7F2;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1c1c18;}
  a{color:inherit;text-decoration:none;}
  .step-card{padding:12px 16px;border:1px solid #ebe8e2;border-radius:6px;margin-bottom:8px;}
</style>
</head>
<body style="background:#FAF7F2;padding:24px 8px;">
<div style="max-width:600px;margin:0 auto;">

  <!-- header -->
  <div style="background:#fff;border:1px solid #e1bebb;border-bottom:none;border-radius:8px 8px 0 0;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-family:'Newsreader',serif;font-size:20px;font-weight:600;color:#7a0009;letter-spacing:-0.01em;">${esc(f.brandName)}</span>
    <a href="${f.headerLink}" style="font-size:12px;font-weight:600;color:#7a0009;">Open Platform →</a>
  </div>

  <!-- body -->
  <div style="background:#fff;border:1px solid #e1bebb;border-top:none;border-radius:0 0 8px 8px;padding:40px 32px;">

    <!-- meta badge -->
    <div style="margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid #f0eee8;display:flex;align-items:center;justify-content:space-between;">
      <span style="background:#f0eee8;color:#605e5c;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:4px;">● Researcher Onboarding</span>
      <span style="color:#605e5c;font-size:11px;">Edition #01 · 3 min setup</span>
    </div>

    <!-- hero -->
    <h1 style="font-family:'Newsreader',serif;font-size:32px;line-height:1.25;font-weight:500;color:#7a0009;letter-spacing:-0.015em;margin:0 0 16px;">${esc(f.heroHeadline)}</h1>
    <p style="font-size:16px;line-height:1.65;color:#605e5c;margin:0 0 32px;">${esc(f.heroSubtext)}</p>

    <!-- primary CTA banner -->
    <div style="background:#f6f3ed;border:1px solid #e1bebb;border-radius:8px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <p style="font-size:14px;font-weight:600;color:#1c1c18;margin:0 0 4px;">${esc(f.ctaBannerTitle)}</p>
        <p style="font-size:12px;color:#605e5c;margin:0;">${esc(f.ctaBannerSubtext)}</p>
      </div>
      <a href="${f.ctaBannerBtnLink}" style="display:inline-block;background:#9e1b1b;color:#fff;padding:10px 20px;border-radius:4px;font-size:13px;font-weight:600;white-space:nowrap;">${esc(f.ctaBannerBtnText)}</a>
    </div>

    <!-- eligibility block -->
    <div style="background:#f6f3ed;border:1px solid #e1bebb;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="font-size:14px;font-weight:600;color:#1c1c18;margin:0 0 4px;">${esc(f.eligibilityTitle)}</p>
      <p style="font-size:12px;color:#605e5c;margin:0 0 16px;">${esc(f.eligibilitySubtext)}</p>
      <a href="${f.eligibilityBtnLink}" style="display:inline-block;background:#9e1b1b;color:#fff;padding:10px 22px;border-radius:4px;font-size:13px;font-weight:600;">${esc(f.eligibilityBtnText)}</a>
    </div>

    <!-- steps divider -->
    <div style="text-align:center;margin:24px 0 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#605e5c;">── Three-Step Quick Start ──</div>

    <!-- step 1 -->
    <div class="step-card">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="min-width:28px;height:28px;background:#FAF7F2;border:1px solid #ebe8e2;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#7a0009;">1</span>
        <div>
          <strong style="font-size:15px;color:#1c1c18;display:block;margin-bottom:2px;">${esc(f.step1Title)}</strong>
          <span style="font-size:13px;color:#605e5c;line-height:1.5;">${esc(f.step1Body)}</span>
        </div>
      </div>
    </div>

    <!-- step 2 -->
    <div class="step-card">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="min-width:28px;height:28px;background:#FAF7F2;border:1px solid #ebe8e2;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#7a0009;">2</span>
        <div>
          <strong style="font-size:15px;color:#1c1c18;display:block;margin-bottom:2px;">${esc(f.step2Title)}</strong>
          <span style="font-size:13px;color:#605e5c;line-height:1.5;">${esc(f.step2Body)}</span>
        </div>
      </div>
    </div>

    <!-- step 3 -->
    <div class="step-card" style="margin-bottom:28px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="min-width:28px;height:28px;background:#FAF7F2;border:1px solid #ebe8e2;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#7a0009;">3</span>
        <div>
          <strong style="font-size:15px;color:#1c1c18;display:block;margin-bottom:2px;">${esc(f.step3Title)}</strong>
          <span style="font-size:13px;color:#605e5c;line-height:1.5;">${esc(f.step3Body)}</span>
        </div>
      </div>
    </div>

    <!-- center CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${f.centerBtnLink}" style="display:inline-block;background:#9e1b1b;color:#fff;padding:12px 32px;border-radius:4px;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(158,27,27,0.2);margin-bottom:12px;">${esc(f.centerBtnText)}</a>
      <div style="font-size:12px;color:#605e5c;">
        <a href="${f.sideLink1Url}" style="color:#605e5c;text-decoration:underline;">${esc(f.sideLink1Text)}</a>
        &nbsp;·&nbsp;
        <a href="${f.sideLink2Url}" style="color:#605e5c;text-decoration:underline;">${esc(f.sideLink2Text)}</a>
      </div>
    </div>

    <!-- pro tip -->
    <div style="padding:14px 16px;background:#f0eee8;border-left:3px solid #7a0009;border-radius:0 4px 4px 0;font-size:12px;color:#484644;line-height:1.6;">
      <strong style="color:#1c1c18;">Pro-Tip from our Lead Researcher:</strong> ${esc(f.proTipText)}
    </div>

  </div><!-- /body -->

  <!-- footer -->
  <div style="margin-top:16px;background:#f6f3ed;border:1px solid #ebe8e2;border-radius:8px;padding:24px;text-align:center;">
    <p style="font-size:13px;font-weight:600;color:#59413e;margin:0 0 6px;">${esc(f.footerBrand)}</p>
    <p style="font-size:11px;color:#605e5c;margin:0 0 12px;">${esc(f.footerAddress)}</p>
    <div style="font-size:11px;color:#605e5c;">
      <a href="${f.footerUnsubUrl}" style="color:#605e5c;text-decoration:underline;">Unsubscribe</a>
      &nbsp;·&nbsp;
      <a href="${f.footerPrivacyUrl}" style="color:#605e5c;text-decoration:underline;">Privacy Policy</a>
      &nbsp;·&nbsp;
      <a href="${f.footerSupportUrl}" style="color:#605e5c;text-decoration:underline;">Contact Support</a>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Backend config shape ─────────────────────────────────────────────────────

interface OnboardConfig {
  subject:            string;
  html_body:          string;
  survey_link:        string;
  template_fields?:   TemplateFields;
  automation_enabled: boolean;
  updated_at?:        string;
}

type Toast = { type: 'success' | 'error'; text: string } | null;

// ─── Style tokens ─────────────────────────────────────────────────────────────

const S = {
  card: {
    background: '#FDFCFA',
    border: '1px solid #EBE8E3',
    borderRadius: 10,
    padding: '20px 24px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9B9189',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    margin: '0 0 12px',
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B6158',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 4,
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: '#F5F1E8',
    border: '1px solid #EBE8E3',
    borderRadius: 8,
    padding: '8px 11px',
    fontSize: 13,
    color: '#2D2520',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  btn: (accent = false, danger = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
    background: danger ? '#FEF2F2' : accent ? '#C4785C' : '#F5F1E8',
    color:      danger ? '#DC2626' : accent ? '#fff'    : '#6B6158',
    boxShadow:  accent ? '0 2px 8px rgba(196,120,92,0.25)' : 'none',
  }),
  row: { marginBottom: 14 } as React.CSSProperties,
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 14,
  } as React.CSSProperties,
  divider: {
    height: 1,
    background: '#EBE8E3',
    margin: '20px 0',
  } as React.CSSProperties,
};

// ─── Field row helpers ────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}> = ({ label, value, onChange, placeholder, multiline, hint }) => (
  <div style={S.row}>
    <label style={S.label}>{label}</label>
    {hint && <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9B9189' }}>{hint}</p>}
    {multiline
      ? <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.55, minHeight: 64 }}
        />
      : <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={S.input}
        />
    }
  </div>
);

const LinkPair: React.FC<{
  label: string;
  btnLabel: string; btnValue: string; onBtnChange: (v: string) => void;
  urlLabel: string; urlValue: string; onUrlChange: (v: string) => void;
  btnPlaceholder?: string; urlPlaceholder?: string;
}> = ({ label, btnLabel, btnValue, onBtnChange, urlLabel, urlValue, onUrlChange, btnPlaceholder, urlPlaceholder }) => (
  <div style={S.row}>
    <p style={{ ...S.sectionTitle, marginBottom: 8 }}>{label}</p>
    <div style={S.grid2}>
      <div>
        <label style={S.label}>{btnLabel}</label>
        <input value={btnValue} onChange={e => onBtnChange(e.target.value)} placeholder={btnPlaceholder} style={S.input} />
      </div>
      <div>
        <label style={S.label}>{urlLabel}</label>
        <input value={urlValue} onChange={e => onUrlChange(e.target.value)} placeholder={urlPlaceholder || 'https://'} style={S.input} />
      </div>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const OnboardMailTab: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const token   = () => localStorage.getItem('auth_token') || '';
  const apiBase = `${baseUrl}/api/admin/onboarding-email`;

  const [config,      setConfig]      = useState<OnboardConfig | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [toggling,    setToggling]    = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testEmail,   setTestEmail]   = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced,setShowAdvanced]= useState(false);
  const [toast,       setToast]       = useState<Toast>(null);

  // All structured fields + derived html
  const [fields, setFields]    = useState<TemplateFields>({ ...DEFAULT_FIELDS });
  const [subject, setSubject]  = useState(DEFAULT_FIELDS.emailSubject);
  const [htmlOverride, setHtmlOverride] = useState(''); // only used when advanced mode is active

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // helper to update a single field
  const setF = useCallback(<K extends keyof TemplateFields>(key: K, value: TemplateFields[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Build current HTML (from fields unless advanced override is active) ──
  const currentHtml = useCallback((): string => {
    if (showAdvanced && htmlOverride.trim()) return htmlOverride;
    return buildHtml({ ...fields, eligibilityBtnLink: fields.eligibilityBtnLink });
  }, [fields, showAdvanced, htmlOverride]);

  // ── Preview writer ──
  const refreshPreview = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return;
    let html = currentHtml();
    // substitute preview placeholders
    html = html
      .replace(/\{\{SURVEY_LINK\}\}/g,  fields.eligibilityBtnLink.startsWith('http') ? fields.eligibilityBtnLink : '#')
      .replace(/\{\{survey_link\}\}/g,  '#')
      .replace(/\{\{NAME\}\}/g,  'Preview User')
      .replace(/\{\{name\}\}/g,  'Preview User')
      .replace(/\{\{EMAIL\}\}/g, 'preview@example.com')
      .replace(/\{\{email\}\}/g, 'preview@example.com');
    doc.open(); doc.write(html); doc.close();
  }, [currentHtml, fields.eligibilityBtnLink]);

  useEffect(() => {
    if (!showPreview) return;
    const id = requestAnimationFrame(refreshPreview);
    return () => cancelAnimationFrame(id);
  }, [showPreview, refreshPreview]);

  // ── Toast ──
  const flash = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cfg: OnboardConfig = data.config;
      setConfig(cfg);
      setSubject(cfg.subject ?? DEFAULT_FIELDS.emailSubject);
      // Restore structured fields if saved, else defaults
      const savedFields: TemplateFields = cfg.template_fields
        ? { ...DEFAULT_FIELDS, ...cfg.template_fields }
        : { ...DEFAULT_FIELDS };
      setFields(savedFields);
      setHtmlOverride(cfg.html_body ?? '');
    } catch (e) {
      flash('error', `Failed to load config: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [apiBase, flash]);

  useEffect(() => { load(); }, [load]);

  // ── Save ──
  const save = async () => {
    setSaving(true);
    const builtHtml = currentHtml();
    try {
      const res = await fetch(apiBase, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          html_body: builtHtml,
          survey_link: fields.eligibilityBtnLink,
          template_fields: fields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      flash('success', 'Template saved successfully.');
      setConfig(c => c ? { ...c, subject, html_body: builtHtml, template_fields: fields } : c);
    } catch (e) {
      flash('error', `Save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle automation ──
  const toggleAutomation = async () => {
    if (!config) return;
    const next = !config.automation_enabled;
    setToggling(true);
    try {
      const res = await fetch(`${apiBase}/automation`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setConfig(c => c ? { ...c, automation_enabled: next } : c);
      flash('success', `Automation ${next ? 'enabled' : 'disabled'}.`);
    } catch (e) {
      flash('error', `Toggle failed: ${e}`);
    } finally {
      setToggling(false);
    }
  };

  // ── Send test ──
  const sendTest = async () => {
    if (!testEmail.trim()) { flash('error', 'Enter a test email address.'); return; }
    setTesting(true);
    try {
      const res = await fetch(`${apiBase}/send-test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      flash('success', `Test email sent to ${testEmail.trim()}`);
    } catch (e) {
      flash('error', `Test send failed: ${e}`);
    } finally {
      setTesting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: '#9B9189' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13 }}>Loading onboarding email config…</span>
      </div>
    );
  }

  const automationOn = config?.automation_enabled ?? false;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, fontFamily: "'Outfit', -apple-system, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 8,
          background: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`,
          color: toast.type === 'success' ? '#15803D' : '#DC2626',
          borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #C4785C 0%, #A8624A 100%)', boxShadow: '0 2px 8px rgba(196,120,92,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={15} color="#fff" />
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2D2520' }}>Onboard Mail</h2>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#9B9189', paddingLeft: 42 }}>
          Sent automatically to every new user after they confirm their email.
        </p>
      </div>

      {/* Automation card */}
      <div style={{ ...S.card, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: automationOn ? '#F0FDF4' : '#F5F1E8', border: `1px solid ${automationOn ? '#86EFAC' : '#EBE8E3'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color={automationOn ? '#15803D' : '#9B9189'} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2D2520' }}>
              Automation
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: automationOn ? '#F0FDF4' : '#F5F1E8', color: automationOn ? '#15803D' : '#9B9189', border: `1px solid ${automationOn ? '#86EFAC' : '#EBE8E3'}` }}>
                {automationOn ? 'ON' : 'OFF'}
              </span>
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9B9189' }}>
              {automationOn ? 'Every new signup will receive this email after confirming their address.' : 'Enable to automatically send this email on every new signup confirmation.'}
            </p>
          </div>
        </div>
        <button onClick={toggleAutomation} disabled={toggling} style={S.btn(automationOn)}>
          {toggling ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : automationOn ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          {automationOn ? 'Disable Automation' : 'Enable Automation'}
        </button>
      </div>

      {/* ── Two-column layout: editor left, preview right ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: structured editor ── */}
        <div>
          <div style={{ ...S.card, marginBottom: 0 }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2D2520' }}>Email Content</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={load} style={S.btn()} title="Reload from server"><RefreshCw size={12} /> Reload</button>
                <button onClick={() => { setShowPreview(p => { if (!p) requestAnimationFrame(refreshPreview); return !p; })} } style={S.btn()}>
                  {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPreview ? 'Hide Preview' : 'Live Preview'}
                </button>
                <button onClick={save} disabled={saving} style={S.btn(true)}>
                  {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* ── Email subject ── */}
            <Field
              label="Email Subject"
              value={subject}
              onChange={setSubject}
              placeholder="Welcome to Pepperwahl…"
            />

            <div style={S.divider} />

            {/* ── Header ── */}
            <p style={S.sectionTitle}>Header</p>
            <div style={S.grid2}>
              <Field label="Brand Name" value={fields.brandName} onChange={v => setF('brandName', v)} placeholder="Pepperwahl" />
              <Field label="Header Button URL" value={fields.headerLink} onChange={v => setF('headerLink', v)} placeholder="https://survey.pepperwahl.com" />
            </div>

            <div style={S.divider} />

            {/* ── Hero section ── */}
            <p style={S.sectionTitle}>Hero Section</p>
            <Field label="Headline" value={fields.heroHeadline} onChange={v => setF('heroHeadline', v)} multiline placeholder="Welcome to Pepperwahl…" />
            <Field label="Sub-text" value={fields.heroSubtext}  onChange={v => setF('heroSubtext', v)}  multiline placeholder="You've joined thousands of…" />

            <div style={S.divider} />

            {/* ── Primary CTA banner ── */}
            <LinkPair
              label="Primary CTA Banner"
              btnLabel="Banner Title"      btnValue={fields.ctaBannerTitle}      onBtnChange={v => setF('ctaBannerTitle', v)}      btnPlaceholder="Ready to explore?"
              urlLabel="Banner Sub-text"  urlValue={fields.ctaBannerSubtext}    onUrlChange={v => setF('ctaBannerSubtext', v)}
            />
            <LinkPair
              label="Primary CTA Button"
              btnLabel="Button Label"     btnValue={fields.ctaBannerBtnText}    onBtnChange={v => setF('ctaBannerBtnText', v)}    btnPlaceholder="Create Your First Survey →"
              urlLabel="Button URL"       urlValue={fields.ctaBannerBtnLink}    onUrlChange={v => setF('ctaBannerBtnLink', v)}
            />

            <div style={S.divider} />

            {/* ── Eligibility block ── */}
            <p style={S.sectionTitle}>Eligibility / Survey Block</p>
            <div style={S.grid2}>
              <Field label="Block Title"   value={fields.eligibilityTitle}   onChange={v => setF('eligibilityTitle', v)}   placeholder="Let's check — are you eligible?" />
              <Field label="Block Sub-text" value={fields.eligibilitySubtext} onChange={v => setF('eligibilitySubtext', v)} placeholder="Fill in this quick survey…" />
            </div>
            <LinkPair
              label="Eligibility Button"
              btnLabel="Button Label"   btnValue={fields.eligibilityBtnText}   onBtnChange={v => setF('eligibilityBtnText', v)}   btnPlaceholder="Take the Survey →"
              urlLabel="Survey URL"     urlValue={fields.eligibilityBtnLink}   onUrlChange={v => setF('eligibilityBtnLink', v)}   urlPlaceholder="{{SURVEY_LINK}} or paste URL"
            />
            <p style={{ margin: '-8px 0 14px', fontSize: 11, color: '#9B9189' }}>
              Use <code style={{ background: '#EBE8E3', padding: '1px 4px', borderRadius: 3 }}>{'{{SURVEY_LINK}}'}</code> to have the survey URL substituted from the automation, or paste a fixed URL directly.
            </p>

            <div style={S.divider} />

            {/* ── Steps ── */}
            <p style={S.sectionTitle}>Three-Step Quick Start</p>
            {([
              ['Step 1', 'step1Title', 'step1Body'],
              ['Step 2', 'step2Title', 'step2Body'],
              ['Step 3', 'step3Title', 'step3Body'],
            ] as [string, keyof TemplateFields, keyof TemplateFields][]).map(([label, titleKey, bodyKey]) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <p style={{ ...S.sectionTitle, marginBottom: 6, fontSize: 10 }}>{label}</p>
                <div style={S.grid2}>
                  <Field label="Title" value={fields[titleKey] as string} onChange={v => setF(titleKey, v)} placeholder={`Step title…`} />
                  <Field label="Body"  value={fields[bodyKey]  as string} onChange={v => setF(bodyKey,  v)} placeholder={`Step description…`} multiline />
                </div>
              </div>
            ))}

            <div style={S.divider} />

            {/* ── Center CTA ── */}
            <p style={S.sectionTitle}>Center Call-to-Action</p>
            <LinkPair
              label="Main Button"
              btnLabel="Button Label"   btnValue={fields.centerBtnText}  onBtnChange={v => setF('centerBtnText', v)}  btnPlaceholder="Create Your First Survey →"
              urlLabel="Button URL"     urlValue={fields.centerBtnLink}  onUrlChange={v => setF('centerBtnLink', v)}
            />
            <div style={S.grid2}>
              <div>
                <p style={{ ...S.sectionTitle, marginBottom: 6, fontSize: 10 }}>Side Link 1</p>
                <Field label="Label" value={fields.sideLink1Text} onChange={v => setF('sideLink1Text', v)} placeholder="Explore Templates" />
                <Field label="URL"   value={fields.sideLink1Url}  onChange={v => setF('sideLink1Url',  v)} placeholder="https://…" />
              </div>
              <div>
                <p style={{ ...S.sectionTitle, marginBottom: 6, fontSize: 10 }}>Side Link 2</p>
                <Field label="Label" value={fields.sideLink2Text} onChange={v => setF('sideLink2Text', v)} placeholder="Quickstart Docs" />
                <Field label="URL"   value={fields.sideLink2Url}  onChange={v => setF('sideLink2Url',  v)} placeholder="https://…" />
              </div>
            </div>

            <div style={S.divider} />

            {/* ── Pro tip ── */}
            <p style={S.sectionTitle}>Pro Tip</p>
            <Field label="Tip Text" value={fields.proTipText} onChange={v => setF('proTipText', v)} multiline placeholder="Import your existing product spec…" />

            <div style={S.divider} />

            {/* ── Footer ── */}
            <p style={S.sectionTitle}>Footer</p>
            <div style={S.grid2}>
              <Field label="Brand Line" value={fields.footerBrand}   onChange={v => setF('footerBrand', v)}   placeholder="Pepperwahl Survey Intelligence" />
              <Field label="Address"    value={fields.footerAddress}  onChange={v => setF('footerAddress', v)} placeholder="© 2025 Pepperwahl Inc.…" />
            </div>
            <div style={{ ...S.grid2 }}>
              <Field label="Unsubscribe URL"   value={fields.footerUnsubUrl}   onChange={v => setF('footerUnsubUrl', v)}   placeholder="https://…" />
              <Field label="Privacy Policy URL" value={fields.footerPrivacyUrl} onChange={v => setF('footerPrivacyUrl', v)} placeholder="https://…" />
            </div>
            <Field label="Support URL" value={fields.footerSupportUrl} onChange={v => setF('footerSupportUrl', v)} placeholder="https://…" />

            <div style={S.divider} />

            {/* ── Advanced HTML override (collapsible) ── */}
            <button
              onClick={() => setShowAdvanced(p => !p)}
              style={{ ...S.btn(), width: '100%', justifyContent: 'space-between', marginBottom: showAdvanced ? 12 : 0 }}
            >
              <span>Advanced: Raw HTML Override</span>
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showAdvanced && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9B9189' }}>
                  Paste or edit raw HTML below. When this field is non-empty it overrides the structured fields above.
                  Clear it to go back to the visual editor.
                </p>
                <textarea
                  value={htmlOverride}
                  onChange={e => setHtmlOverride(e.target.value)}
                  rows={20}
                  spellCheck={false}
                  style={{ ...S.input, resize: 'vertical', fontFamily: "'Fira Code','Courier New',monospace", fontSize: 11, lineHeight: 1.6, minHeight: 260 }}
                />
              </div>
            )}

          </div>{/* /editor card */}

          {/* Send test row */}
          <div style={{ ...S.card, marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={S.label}>Send Test Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTest()}
                placeholder="recipient@example.com"
                style={S.input}
              />
            </div>
            <button onClick={sendTest} disabled={testing} style={{ ...S.btn(true), flexShrink: 0 }}>
              {testing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {testing ? 'Sending…' : 'Send Test'}
            </button>
            <p style={{ flex: '100%', margin: '4px 0 0', fontSize: 11, color: '#9B9189' }}>
              Sends the <em>currently saved</em> template. Save first if you've made changes.
            </p>
          </div>
        </div>{/* /left col */}

        {/* ── RIGHT: live preview ── */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div style={{ ...S.card, padding: 0, overflow: 'hidden', display: showPreview ? 'block' : 'none' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #EBE8E3', background: '#F5F1E8', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#6B6158' }}>
              <Eye size={13} />
              Live Preview
              <span style={{ fontWeight: 400, fontSize: 11, color: '#9B9189', marginLeft: 4 }}>(sample values substituted)</span>
            </div>
            <iframe
              ref={iframeRef}
              title="Email Preview"
              sandbox="allow-same-origin"
              style={{ width: '100%', height: 'calc(100vh - 200px)', minHeight: 500, border: 'none', display: 'block' }}
            />
          </div>
          {!showPreview && (
            <div
              onClick={() => { setShowPreview(true); requestAnimationFrame(refreshPreview); }}
              style={{ ...S.card, cursor: 'pointer', textAlign: 'center', color: '#9B9189', padding: '40px 24px', border: '2px dashed #EBE8E3' }}
            >
              <Eye size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Click to open Live Preview</p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>Preview updates as you edit the fields on the left.</p>
            </div>
          )}
        </div>{/* /right col */}

      </div>{/* /grid */}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OnboardMailTab;
