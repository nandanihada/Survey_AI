/**
 * PlanFeaturesTab — Admin UI to configure which features are available per plan.
 * Each feature can be toggled ON/OFF for Free / Premium / Enterprise independently.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, RotateCcw, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/deploymentFix';

interface FeatureRow {
  key: string;
  label: string;
  description: string;
  category: string;
  free: boolean;
  premium: boolean;
  enterprise: boolean;
}

interface CategoryGroup {
  [category: string]: FeatureRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  tabs: '📑 Dashboard Tabs',
  survey: '📋 Survey Actions',
  editor_answer_types: '✏️ Answer Types',
  editor_animations: '✨ Animation Types',
  editor_answer_styles: '🎨 Answer Styles',
  editor_images: '🖼 Image Settings',
  editor_branching: '🔀 Branching',
  editor_ai: '🤖 AI Features',
  other: '⚙️ Other',
};

const PLAN_COLORS = {
  free: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300', active: 'bg-stone-600 text-white', badge: 'bg-stone-100 text-stone-600 border-stone-200' },
  premium: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', active: 'bg-emerald-600 text-white', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  enterprise: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', active: 'bg-indigo-600 text-white', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

export default function PlanFeaturesTab() {
  const baseUrl = getApiBaseUrl();
  const [categories, setCategories] = useState<CategoryGroup>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [resetLoading, setResetLoading] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Remove trailing slash to avoid Flask redirect issues
      const res = await fetch(`${baseUrl}/api/admin/plan-features`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCategories(data.categories || {});
    } catch (e: any) {
      showMessage('error', `Failed to load: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleToggle = async (
    featureKey: string,
    plan: 'free' | 'premium' | 'enterprise',
    currentValue: boolean
  ) => {
    const savingKey = `${featureKey}_${plan}`;
    setSaving(savingKey);

    // Optimistic update
    setCategories(prev => {
      const next = { ...prev };
      for (const cat of Object.keys(next)) {
        next[cat] = next[cat].map(row =>
          row.key === featureKey ? { ...row, [plan]: !currentValue } : row
        );
      }
      return next;
    });

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/plan-features/update`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature_key: featureKey, [plan]: !currentValue }),
      });
      if (!res.ok) throw new Error('Save failed');
      showMessage('success', `Saved!`);
    } catch {
      // Revert on failure
      setCategories(prev => {
        const next = { ...prev };
        for (const cat of Object.keys(next)) {
          next[cat] = next[cat].map(row =>
            row.key === featureKey ? { ...row, [plan]: currentValue } : row
          );
        }
        return next;
      });
      showMessage('error', 'Save failed. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset ALL plan features to default? This cannot be undone.')) return;
    setResetLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/api/admin/plan-features/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reset failed');
      showMessage('success', 'Reset to defaults successfully');
      await fetchConfig();
    } catch {
      showMessage('error', 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid #EBE8E3',
            borderTopColor: '#C4785C',
            margin: '0 auto 12px',
          }}
        />
        <p style={{ fontSize: 12, color: '#9B9189' }}>Loading feature config…</p>
      </div>
    );
  }

  const sortedCats = Object.keys(categories).sort((a, b) => {
    const order = ['tabs', 'survey', 'editor_answer_types', 'editor_animations', 'editor_answer_styles', 'editor_images', 'editor_branching', 'editor_ai', 'other'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2D2520', margin: 0 }}>Plan Feature Control</h3>
          <p style={{ fontSize: 11, color: '#9B9189', marginTop: 3 }}>
            Toggle which features are available for each plan. Changes take effect immediately for all users.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {message && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: message.type === 'success' ? '#059669' : '#DC2626',
                border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {message.type === 'success' ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {message.text}
            </div>
          )}
          <button
            onClick={fetchConfig}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8, border: '1px solid #EBE8E3',
              background: '#FDFCFA', color: '#6B6158', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={resetLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8, border: '1px solid #FECACA',
              background: '#FFF5F5', color: '#DC2626', fontSize: 11, fontWeight: 600,
              cursor: resetLoading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: resetLoading ? 0.6 : 1,
            }}
          >
            <RotateCcw size={12} /> Reset to Defaults
          </button>
        </div>
      </div>

      {/* Plan legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {(['free', 'premium', 'enterprise'] as const).map(plan => (
          <div key={plan} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${PLAN_COLORS[plan].badge}`}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#9B9189', display: 'flex', alignItems: 'center', gap: 4 }}>
          — Admin always has full access to every feature.
        </p>
      </div>

      {/* Category groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedCats.map(cat => {
          const rows = categories[cat] || [];
          const isCollapsed = collapsedCats.has(cat);
          const enabledCount = rows.reduce((acc, r) => acc + (r.free ? 1 : 0) + (r.premium ? 1 : 0) + (r.enterprise ? 1 : 0), 0);
          const totalPossible = rows.length * 3;

          return (
            <div
              key={cat}
              style={{ border: '1px solid #EBE8E3', borderRadius: 12, overflow: 'hidden', background: '#FDFCFA' }}
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: '#F5F1E8', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isCollapsed ? <ChevronRight size={14} color="#9B9189" /> : <ChevronDown size={14} color="#9B9189" />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2D2520' }}>
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span style={{ fontSize: 10, color: '#9B9189', fontWeight: 400 }}>
                    {rows.length} feature{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#9B9189', fontWeight: 600 }}>
                  {enabledCount}/{totalPossible} enabled
                </span>
              </button>

              {/* Feature rows */}
              {!isCollapsed && (
                <div>
                  {/* Column headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px 90px',
                      padding: '6px 16px',
                      borderBottom: '1px solid #F5F1E8',
                      background: '#FDFCFA',
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#C4A99A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Feature</span>
                    {(['free', 'premium', 'enterprise'] as const).map(plan => (
                      <span key={plan} style={{ fontSize: 9, fontWeight: 700, color: '#C4A99A', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                        {plan}
                      </span>
                    ))}
                  </div>

                  {rows.map((row, i) => (
                    <div
                      key={row.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 80px 90px',
                        padding: '10px 16px',
                        borderBottom: i < rows.length - 1 ? '1px solid #F5F1E8' : 'none',
                        alignItems: 'center',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = '#FEF9F7')}
                      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
                    >
                      {/* Feature info */}
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#2D2520', margin: 0 }}>{row.label}</p>
                        <p style={{ fontSize: 10, color: '#9B9189', margin: '2px 0 0' }}>{row.description}</p>
                      </div>

                      {/* Plan toggles */}
                      {(['free', 'premium', 'enterprise'] as const).map(plan => {
                        const isOn = row[plan];
                        const savingKey = `${row.key}_${plan}`;
                        const isSaving = saving === savingKey;

                        return (
                          <div key={plan} style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleToggle(row.key, plan, isOn)}
                              disabled={isSaving}
                              title={`${isOn ? 'Disable' : 'Enable'} ${row.label} for ${plan}`}
                              style={{
                                width: 44,
                                height: 24,
                                borderRadius: 50,
                                border: 'none',
                                cursor: isSaving ? 'wait' : 'pointer',
                                transition: 'background 0.2s',
                                background: isOn
                                  ? plan === 'free' ? '#57534e' : plan === 'premium' ? '#059669' : '#4f46e5'
                                  : '#D4D0CB',
                                position: 'relative',
                                flexShrink: 0,
                                opacity: isSaving ? 0.6 : 1,
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 3,
                                  left: isOn ? 22 : 3,
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                  transition: 'left 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isSaving && (
                                  <div
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      border: '1.5px solid #9B9189',
                                      borderTopColor: '#C4785C',
                                      animation: 'spin 0.6s linear infinite',
                                    }}
                                  />
                                )}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          borderRadius: 10,
          background: '#FFF8F0',
          border: '1px solid #F0D9BE',
          fontSize: 11,
          color: '#A05A30',
          lineHeight: 1.6,
        }}
      >
        <strong>Note:</strong> Feature changes take effect on next login or session refresh for existing users.
        The dashboard tabs, editor features, and branching sub-tabs all respect this configuration.
        Admin accounts always have full access regardless of settings here.
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
