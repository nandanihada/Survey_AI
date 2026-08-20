import React, { useState, useEffect } from 'react';
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
  Loader2
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

// Resolve the best usable ID for a survey — prefers short_id, then id, then _id
const getSurveyId = (survey: Survey): string =>
  survey.short_id || survey.id || survey._id || '';

const SurveyList: React.FC<SurveyListProps> = ({ isDarkMode = false, onCreateNew }) => {
  const navigate = useNavigate();
  const { isAdmin, user, hasFeature } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showPromptId, setShowPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo]     = useState<string>('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  // Track which survey IDs have an unsaved local draft
  const [localDraftIds, setLocalDraftIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Scan localStorage for any survey drafts
    const drafts = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('survey_draft_')) {
        const surveyId = key.replace('survey_draft_', '');
        drafts.add(surveyId);
      }
    }
    setLocalDraftIds(drafts);
  }, []);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://surevy-pepperwahl.onrender.com';

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/surveys`, { headers });
      console.log('Surveys API response status:', response.status);
      
      if (!response.ok) throw new Error('Failed to fetch surveys');
      const data = await response.json();
      console.log('Surveys data:', data);
      console.log('Setting surveys:', data.surveys);
      setSurveys(data.surveys || []);
    } catch (err) {
      setError('Failed to load surveys');
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (survey: Survey) => {
    const surveyId = getSurveyId(survey);
    if (!surveyId) return;
    setCloningId(surveyId);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${apiBaseUrl}/api/surveys/${surveyId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Clone failed: ${err.error || 'Unknown error'}`);
        return;
      }
      const data = await res.json();
      const newId = data.new_survey_id || getSurveyId(data.survey);
      // Refresh the list and navigate to edit the clone
      await fetchSurveys();
      if (newId) {
        navigate(`/dashboard/edit/${newId}`);
      }
    } catch {
      alert('Clone failed. Please try again.');
    } finally {
      setCloningId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const generateShortTitle = (title: string): string => {
    if (!title) return 'Untitled Survey';
    
    const titleLower = title.toLowerCase();
    
    // Common survey patterns and their short versions
    const patterns = [
      {
        match: ['customer satisfaction', 'customer feedback', 'client satisfaction'],
        short: 'Customer Satisfaction'
      },
      {
        match: ['employee feedback', 'employee satisfaction', 'staff feedback'],
        short: 'Employee Feedback'
      },
      {
        match: ['product feedback', 'product review', 'product satisfaction'],
        short: 'Product Feedback'
      },
      {
        match: ['user experience', 'ux feedback', 'usability survey'],
        short: 'User Experience'
      },
      {
        match: ['onboarding', 'new user', 'first time'],
        short: 'Onboarding Survey'
      },
      {
        match: ['training feedback', 'course evaluation', 'workshop feedback'],
        short: 'Training Feedback'
      },
      {
        match: ['event feedback', 'conference feedback', 'meeting feedback'],
        short: 'Event Feedback'
      },
      {
        match: ['market research', 'market survey', 'opinion research'],
        short: 'Market Research'
      },
      {
        match: ['website feedback', 'site experience', 'digital experience'],
        short: 'Website Feedback'
      }
    ];
    
    // Check for pattern matches
    for (const pattern of patterns) {
      for (const match of pattern.match) {
        if (titleLower.includes(match)) {
          return pattern.short;
        }
      }
    }
    
    // Fallback: Extract key words and create short title
    const words = title.split(/\s+/).filter(word => word.length > 2);
    const keyWords = ['survey', 'feedback', 'review', 'assessment', 'evaluation', 'experience', 'satisfaction', 'onboarding', 'training', 'product', 'customer', 'employee'];
    
    let importantWords = words.filter(word => 
      keyWords.some(keyword => word.toLowerCase().includes(keyword))
    );
    
    // Take first 2-3 important words
    if (importantWords.length >= 2) {
      return importantWords.slice(0, 3).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Last resort: First few words
    if (words.length >= 2) {
      return words.slice(0, 2).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Single word fallback
    return words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() : 'Survey';
  };

  const getResponseCount = (survey: Survey) => {
    return survey.response_count ?? 0;
  };

  const getStatus = (survey: Survey) => {
    if (survey.questions && survey.questions.length > 0) {
      return 'Active';
    }
    return 'Draft';
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  const inputBase = `pl-9 pr-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-red-500/20 focus:border-red-500`;
  const cardBase = `rounded-xl border p-5 transition-all duration-200 hover:shadow-sm`;

  // Filter surveys by search query + date range
  const filteredSurveys = surveys.filter(s => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (s.title || s.prompt || '').toLowerCase();
      const shortId = (s.short_id || '').toLowerCase();
      const mongoId = (s._id || s.id || '').toLowerCase();
      if (!title.includes(q) && !shortId.includes(q) && !mongoId.includes(q)) return false;
    }
    // Date from filter (IST start of day)
    if (dateFrom && s.created_at) {
      const created = new Date(s.created_at);
      const from = new Date(dateFrom + 'T00:00:00+05:30');
      if (created < from) return false;
    }
    // Date to filter (IST end of day)
    if (dateTo && s.created_at) {
      const created = new Date(s.created_at);
      const to = new Date(dateTo + 'T23:59:59+05:30');
      if (created > to) return false;
    }
    return true;
  });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={20} />
          <h2 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Your Surveys
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-stone-400'}`} />
              <input
                type="text"
                placeholder="Search by name or survey ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full ${inputBase} ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-stone-50 border-stone-300 placeholder-stone-500'}`}
              />
            </div>
            <button className={`p-2 border rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-stone-300 hover:bg-stone-50 text-stone-600'}`}>
              <Filter size={16} />
            </button>
          </div>
          <button onClick={() => onCreateNew?.()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
          {/* Date filters */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-gray-400 flex-shrink-0" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-stone-50 border-stone-300 text-stone-800"}`}
                title="From date (IST)"
              />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-stone-50 border-stone-300 text-stone-800"}`}
                title="To date (IST)"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs px-2 py-1 rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-50">
                Clear dates
              </button>
            )}
          </div>

            <Plus size={16} />
            <span className="sm:inline">Create New</span>
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
          <button onClick={fetchSurveys} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {surveys.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg mb-4">No surveys found</p>
              <button onClick={() => onCreateNew?.()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Create Your First Survey
              </button>
            </div>
          ) : filteredSurveys.length === 0 ? (
            <div className="text-center py-12">
              <Search size={40} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-base mb-1">No surveys match "<span className="font-semibold">{searchQuery}</span>"</p>
              <p className="text-gray-400 text-sm">Try searching by title or survey ID</p>
            </div>
          ) : (
            filteredSurveys.map((survey) => {
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
                      {/* Local draft badge — user has unsaved changes for this survey */}
                      {localDraftIds.has(surveyId) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold flex-shrink-0 bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                          Draft
                        </span>
                      )}
                      {/* Shared-with-me badge */}
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
                      {/* Survey ID badge — always visible */}
                      {surveyId && (
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] select-all cursor-text ${
                            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                          title="Survey ID — click to select"
                        >
                          ID: {surveyId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0 sm:flex-shrink-0">
                    <button
                      onClick={() => navigate(`/dashboard/edit/${surveyId}`)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Edit Survey"
                    >
                      <Edit size={13} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        const liveLink = `${window.location.origin}/s/${surveyId}`;
                        window.open(liveLink, '_blank');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                          : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }`}
                      title="Open Live Survey Link"
                    >
                      <Eye size={13} />
                      <span className="hidden sm:inline">Open / Live Link</span>
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard?tab=email&survey_id=${surveyId}`)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      }`}
                      title="Configure Email Triggers"
                    >
                      <Mail size={13} />
                      <span className="hidden sm:inline">Email</span>
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/responses/${surveyId}`)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                      title="View Responses"
                    >
                      <BarChart3 size={13} />
                      <span className="hidden sm:inline">Responses</span>
                    </button>
                    {isAdmin && survey.prompt && (
                      <button
                        onClick={() => setShowPromptId(showPromptId === promptKey ? null : promptKey)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          showPromptId === promptKey
                            ? isDarkMode ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700'
                            : isDarkMode ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                        }`}
                        title="View original prompt"
                      >
                        <FileText size={13} />
                        <span className="hidden sm:inline">Prompt</span>
                      </button>
                    )}
                    {hasFeature('survey_clone') ? (
                    <button
                      onClick={() => handleClone(survey)}
                      disabled={cloningId === surveyId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                          : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                      } disabled:opacity-50`}
                      title="Clone Survey (new ID, independent branching)"
                    >
                      {cloningId === surveyId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Copy size={13} />
                      )}
                      <span className="hidden sm:inline">{cloningId === surveyId ? 'Cloning…' : 'Clone'}</span>
                    </button>
                    ) : (
                    <button
                      disabled
                      title="Clone Survey — upgrade your plan to use this feature"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed ${
                        isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <Copy size={13} />
                      <span className="hidden sm:inline">Clone</span>
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
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) {
                            setSurveys(prev => prev.filter(s => getSurveyId(s) !== surveyId));
                          } else {
                            const err = await res.json();
                            alert(`Failed to delete: ${err.error || 'Unknown error'}`);
                          }
                        } catch (e) {
                          alert('Failed. Please try again.');
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                      title="Delete Survey"
                    >
                      <Trash2 size={13} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                  {/* Prompt reveal modal */}
                  {isAdmin && survey.prompt && showPromptId === promptKey && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPromptId(null)}>
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2">
                            <FileText size={16} /> Original Prompt
                          </h3>
                          <button onClick={() => setShowPromptId(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
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
      )}
    </div>
  );
};

export default SurveyList;
