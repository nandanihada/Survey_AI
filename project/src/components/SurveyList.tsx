import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/deploymentFix';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  BarChart3,
  Edit,
  Eye,
  Mail,
  FileText,
  Trash2,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SurveyListProps {
  isDarkMode?: boolean;
  onCreateNew?: () => void;
}

interface Survey {
  _id?: string;
  id?: string;
  short_id?: string;
  title?: string;
  prompt?: string;
  created_at?: string;
  questions?: unknown[];
  template_type?: string;
  response_count?: number;
  ownerUserId?: string;
  shared_with?: string[];
}

const getSurveyId = (survey: Survey): string =>
  survey.short_id || survey.id || survey._id || '';

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

const SurveyList: React.FC<SurveyListProps> = ({ isDarkMode = false, onCreateNew }) => {
  const navigate = useNavigate();
  const { isAdmin, user, hasFeature } = useAuth();
  const [surveys, setSurveys]         = useState<Survey[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string>('');
  const [showPromptId, setShowPromptId] = useState<string | null>(null);
  const [cloningId, setCloningId]     = useState<string | null>(null);
  const [localDraftIds, setLocalDraftIds] = useState<Set<string>>(new Set());

  // ?????? Search / filter state ??????
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  // ?????? Pagination state ??????
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [total, setTotal]     = useState(0);
  const totalPages             = Math.ceil(total / pageSize);

  // debounce timer for search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiBaseUrl  = isLocalhost ? 'http://localhost:5000' : 'https://surevy-pepperwahl.onrender.com';

  useEffect(() => {
    const drafts = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('survey_draft_')) drafts.add(key.replace('survey_draft_', ''));
    }
    setLocalDraftIds(drafts);
  }, []);

  // ?????? Fetch surveys (server-side page + search + date) ??????
  const fetchSurveys = useCallback(async (p: number, ps: PageSize, sq: string, df: string, dt: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const ud = localStorage.getItem('user_data');
        if (ud) {
          try { const u = JSON.parse(ud); if (u.id) headers['Authorization'] = `Bearer ${u.id}`; } catch {}
        }
      }
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) headers['X-User-ID'] = userId;

      const params = new URLSearchParams({
        page:  String(p),
        limit: String(ps),
      });
      if (sq.trim())  params.set('search',    sq.trim());
      if (df)         params.set('date_from',  df);
      if (dt)         params.set('date_to',    dt);

      const res = await fetch(`${apiBaseUrl}/api/surveys?${params}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch surveys');
      const data = await res.json();
      setSurveys(data.surveys || []);
      setTotal(data.total   || 0);
    } catch (err) {
      setError('Failed to load surveys');
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Re-fetch when page / pageSize changes immediately
  useEffect(() => {
    fetchSurveys(page, pageSize, searchQuery, dateFrom, dateTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Debounce search + date changes, also reset to page 1
  const triggerSearch = useCallback((sq: string, df: string, dt: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchSurveys(1, pageSize, sq, df, dt);
    }, 400);
  }, [fetchSurveys, pageSize]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    triggerSearch(val, dateFrom, dateTo);
  };
  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    triggerSearch(searchQuery, val, dateTo);
  };
  const handleDateToChange = (val: string) => {
    setDateTo(val);
    triggerSearch(searchQuery, dateFrom, val);
  };
  const clearDates = () => {
    setDateFrom(''); setDateTo('');
    triggerSearch(searchQuery, '', '');
  };

  const handlePageSizeChange = (ps: PageSize) => {
    setPageSize(ps);
    setPage(1);
    // useEffect on [page, pageSize] will fire
  };

  const handleClone = async (survey: Survey) => {
    const surveyId = getSurveyId(survey);
    if (!surveyId) return;
    setCloningId(surveyId);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${apiBaseUrl}/api/surveys/${surveyId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); alert(`Clone failed: ${e.error || 'Unknown error'}`); return; }
      const data = await res.json();
      const newId = data.new_survey_id || getSurveyId(data.survey);
      await fetchSurveys(page, pageSize, searchQuery, dateFrom, dateTo);
      if (newId) navigate(`/dashboard/edit/${newId}`);
    } catch { alert('Clone failed. Please try again.'); }
    finally { setCloningId(null); }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  const generateShortTitle = (title: string): string => {
    if (!title) return 'Untitled Survey';
    const titleLower = title.toLowerCase();
    const stopWords = new Set(['a','an','the','and','or','for','to','in','of','on','at','with','about','by','from','that','this','which','how','what','when','where','why','survey','study','research','feedback','form','questionnaire']);
    const words = titleLower.split(/\s+/).filter(w => w.length > 0);
    const importantWords = words.filter(w => !stopWords.has(w) && w.length > 2);
    if (importantWords.length >= 2) return importantWords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (words.length >= 2) return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Survey';
  };

  const getResponseCount = (s: Survey) => s.response_count ?? 0;
  const getStatus        = (s: Survey) => (s.questions && s.questions.length > 0) ? 'Active' : 'Draft';
  const statusBadge      = (status: string) => ({
    Active:  'bg-green-100 text-green-800',
    Draft:   'bg-yellow-100 text-yellow-800',
  }[status] ?? 'bg-stone-100 text-stone-800');

  const inputBase = `pl-9 pr-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-red-500/20 focus:border-red-500`;
  const cardBase  = `rounded-xl border p-5 transition-all duration-200 hover:shadow-sm`;
  // Unified action button base ? all survey action buttons use this
  const actionBtn = (isDark: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
      isDark
        ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
    }`;

  // ?????? Pagination controls ??????
  const PaginationBar = () => {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, total);
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-stone-200'}`}>
        {/* Left: count info + per-page selector */}
        <div className="flex items-center gap-3 text-sm">
          <span className={isDarkMode ? 'text-slate-400' : 'text-stone-500'}>
            {total === 0 ? 'No surveys' : `${from}???${to} of ${total} survey${total !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>Per page:</span>
            {PAGE_SIZE_OPTIONS.map(ps => (
              <button
                key={ps}
                onClick={() => handlePageSizeChange(ps)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  pageSize === ps
                    ? 'bg-red-500 text-white'
                    : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {ps}
              </button>
            ))}
          </div>
        </div>

        {/* Right: page navigator */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className={`px-2 py-1 rounded text-xs font-medium disabled:opacity-40 transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              title="First page"
            >??</button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-1.5 rounded disabled:opacity-40 transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            ><ChevronLeft size={14} /></button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) { p = i + 1; }
              else if (page <= 3)  { p = i + 1; }
              else if (page >= totalPages - 2) { p = totalPages - 4 + i; }
              else { p = page - 2 + i; }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    page === p
                      ? 'bg-red-500 text-white'
                      : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >{p}</button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`p-1.5 rounded disabled:opacity-40 transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            ><ChevronRight size={14} /></button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className={`px-2 py-1 rounded text-xs font-medium disabled:opacity-40 transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              title="Last page"
            >??</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className={isDarkMode ? 'text-slate-400' : 'text-stone-500'} size={18} />
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Your Surveys
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`} />
            <input
              type="text"
              placeholder="Search surveys..."
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className={`pl-8 pr-3 py-1.5 border rounded-lg text-sm w-48 transition-colors focus:outline-none focus:ring-1 focus:ring-stone-400 ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-stone-200 placeholder-stone-400 text-stone-800'}`}
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => handleDateFromChange(e.target.value)}
              className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-stone-200 text-stone-700'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>?</span>
            <input type="date" value={dateTo} onChange={e => handleDateToChange(e.target.value)}
              className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-stone-200 text-stone-700'}`} />
            {(dateFrom || dateTo) && (
              <button onClick={clearDates} className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${isDarkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>Clear</button>
            )}
          </div>
          {/* Create New */}
          <button onClick={() => onCreateNew?.()} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} />
            <span>Create New</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={() => fetchSurveys(page, pageSize, searchQuery, dateFrom, dateTo)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : (
        <>
        <div className="grid gap-4">
          {surveys.length === 0 && total === 0 && !searchQuery && !dateFrom && !dateTo ? (
            <div className="text-center py-12">
              <FolderOpen size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg mb-4">No surveys found</p>
              <button onClick={() => onCreateNew?.()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Create Your First Survey
              </button>
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <Search size={40} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-base mb-1">No surveys match your filters</p>
              <p className="text-gray-400 text-sm">Try a different search term or date range</p>
            </div>
          ) : (
            surveys.map((survey) => {
              const surveyId = getSurveyId(survey);
              const promptKey = surveyId;
              return (
              <div
                key={surveyId || survey._id}
                className={`${cardBase} ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className={`text-sm sm:text-base font-medium truncate ${isDarkMode ? 'text-white' : 'text-stone-800'}`} title={survey.title || 'Untitled Survey'}>
                        {generateShortTitle(survey.title || 'Untitled Survey')}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${statusBadge(getStatus(survey))}`}>
                        {getStatus(survey)}
                      </span>
                      {localDraftIds.has(surveyId) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold flex-shrink-0 bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                          Draft
                        </span>
                      )}
                      {user?.id && survey.ownerUserId && survey.ownerUserId !== user.id && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 bg-blue-100 text-blue-700">
                          Shared with me
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {survey.created_at ? formatDate(survey.created_at) : 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {getResponseCount(survey)} responses
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'}`}>
                        {survey.template_type || 'custom'}
                      </span>
                      {surveyId && (
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] select-all cursor-text ${
                            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                          title="Survey ID ??? click to select"
                        >
                          ID: {surveyId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0 sm:flex-shrink-0">
                    <button onClick={() => navigate(`/dashboard/edit/${surveyId}`)}
                      className={actionBtn(isDarkMode)} title="Edit Survey">
                      <Edit size={13} /><span className="hidden sm:inline">Edit</span>
                    </button>
                    <button onClick={() => window.open(`${window.location.origin}/s/${surveyId}`, '_blank')}
                      className={actionBtn(isDarkMode)} title="Open Live Survey Link">
                      <Eye size={13} /><span className="hidden sm:inline">Open</span>
                    </button>
                    <button onClick={() => navigate(`/dashboard?v=mail&q=${surveyId}`)}
                      className={actionBtn(isDarkMode)} title="Configure Email Triggers">
                      <Mail size={13} /><span className="hidden sm:inline">Email</span>
                    </button>
                    <button onClick={() => navigate(`/dashboard/responses/${surveyId}`)}
                      className={actionBtn(isDarkMode)} title="View Responses">
                      <BarChart3 size={13} /><span className="hidden sm:inline">Responses</span>
                    </button>
                    {isAdmin && survey.prompt && (
                      <button
                        onClick={() => setShowPromptId(showPromptId === promptKey ? null : promptKey)}
                        className={`${actionBtn(isDarkMode)} ${showPromptId === promptKey ? isDarkMode ? 'bg-slate-700 text-white' : 'bg-stone-100 text-stone-800' : ''}`}
                        title="View original prompt">
                        <FileText size={13} /><span className="hidden sm:inline">Prompt</span>
                      </button>
                    )}
                    {hasFeature('survey_clone') ? (
                      <button onClick={() => handleClone(survey)} disabled={cloningId === surveyId}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDarkMode ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'} disabled:opacity-50`}
                        title="Clone Survey">
                        {cloningId === surveyId ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                        <span className="hidden sm:inline">{cloningId === surveyId ? 'Cloning...' : 'Clone'}</span>
                      </button>
                    ) : (
                      <button disabled title="Clone Survey ??? upgrade your plan"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-stone-100 text-stone-400'}`}>
                        <Copy size={13} /><span className="hidden sm:inline">Clone</span>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const responseCount = survey.response_count || 0;
                        const msg = responseCount > 0
                          ? `This survey has ${responseCount} response(s). Deleting will permanently remove the survey and ALL its responses. This cannot be undone.\n\nAre you sure?`
                          : `Delete survey "${survey.title || 'Untitled'}"? This cannot be undone.\n\nAre you sure?`;
                        if (!window.confirm(msg)) return;
                        try {
                          const token = localStorage.getItem('auth_token');
                          const baseUrl = getApiBaseUrl();
                          const res = await fetch(`${baseUrl}/api/surveys/${surveyId}`, {
                            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) {
                            setSurveys(prev => prev.filter(s => getSurveyId(s) !== surveyId));
                            setTotal(t => t - 1);
                          } else {
                            const err = await res.json();
                            alert(`Failed to delete: ${err.error || 'Unknown error'}`);
                          }
                        } catch { alert('Failed. Please try again.'); }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors text-red-500 hover:bg-red-50 hover:text-red-700`}
                      title="Delete Survey">
                      <Trash2 size={13} /><span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                  {isAdmin && survey.prompt && showPromptId === promptKey && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPromptId(null)}>
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2"><FileText size={16} /> Original Prompt</h3>
                          <button onClick={() => setShowPromptId(null)} className="text-gray-400 hover:text-gray-600 text-lg">??</button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{survey.prompt}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
        {/* Pagination bar ??? always shown when there are surveys */}
        {(total > 0 || surveys.length > 0) && <PaginationBar />}
        </>
      )}
    </div>
  );
};

export default SurveyList;




