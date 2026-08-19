/**
 * BulkPublishToMoustacheModal
 *
 * Publishes multiple selected surveys to Moustache Leads using a
 * shared questions template + extra fields.
 */
import React, { useState } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  Send, CheckCircle, AlertCircle, Loader,
  DollarSign, Globe, Users, Clock, Tag, FileText, LayoutTemplate,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/deploymentFix';
import { EligibilityQuestion, ExtraFields } from './PublishToMoustacheModal';

// ─── Shared templates (same as single modal) ─────────────────────────────────

const TEMPLATES: Array<{ label: string; questions: EligibilityQuestion[] }> = [
  {
    label: 'Age + Country',
    questions: [
      { question: 'How old are you?', options: ['Under 18', '18–24', '25–34', '35–54', '55+'], qualify_if: ['18–24', '25–34', '35–54', '55+'] },
      { question: 'Which country do you live in?', options: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Other'], qualify_if: ['United States'] },
    ],
  },
  {
    label: 'Homeowner',
    questions: [
      { question: 'Do you own or rent your home?', options: ['I own my home', 'I rent', 'Other'], qualify_if: ['I own my home'] },
      { question: 'Are you planning any home renovation in the next 6 months?', options: ['Yes', 'Maybe', 'No'], qualify_if: ['Yes', 'Maybe'] },
      { question: 'How old are you?', options: ['Under 18', '18–34', '35–54', '55+'], qualify_if: ['18–34', '35–54', '55+'] },
    ],
  },
  {
    label: 'Product Interest',
    questions: [
      { question: 'Have you purchased this type of product in the past 12 months?', options: ['Yes', 'No'], qualify_if: ['Yes'] },
      { question: 'How often do you shop online?', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'], qualify_if: ['Daily', 'Weekly', 'Monthly'] },
      { question: 'How old are you?', options: ['Under 18', '18–34', '35–54', '55+'], qualify_if: ['18–34', '35–54', '55+'] },
    ],
  },
  {
    label: 'Employment',
    questions: [
      { question: 'What is your current employment status?', options: ['Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired'], qualify_if: ['Employed full-time', 'Employed part-time', 'Self-employed'] },
      { question: 'What is your job level?', options: ['Entry level', 'Mid level', 'Senior / Manager', 'Director / VP', 'C-Suite / Owner'], qualify_if: ['Mid level', 'Senior / Manager', 'Director / VP', 'C-Suite / Owner'] },
    ],
  },
  {
    label: 'Finance',
    questions: [
      { question: 'Do you currently have any investments or savings accounts?', options: ['Yes', 'No', 'Prefer not to say'], qualify_if: ['Yes'] },
      { question: 'Are you interested in learning about financial products?', options: ['Yes', 'Maybe', 'No'], qualify_if: ['Yes', 'Maybe'] },
      { question: 'What is your annual household income?', options: ['Under $30k', '$30k–$60k', '$60k–$100k', '$100k+'], qualify_if: ['$30k–$60k', '$60k–$100k', '$100k+'] },
    ],
  },
  {
    label: 'Health',
    questions: [
      { question: 'How would you rate your overall health?', options: ['Excellent', 'Good', 'Fair', 'Poor'], qualify_if: ['Excellent', 'Good', 'Fair'] },
      { question: 'Do you take any vitamins or supplements?', options: ['Yes, regularly', 'Yes, occasionally', 'No'], qualify_if: ['Yes, regularly', 'Yes, occasionally'] },
    ],
  },
  {
    label: 'Tech',
    questions: [
      { question: 'Do you use any software tools at work?', options: ['Yes', 'No'], qualify_if: ['Yes'] },
      { question: 'How comfortable are you with technology?', options: ['Very comfortable', 'Somewhat comfortable', 'Not comfortable'], qualify_if: ['Very comfortable', 'Somewhat comfortable'] },
    ],
  },
  {
    label: 'Automotive',
    questions: [
      { question: 'Do you own or lease a vehicle?', options: ['Yes, I own', 'Yes, I lease', 'No'], qualify_if: ['Yes, I own', 'Yes, I lease'] },
      { question: 'Are you planning to buy or lease a vehicle in the next 12 months?', options: ['Yes', 'Maybe', 'No'], qualify_if: ['Yes', 'Maybe'] },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkResult {
  survey_id: string;
  survey_name: string;
  success: boolean;
  moustache_survey_id?: string;
  status?: string;
  error?: string;
}

interface Props {
  surveys: Array<{ short_id: string; title: string }>;
  onClose: () => void;
  onDone: (results: BulkResult[]) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const blankQ = (): EligibilityQuestion => ({ question: '', options: ['Yes', 'No'], qualify_if: [] });

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

const BulkPublishToMoustacheModal: React.FC<Props> = ({ surveys, onClose, onDone }) => {
  const baseUrl = getApiBaseUrl();

  const [questions, setQuestions] = useState<EligibilityQuestion[]>([blankQ()]);
  const [extra, setExtra] = useState<ExtraFields>(defaultExtra());
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Question helpers (same as single modal) ────────────────────────────────

  const updateQuestion = (idx: number, text: string) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, question: text } : q));

  const updateOption = (qIdx: number, oIdx: number, value: string) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const old = q.options[oIdx];
      return { ...q, options: q.options.map((o, j) => j === oIdx ? value : o), qualify_if: q.qualify_if.map(qi => qi === old ? value : qi) };
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
    setQuestions(prev => [...prev, blankQ()]);
    setExpandedIdx(questions.length);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setExpandedIdx(Math.max(0, idx - 1));
  };

  // ── Validate ───────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Question ${i + 1} is missing its text.`;
      if (q.options.filter(o => o.trim()).length < 2) return `Question ${i + 1} needs at least 2 options.`;
      if (!q.qualify_if.length) return `Question ${i + 1}: select at least one qualifying answer.`;
    }
    return null;
  };

  // ── Publish ────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setPublishing(true);

    const cleanedQuestions = questions.map(q => ({ ...q, options: q.options.filter(o => o.trim()) }));

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/surveys/bulk-publish-to-moustache`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_short_ids: surveys.map(s => s.short_id),
          questions: cleanedQuestions,
          extra,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        onDone(data.results);
      } else {
        setError(data.error || 'Bulk publish failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const C = {
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(45,37,32,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal:   { background: '#FDFCFA', borderRadius: 18, width: '100%', maxWidth: 980, height: '90vh', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 24px 70px rgba(45,37,32,0.25)', border: '1px solid #EBE8E3', overflow: 'hidden', fontFamily: "'Outfit', -apple-system, sans-serif" },
    header:  { padding: '16px 24px', borderBottom: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
    body:    { flex: '1 1 0', display: 'flex', overflow: 'hidden', minHeight: 0, height: 0 },
    panel:   { flex: '1 1 0', overflowY: 'auto' as const, padding: '18px 20px', display: 'flex', flexDirection: 'column' as const, gap: 11, scrollbarWidth: 'none' as const, paddingBottom: 20 },
    divider: { width: 1, background: '#EBE8E3', flexShrink: 0 },
    footer:  { padding: '13px 24px', borderTop: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 },
    card:    { border: '1px solid #EBE8E3', borderRadius: 10, overflow: 'visible' },
    cardHead:(exp: boolean) => ({ padding: '9px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', background: exp ? '#FEF9F7' : '#FDFCFA', borderBottom: exp ? '1px solid #EBE8E3' : 'none' }),
    cardBody:{ padding: '12px 13px', display: 'flex', flexDirection: 'column' as const, gap: 10 },
    label:   { fontSize: 10.5, fontWeight: 700, color: '#6B6158', marginBottom: 3, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.07em' },
    input:   { width: '100%', border: '1px solid #EBE8E3', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, color: '#2D2520', background: '#FDFCFA', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const },
    select:  { width: '100%', border: '1px solid #EBE8E3', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, color: '#2D2520', background: '#FDFCFA', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' },
    pill:    (active: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${active ? '#10B981' : '#EBE8E3'}`, background: active ? '#ECFDF5' : '#F5F1E8', color: active ? '#059669' : '#9B9189', userSelect: 'none' as const, flexShrink: 0 }),
    addBtn:  { display: 'flex', alignItems: 'center', gap: 5, background: '#F5F1E8', border: '1px dashed #C4A99A', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#9B7A6E', cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' },
    btnGhost:{ background: 'transparent', border: '1px solid #EBE8E3', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#6B6158', cursor: 'pointer', fontFamily: 'inherit' },
    btnPrimary:(dis: boolean) => ({ display: 'flex', alignItems: 'center', gap: 7, background: dis ? '#E8D5CC' : 'linear-gradient(135deg, #C4785C 0%, #A8624A 100%)', color: dis ? '#B09080' : '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: dis ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: dis ? 'none' : '0 2px 8px rgba(196,120,92,0.3)' }),
    fieldRow:{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 } as const,
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#9B9189', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 2 },
  };

  const successCount = results?.filter(r => r.success).length ?? 0;
  const failCount    = results?.filter(r => !r.success).length ?? 0;

  return (
    <div style={C.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={C.modal}>

        {/* Header */}
        <div style={C.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#F5C842', fontSize: 16, fontWeight: 900 }}>M</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#2D2520', margin: 0 }}>
                Bulk Publish to Moustache Leads
              </p>
              <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>
                {surveys.length} survey{surveys.length !== 1 ? 's' : ''} selected — same questions &amp; settings applied to all
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F5F1E8', border: '1px solid #EBE8E3', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#9B9189" />
          </button>
        </div>

        {/* Body */}
        <div style={C.body}>

          {/* COLUMN 1 — Survey list */}
          <div className="bulk-panel" style={{ ...C.panel, minWidth: 200, maxWidth: 240, background: '#F9F7F4', borderRight: '1px solid #EBE8E3' }}>
            <p style={C.sectionTitle}>Selected surveys</p>
            {surveys.map(s => (
              <div key={s.short_id} style={{ padding: '7px 10px', borderRadius: 8, background: '#FDFCFA', border: '1px solid #EBE8E3' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#2D2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                <p style={{ fontSize: 10, color: '#9B9189', margin: '2px 0 0' }}>{s.short_id}</p>
                {/* Per-survey result after publish */}
                {results && (() => {
                  const r = results.find(x => x.survey_id === s.short_id);
                  if (!r) return null;
                  return r.success
                    ? <p style={{ fontSize: 10, color: '#059669', margin: '3px 0 0', fontWeight: 600 }}>✓ Published</p>
                    : <p style={{ fontSize: 10, color: '#DC2626', margin: '3px 0 0', fontWeight: 600 }}>✗ {r.error}</p>;
                })()}
              </div>
            ))}
          </div>

          {/* COLUMN 2 — Questions */}
          <div className="bulk-panel" style={{ ...C.panel, maxWidth: 420 }}>
            <div>
              <p style={C.sectionTitle}>Pre-screening questions</p>
              <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>These same questions are applied to every selected survey.</p>
            </div>

            {/* Template picker */}
            <div style={{ border: '1px solid #EBE8E3', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#F9F7F4', borderBottom: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', gap: 6 }}>
                <LayoutTemplate size={11} color="#9B9189" />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6B6158', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>Load preset</span>
              </div>
              <div style={{ padding: '9px 10px', display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => { setQuestions(t.questions.map(q => ({ ...q }))); setExpandedIdx(0); }}
                    style={{ fontSize: 10.5, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #EBE8E3', background: '#FDFCFA', color: '#6B6158', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF0EC'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C4785C'; (e.currentTarget as HTMLButtonElement).style.color = '#C4785C'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDFCFA'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#EBE8E3'; (e.currentTarget as HTMLButtonElement).style.color = '#6B6158'; }}
                  >{t.label}</button>
                ))}
                <button
                  onClick={() => { setQuestions([blankQ()]); setExpandedIdx(0); }}
                  style={{ fontSize: 10.5, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px dashed #C4A99A', background: '#F5F1E8', color: '#9B7A6E', cursor: 'pointer', fontFamily: 'inherit' }}
                >+ Blank</button>
              </div>
            </div>
            {questions.map((q, qIdx) => (
              <div key={qIdx} style={C.card}>
                <div style={C.cardHead(expandedIdx === qIdx)} onClick={() => setExpandedIdx(expandedIdx === qIdx ? -1 : qIdx)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span style={{ width: 19, height: 19, borderRadius: 5, background: '#C4785C', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{qIdx + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: q.question.trim() ? '#2D2520' : '#C4A99A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.question.trim() || 'Untitled question…'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {q.qualify_if.length > 0 && <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: 7, fontWeight: 700 }}>{q.qualify_if.length} pass</span>}
                    {questions.length > 1 && <button onClick={e => { e.stopPropagation(); removeQuestion(qIdx); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A99A', display: 'flex', padding: 1 }}><Trash2 size={11} /></button>}
                    {expandedIdx === qIdx ? <ChevronUp size={12} color="#9B9189" /> : <ChevronDown size={12} color="#9B9189" />}
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
                            <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input style={{ ...C.input, flex: 1 }} placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} />
                              <button onClick={() => opt.trim() && toggleQualifyIf(qIdx, opt)} style={C.pill(isQ)}>{isQ ? '✓ Pass' : '✗ Fail'}</button>
                              {q.options.length > 2 && <button onClick={() => removeOption(qIdx, oIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A99A', display: 'flex', padding: 1, flexShrink: 0 }}><X size={11} /></button>}
                            </div>
                          );
                        })}
                      </div>
                      {q.options.length < 6 && <button onClick={() => addOption(qIdx)} style={{ ...C.addBtn, marginTop: 6 }}><Plus size={10} /> Add option</button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {questions.length < 5 && <button style={C.addBtn} onClick={addQuestion}><Plus size={12} /> Add question ({questions.length}/5)</button>}
          </div>

          {/* Divider */}
          <div style={C.divider} />

          {/* COLUMN 3 — Extra fields */}
          <div className="bulk-panel" style={{ ...C.panel, minWidth: 240, maxWidth: 320 }}>
            <div>
              <p style={C.sectionTitle}>Survey details</p>
              <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>Applied to all selected surveys.</p>
            </div>

            <div>
              <label style={C.label}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={10} /> Payout (USD)</span></label>
              <input style={C.input} type="number" min="0" step="0.01" placeholder="e.g. 2.50" value={extra.payout} onChange={e => setExtra(x => ({ ...x, payout: e.target.value }))} />
            </div>

            <div>
              <label style={C.label}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={10} /> Survey type</span></label>
              <select style={C.select} value={extra.survey_type} onChange={e => setExtra(x => ({ ...x, survey_type: e.target.value }))}>
                {SURVEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label style={C.label}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={10} /> Country</span></label>
              <input style={C.input} placeholder="e.g. US, IN, GB" value={extra.country} onChange={e => setExtra(x => ({ ...x, country: e.target.value }))} />
            </div>

            <div>
              <label style={C.label}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} /> Target age range</span></label>
              <div style={C.fieldRow}>
                <input style={C.input} type="number" placeholder="Min (e.g. 18)" value={extra.min_age} onChange={e => setExtra(x => ({ ...x, min_age: e.target.value }))} />
                <input style={C.input} type="number" placeholder="Max (blank=any)" value={extra.max_age} onChange={e => setExtra(x => ({ ...x, max_age: e.target.value }))} />
              </div>
            </div>

            <div>
              <label style={C.label}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> LOI (minutes)</span></label>
              <input style={C.input} type="number" min="1" placeholder="e.g. 10" value={extra.loi_minutes} onChange={e => setExtra(x => ({ ...x, loi_minutes: e.target.value }))} />
            </div>

            <div>
              <label style={C.label}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={10} /> Notes (internal)</span></label>
              <textarea style={{ ...C.input, resize: 'vertical' as const, minHeight: 60 }} placeholder="Instructions for Moustache…" value={extra.notes} onChange={e => setExtra(x => ({ ...x, notes: e.target.value }))} />
            </div>

            {/* Inline error */}
            {error && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertCircle size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Results summary */}
            {results && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 9, background: failCount === 0 ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${failCount === 0 ? '#A7F3D0' : '#FDE68A'}` }}>
                {failCount === 0
                  ? <CheckCircle size={14} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: failCount === 0 ? '#065F46' : '#92400E', margin: 0 }}>
                    {successCount} published{failCount > 0 ? `, ${failCount} failed` : ''}
                  </p>
                  <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>See survey list for details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={C.footer}>
          <p style={{ fontSize: 11, color: '#9B9189', margin: 0 }}>
            Publishing to {surveys.length} survey{surveys.length !== 1 ? 's' : ''}
            {extra.payout ? ` · $${extra.payout} payout` : ''}
            {extra.country ? ` · ${extra.country}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {results ? (
              <button style={C.btnGhost} onClick={onClose}>Close</button>
            ) : (
              <>
                <button style={C.btnGhost} onClick={onClose} disabled={publishing}>Cancel</button>
                <button style={C.btnPrimary(publishing)} onClick={handlePublish} disabled={publishing}>
                  {publishing
                    ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Publishing {surveys.length} surveys…</>
                    : <><Send size={13} /> Bulk Publish {surveys.length} Surveys</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .bulk-panel::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default BulkPublishToMoustacheModal;
