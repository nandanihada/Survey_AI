/**
 * PublishToMoustacheModal
 *
 * Large two-panel modal:
 *  Left  — eligibility questions builder (1–5 questions) with preset templates
 *  Right — extra payload fields (payout, country, age, LOI, survey_type, notes)
 */
import React, { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  Send, CheckCircle, AlertCircle, Loader, DollarSign,
  Globe, Users, Clock, Tag, FileText, LayoutTemplate,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EligibilityQuestion {
  question: string;
  options: string[];
  qualify_if: string[];
}

export interface ExtraFields {
  payout: string;
  country: string;
  min_age: string;
  max_age: string;
  loi_minutes: string;
  survey_type: string;
  notes: string;
}

interface Props {
  surveyShortId: string;
  surveyTitle: string;
  existingMoustacheId?: string | null;
  existingQuestions?: EligibilityQuestion[];
  existingExtra?: Partial<ExtraFields>;
  onClose: () => void;
  onPublished: (moustacheSurveyId: string, status: string) => void;
}

// ─── Preset templates ─────────────────────────────────────────────────────────

const TEMPLATES: Array<{ label: string; desc: string; questions: EligibilityQuestion[] }> = [
  {
    label: 'Age + Country',
    desc: 'Basic eligibility: age 18+ and country',
    questions: [
      { question: 'How old are you?', options: ['Under 18', '18–24', '25–34', '35–54', '55+'], qualify_if: ['18–24', '25–34', '35–54', '55+'] },
      { question: 'Which country do you live in?', options: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Other'], qualify_if: ['United States'] },
    ],
  },
  {
    label: 'Homeowner',
    desc: 'Home renovation / real estate surveys',
    questions: [
      { question: 'Do you own or rent your home?', options: ['I own my home', 'I rent', 'Other'], qualify_if: ['I own my home'] },
      { question: 'Are you planning any home renovation in the next 6 months?', options: ['Yes', 'Maybe', 'No'], qualify_if: ['Yes', 'Maybe'] },
      { question: 'How old are you?', options: ['Under 18', '18–34', '35–54', '55+'], qualify_if: ['18–34', '35–54', '55+'] },
    ],
  },
  {
    label: 'Product Interest',
    desc: 'Consumer product / shopping surveys',
    questions: [
      { question: 'Have you purchased this type of product in the past 12 months?', options: ['Yes', 'No'], qualify_if: ['Yes'] },
      { question: 'How often do you shop online?', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'], qualify_if: ['Daily', 'Weekly', 'Monthly'] },
      { question: 'How old are you?', options: ['Under 18', '18–34', '35–54', '55+'], qualify_if: ['18–34', '35–54', '55+'] },
    ],
  },
  {
    label: 'Employment',
    desc: 'Job / career / B2B surveys',
    questions: [
      { question: 'What is your current employment status?', options: ['Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired'], qualify_if: ['Employed full-time', 'Employed part-time', 'Self-employed'] },
      { question: 'What is your job level?', options: ['Entry level', 'Mid level', 'Senior / Manager', 'Director / VP', 'C-Suite / Owner'], qualify_if: ['Mid level', 'Senior / Manager', 'Director / VP', 'C-Suite / Owner'] },
    ],
  },
  {
    label: 'Finance',
    desc: 'Financial products, insurance, investing',
    questions: [
      { question: 'Do you currently have any investments or savings accounts?', options: ['Yes', 'No', 'Prefer not to say'], qualify_if: ['Yes'] },
      { question: 'Are you interested in learning about financial products?', options: ['Yes', 'Maybe', 'No'], qualify_if: ['Yes', 'Maybe'] },
      { question: 'What is your annual household income?', options: ['Under $30k', '$30k–$60k', '$60k–$100k', '$100k+'], qualify_if: ['$30k–$60k', '$60k–$100k', '$100k+'] },
    ],
  },
  {
    label: 'Health & Wellness',
    desc: 'Healthcare, supplements, fitness surveys',
    questions: [
      { question: 'How would you rate your overall health?', options: ['Excellent', 'Good', 'Fair', 'Poor'], qualify_if: ['Excellent', 'Good', 'Fair'] },
      { question: 'Do you take any vitamins or supplements?', options: ['Yes, regularly', 'Yes, occasionally', 'No'], qualify_if: ['Yes, regularly', 'Yes, occasionally'] },
      { question: 'How old are you?', options: ['Under 18', '18–34', '35–54', '55+'], qualify_if: ['18–34', '35–54', '55+'] },
    ],
  },
  {
    label: 'Tech / Software',
    desc: 'Technology, SaaS, apps, devices',
    questions: [
      { question: 'Do you use any software tools at work?', options: ['Yes', 'No'], qualify_if: ['Yes'] },
      { question: 'How comfortable are you with technology?', options: ['Very comfortable', 'Somewhat comfortable', 'Not comfortable'], qualify_if: ['Very comfortable', 'Somewhat comfortable'] },
    ],
  },
  {
    label: 'Automotive',
    desc: 'Car buying, insurance, services',
    questions: [
      { question: 'Do you own or lease a vehicle?', options: ['Yes, I own', 'Yes, I lease', 'No'], qualify_if: ['Yes, I own', 'Yes, I lease'] },
      { question: 'Are you planning to buy or lease a vehicle in the next 12 months?', options: ['Yes', 'Maybe', 'No'], qualify_if: ['Yes', 'Maybe'] },
    ],
  },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

const blankQuestion = (): EligibilityQuestion => ({ question: '', options: ['Yes', 'No'], qualify_if: [] });

const defaultExtra = (): ExtraFields => ({
  payout: '', country: 'US', min_age: '18', max_age: '',
  loi_minutes: '', survey_type: 'product_interest', notes: '',
});

const SURVEY_TYPES = [
  { value: 'product_interest',  label: 'Product Interest' },
  { value: 'brand_awareness',   label: 'Brand Awareness' },
  { value: 'consumer_research', label: 'Consumer Research' },
  { value: 'job_research',      label: 'Job / Career' },
  { value: 'financial',         label: 'Financial' },
  { value: 'automotive',        label: 'Automotive' },
  { value: 'technology',        label: 'Technology' },
  { value: 'health',            label: 'Health & Wellness' },
  { value: 'other',             label: 'Other' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const PublishToMoustacheModal: React.FC<Props> = ({
  surveyShortId,
  surveyTitle,
  existingMoustacheId,
  existingQuestions,
  existingExtra,
  onClose,
  onPublished,
}) => {
  const baseUrl = getApiBaseUrl();

  const [questions, setQuestions] = useState<EligibilityQuestion[]>(
    existingQuestions?.length ? existingQuestions : [blankQuestion()]
  );
  const [extra, setExtra] = useState<ExtraFields>({ ...defaultExtra(), ...(existingExtra || {}) });
  const [expandedIdx, setExpandedIdx] = useState<number>(0);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; moustacheId?: string } | null>(null);

  useEffect(() => {
    if (existingQuestions?.length) setQuestions(existingQuestions);
    if (existingExtra) setExtra(e => ({ ...e, ...existingExtra }));
  }, [surveyShortId]);

  // ── Question helpers ───────────────────────────────────────────────────────

  const updateQuestion = (idx: number, text: string) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, question: text } : q));

  const updateOption = (qIdx: number, oIdx: number, value: string) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const old = q.options[oIdx];
      return {
        ...q,
        options: q.options.map((o, j) => j === oIdx ? value : o),
        qualify_if: q.qualify_if.map(qi => qi === old ? value : qi),
      };
    }));

  const addOption = (qIdx: number) =>
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));

  const removeOption = (qIdx: number, oIdx: number) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const removed = q.options[oIdx];
      return { ...q, options: q.options.filter((_, j) => j !== oIdx), qualify_if: q.qualify_if.filter(qi => qi !== removed) };
    }));

  const toggleQualifyIf = (qIdx: number, option: string) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const has = q.qualify_if.includes(option);
      return { ...q, qualify_if: has ? q.qualify_if.filter(qi => qi !== option) : [...q.qualify_if, option] };
    }));

  const addQuestion = () => {
    if (questions.length >= 5) return;
    setQuestions(prev => [...prev, blankQuestion()]);
    setExpandedIdx(questions.length);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setExpandedIdx(Math.max(0, idx - 1));
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Question ${i + 1} is missing its text.`;
      if (q.options.filter(o => o.trim()).length < 2) return `Question ${i + 1} needs at least 2 answer options.`;
      if (!q.qualify_if.length) return `Question ${i + 1}: select at least one qualifying answer.`;
    }
    return null;
  };

  // ── Publish ────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const err = validate();
    if (err) { setResult({ success: false, message: err }); return; }

    const cleanedQuestions = questions.map(q => ({
      ...q, options: q.options.filter(o => o.trim()),
    }));

    setPublishing(true);
    setResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/surveys/${surveyShortId}/publish-to-moustache`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: cleanedQuestions, extra }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: data.message, moustacheId: data.moustache_survey_id });
        onPublished(data.moustache_survey_id, data.status);
      } else {
        setResult({ success: false, message: data.error || 'Publishing failed.' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  // ─── Shared styles ────────────────────────────────────────────────────────

  const C = {
    overlay: {
      position: 'fixed' as const, inset: 0, background: 'rgba(45,37,32,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    modal: {
      background: '#FDFCFA', borderRadius: 18,
      width: '100%', maxWidth: 940, height: '90vh', maxHeight: '90vh',
      display: 'flex', flexDirection: 'column' as const,
      boxShadow: '0 24px 70px rgba(45,37,32,0.25)', border: '1px solid #EBE8E3',
      overflow: 'hidden', fontFamily: "'Outfit', -apple-system, sans-serif",
    },
    header: {
      padding: '16px 24px', borderBottom: '1px solid #EBE8E3',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0,
    },
    body: {
      flex: '1 1 0', display: 'flex', overflow: 'hidden', minHeight: 0, height: 0,
    },
    panel: {
      flex: '1 1 0', overflowY: 'auto' as const, padding: '20px 22px',
      display: 'flex', flexDirection: 'column' as const, gap: 12,
      scrollbarWidth: 'none' as const, minHeight: 0, paddingBottom: 24,
    },
    divider: { width: 1, background: '#EBE8E3', flexShrink: 0 },
    footer: {
      padding: '13px 24px', borderTop: '1px solid #EBE8E3',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexShrink: 0,
    },
    card: { border: '1px solid #EBE8E3', borderRadius: 11, overflow: 'visible' },
    cardHead: (expanded: boolean) => ({
      padding: '10px 14px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 10, cursor: 'pointer',
      background: expanded ? '#FEF9F7' : '#FDFCFA',
      borderBottom: expanded ? '1px solid #EBE8E3' : 'none',
    }),
    cardBody: { padding: '13px 14px', display: 'flex', flexDirection: 'column' as const, gap: 11 },
    label: { fontSize: 10.5, fontWeight: 700, color: '#6B6158', marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.07em' },
    input: { width: '100%', border: '1px solid #EBE8E3', borderRadius: 8, padding: '7px 11px', fontSize: 13, color: '#2D2520', background: '#FDFCFA', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const },
    select: { width: '100%', border: '1px solid #EBE8E3', borderRadius: 8, padding: '7px 11px', fontSize: 13, color: '#2D2520', background: '#FDFCFA', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' },
    pill: (active: boolean) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
      borderRadius: 20, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
      border: `1px solid ${active ? '#10B981' : '#EBE8E3'}`,
      background: active ? '#ECFDF5' : '#F5F1E8',
      color: active ? '#059669' : '#9B9189',
      transition: 'all 0.1s', userSelect: 'none' as const, flexShrink: 0,
    }),
    btnGhost: { background: 'transparent', border: '1px solid #EBE8E3', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#6B6158', cursor: 'pointer', fontFamily: 'inherit' },
    btnPrimary: (disabled: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 7,
      background: disabled ? '#E8D5CC' : 'linear-gradient(135deg, #C4785C 0%, #A8624A 100%)',
      color: disabled ? '#B09080' : '#fff', border: 'none', borderRadius: 10,
      padding: '9px 22px', fontSize: 13, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      boxShadow: disabled ? 'none' : '0 2px 8px rgba(196,120,92,0.3)',
    }),
    addBtn: {
      display: 'flex', alignItems: 'center', gap: 6, background: '#F5F1E8',
      border: '1px dashed #C4A99A', borderRadius: 9, padding: '7px 12px',
      fontSize: 11.5, fontWeight: 600, color: '#9B7A6E', cursor: 'pointer',
      fontFamily: 'inherit', width: '100%', justifyContent: 'center',
    },
    fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#9B9189', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 2 },
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={C.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={C.modal}>

        {/* ── Header ── */}
        <div style={C.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#F5C842', fontSize: 16, fontWeight: 900 }}>M</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#2D2520', margin: 0 }}>
                {existingMoustacheId ? 'Update on Moustache Leads' : 'Publish to Moustache Leads'}
              </p>
              <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>{surveyTitle}</p>
            </div>
            {existingMoustacheId && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '3px 10px', marginLeft: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Live · {existingMoustacheId}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#9B9189" />
          </button>
        </div>

        {/* ── Body (two panels) ── */}
        <div style={C.body}>

          {/* LEFT — Eligibility questions */}
          <div className="moustache-panel" style={{ ...C.panel, maxWidth: 500 }}>
            <div>
              <p style={C.sectionTitle}>Pre-screening questions</p>
              <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>
                Users on Moustache answer these first. Only those who pick a <span style={{ color: '#059669', fontWeight: 700 }}>qualifying</span> answer on every question are forwarded to your survey.
              </p>
            </div>

            {/* Template picker */}
            <div style={{ border: '1px solid #EBE8E3', borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', background: '#F9F7F4', borderBottom: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', gap: 7 }}>
                <LayoutTemplate size={12} color="#9B9189" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6158', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>Load a preset template</span>
                <span style={{ fontSize: 10, color: '#C4A99A', marginLeft: 4 }}>— replaces current questions, then edit freely</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap' as const, gap: 7 }}>
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    title={t.desc}
                    onClick={() => { setQuestions(t.questions.map(q => ({ ...q }))); setExpandedIdx(0); }}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20,
                      border: '1px solid #EBE8E3', background: '#FDFCFA', color: '#6B6158',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF0EC'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C4785C'; (e.currentTarget as HTMLButtonElement).style.color = '#C4785C'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDFCFA'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#EBE8E3'; (e.currentTarget as HTMLButtonElement).style.color = '#6B6158'; }}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  title="Start with a blank question"
                  onClick={() => { setQuestions([blankQuestion()]); setExpandedIdx(0); }}
                  style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20, border: '1px dashed #C4A99A', background: '#F5F1E8', color: '#9B7A6E', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  + Blank
                </button>
              </div>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} style={C.card}>
                <div style={C.cardHead(expandedIdx === qIdx)} onClick={() => setExpandedIdx(expandedIdx === qIdx ? -1 : qIdx)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: '#C4785C', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {qIdx + 1}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: q.question.trim() ? '#2D2520' : '#C4A99A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.question.trim() || 'Untitled question…'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {q.qualify_if.length > 0 && (
                      <span style={{ fontSize: 9.5, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                        {q.qualify_if.length} pass
                      </span>
                    )}
                    {questions.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); removeQuestion(qIdx); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A99A', display: 'flex', padding: 1 }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                    {expandedIdx === qIdx ? <ChevronUp size={13} color="#9B9189" /> : <ChevronDown size={13} color="#9B9189" />}
                  </div>
                </div>

                {expandedIdx === qIdx && (
                  <div style={C.cardBody}>
                    <div>
                      <label style={C.label}>Question text</label>
                      <input style={C.input} placeholder="e.g. Are you a homeowner?" value={q.question} onChange={e => updateQuestion(qIdx, e.target.value)} />
                    </div>
                    <div>
                      <label style={C.label}>Options · click pill to set pass/fail</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {q.options.map((opt, oIdx) => {
                          const isQ = q.qualify_if.includes(opt);
                          return (
                            <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <input style={{ ...C.input, flex: 1 }} placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} />
                              <button onClick={() => opt.trim() && toggleQualifyIf(qIdx, opt)} style={C.pill(isQ)}>
                                {isQ ? '✓ Pass' : '✗ Fail'}
                              </button>
                              {q.options.length > 2 && (
                                <button onClick={() => removeOption(qIdx, oIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A99A', display: 'flex', padding: 1, flexShrink: 0 }}>
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {q.options.length < 6 && (
                        <button onClick={() => addOption(qIdx)} style={{ ...C.addBtn, marginTop: 7, padding: '5px 10px', fontSize: 11 }}>
                          <Plus size={11} /> Add option
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {questions.length < 5 && (
              <button style={C.addBtn} onClick={addQuestion}>
                <Plus size={13} /> Add question ({questions.length}/5)
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={C.divider} />

          {/* RIGHT — Extra payload fields */}
          <div className="moustache-panel" style={{ ...C.panel, minWidth: 280, maxWidth: 360 }}>
            <div>
              <p style={C.sectionTitle}>Survey details</p>
              <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>
                These are sent alongside questions to Moustache for targeting, templating and reward setup.
              </p>
            </div>

            {/* Payout */}
            <div>
              <label style={C.label}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={11} /> Payout (USD)</span>
              </label>
              <input
                style={C.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2.50"
                value={extra.payout}
                onChange={e => setExtra(x => ({ ...x, payout: e.target.value }))}
              />
            </div>

            {/* Survey Type */}
            <div>
              <label style={C.label}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Tag size={11} /> Survey type</span>
              </label>
              <select style={C.select} value={extra.survey_type} onChange={e => setExtra(x => ({ ...x, survey_type: e.target.value }))}>
                {SURVEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Country */}
            <div>
              <label style={C.label}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe size={11} /> Country</span>
              </label>
              <input style={C.input} placeholder="e.g. US, IN, GB" value={extra.country} onChange={e => setExtra(x => ({ ...x, country: e.target.value }))} />
            </div>

            {/* Age range */}
            <div>
              <label style={C.label}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={11} /> Target age range</span>
              </label>
              <div style={C.fieldRow}>
                <input style={C.input} type="number" placeholder="Min age (e.g. 18)" value={extra.min_age} onChange={e => setExtra(x => ({ ...x, min_age: e.target.value }))} />
                <input style={C.input} type="number" placeholder="Max age (blank = any)" value={extra.max_age} onChange={e => setExtra(x => ({ ...x, max_age: e.target.value }))} />
              </div>
            </div>

            {/* LOI */}
            <div>
              <label style={C.label}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} /> LOI (minutes)</span>
              </label>
              <input style={C.input} type="number" min="1" placeholder="e.g. 10" value={extra.loi_minutes} onChange={e => setExtra(x => ({ ...x, loi_minutes: e.target.value }))} />
            </div>

            {/* Notes */}
            <div>
              <label style={C.label}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={11} /> Notes (internal)</span>
              </label>
              <textarea
                style={{ ...C.input, resize: 'vertical' as const, minHeight: 70 }}
                placeholder="Any instructions or context for Moustache…"
                value={extra.notes}
                onChange={e => setExtra(x => ({ ...x, notes: e.target.value }))}
              />
            </div>

            {/* Result banner */}
            {result && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 13px', borderRadius: 10,
                background: result.success ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${result.success ? '#A7F3D0' : '#FECACA'}`,
              }}>
                {result.success
                  ? <CheckCircle size={15} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: result.success ? '#065F46' : '#991B1B', margin: 0 }}>
                    {result.success ? (existingMoustacheId ? 'Updated' : 'Published!') : 'Failed'}
                  </p>
                  <p style={{ fontSize: 11.5, color: result.success ? '#047857' : '#B91C1C', margin: '2px 0 0' }}>{result.message}</p>
                  {result.moustacheId && (
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>
                      Moustache ID: <strong>{result.moustacheId}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={C.footer}>
          <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}
            {extra.payout ? ` · $${extra.payout} payout` : ''}
            {extra.country ? ` · ${extra.country}` : ''}
            {extra.loi_minutes ? ` · ${extra.loi_minutes} min` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {result?.success ? (
              <button style={C.btnGhost} onClick={onClose}>Close</button>
            ) : (
              <>
                <button style={C.btnGhost} onClick={onClose} disabled={publishing}>Cancel</button>
                <button style={C.btnPrimary(publishing)} onClick={handlePublish} disabled={publishing}>
                  {publishing
                    ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</>
                    : <><Send size={13} /> {existingMoustacheId ? 'Update on Moustache' : 'Publish to Moustache'}</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .moustache-panel::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PublishToMoustacheModal;
