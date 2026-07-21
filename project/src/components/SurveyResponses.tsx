import React, { useState, useEffect } from 'react';
import { Calendar, User, Mail, Download, RefreshCw, Eye, Lock, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SurveyResponse {
  _id: string;
  survey_id: string;
  responses: Record<string, any>;
  email?: string;
  username?: string;
  sub1?: string;
  submitted_at: string;
  status: string;
  url_parameters?: Record<string, any>;
}

interface SurveyResponsesProps {
  surveyId: string;
}

const SurveyResponses: React.FC<SurveyResponsesProps> = ({ surveyId }) => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [questionMap, setQuestionMap] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { hasFeature } = useAuth();

  // Fetch survey questions to map IDs to text
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const isLocalhost = window.location.hostname === 'localhost';
        const baseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
        const res = await fetch(`${baseUrl}/survey/${surveyId}/view`);
        if (res.ok) {
          const data = await res.json();
          const survey = data.survey || data;
          const map: Record<string, string> = {};
          (survey.questions || []).forEach((q: any) => {
            map[q.id] = q.question || q.text || q.id;
          });
          setQuestionMap(map);
        }
      } catch {}
    };
    if (surveyId) fetchSurvey();
  }, [surveyId]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isLocalhost = window.location.hostname === 'localhost';
      const baseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${baseUrl}/survey/${surveyId}/responses`, {
  headers: {
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json'
  }
});

      if (response.status === 401) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }

      const data = await response.json();
      setResponses(data.responses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (surveyId) {
      fetchResponses();
    }
  }, [surveyId]);

  const getBaseUrl = () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
  };

  const deleteResponse = async (responseId: string) => {
    if (!window.confirm('Delete this response? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${getBaseUrl()}/api/surveys/${surveyId}/responses/${responseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResponses(prev => prev.filter(r => r._id !== responseId));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(responseId); return n; });
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.error || 'Unknown error'}`);
      }
    } catch { alert('Network error'); }
  };

  const bulkDeleteResponses = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected response(s)? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${getBaseUrl()}/api/surveys/${surveyId}/responses/bulk-delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        const data = await res.json();
        setResponses(prev => prev.filter(r => !selectedIds.has(r._id)));
        setSelectedIds(new Set());
        alert(data.message);
      } else {
        const err = await res.json();
        alert(`Bulk delete failed: ${err.error || 'Unknown error'}`);
      }
    } catch { alert('Network error'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResponses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResponses.map(r => r._id)));
    }
  };

  // Filter responses by search query
  const filteredResponses = responses.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.email || '').toLowerCase().includes(q) ||
      (r.username || '').toLowerCase().includes(q) ||
      (r.sub1 || '').toLowerCase().includes(q) ||
      (r._id || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    if (responses.length === 0) return;

    // Get all unique question keys
    const allQuestions = new Set<string>();
    responses.forEach(response => {
      Object.keys(response.responses || {}).forEach(question => {
        allQuestions.add(question);
      });
    });

    const headers = [
      'Response ID',
      'Submitted At',
      'Email',
      'Username',
      'Sub1',
      'Status',
      ...Array.from(allQuestions)
    ];

    const csvData = responses.map(response => [
      response._id,
      formatDate(response.submitted_at),
      response.email || '',
      response.username || '',
      response.sub1 || '',
      response.status,
      ...Array.from(allQuestions).map(question => 
        response.responses?.[question] || ''
      )
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-${surveyId}-responses.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (needsAuth) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <Lock className="mx-auto mb-4 text-blue-600" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign up to see your responses</h3>
        <p className="text-gray-600 mb-6">Create an account to view and manage your survey responses</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading responses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading responses</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchResponses}
          className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Survey Responses</h3>
          <p className="text-sm text-gray-600">
            {responses.length} response{responses.length !== 1 ? 's' : ''} collected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search email, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 w-48"
            />
          </div>
          {/* Bulk delete */}
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDeleteResponses}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            onClick={fetchResponses}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {responses.length > 0 && (
            <button
              onClick={() => hasFeature('export_csv') ? exportToCSV() : navigate('/pricing?theme=light')}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${hasFeature('export_csv') ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {!hasFeature('export_csv') && <Lock size={12} />}
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
          <p className="text-gray-600">Share your survey to start collecting responses.</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">No responses match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredResponses.length && filteredResponses.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-xs text-gray-500">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all ${filteredResponses.length} responses`}
            </span>
          </div>

          {/* Response cards */}
          {filteredResponses.map((response) => (
            <div
              key={response._id}
              className={`border rounded-xl overflow-hidden transition-all ${selectedIds.has(response._id) ? 'border-red-300 bg-red-50/20' : 'border-gray-200 bg-white'}`}
            >
              {/* Response header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(response._id)}
                    onChange={() => toggleSelect(response._id)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      {formatDate(response.submitted_at)}
                    </span>
                    {response.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-gray-400" />
                        <span className="font-medium text-gray-800">{response.email}</span>
                      </span>
                    )}
                    {response.username && (
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        {response.username}
                      </span>
                    )}
                    {response.sub1 && (
                      <span className="text-gray-500">Sub1: {response.sub1}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    response.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{response.status}</span>
                  <button
                    onClick={() => setSelectedResponse(response)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    onClick={() => deleteResponse(response._id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>

              {/* Response answers table */}
              {response.responses && Object.keys(response.responses).length > 0 && (
                <div className="px-4 py-3">
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(response.responses).map(([qId, answer], idx) => (
                        <tr key={qId} className={idx % 2 === 0 ? '' : 'bg-gray-50/50'}>
                          <td className="py-2 pr-4 text-gray-500 font-medium w-1/3 align-top">
                            {questionMap[qId] || qId}
                          </td>
                          <td className="py-2 text-gray-800">
                            {typeof answer === 'object' ? JSON.stringify(answer) : String(answer)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Response Details</h3>
              <button
                onClick={() => setSelectedResponse(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-700">Response ID:</label>
                    <p className="text-gray-900 font-mono">{selectedResponse._id}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Submitted:</label>
                    <p className="text-gray-900">{formatDate(selectedResponse.submitted_at)}</p>
                  </div>
                  {selectedResponse.email && (
                    <div>
                      <label className="font-medium text-gray-700">Email:</label>
                      <p className="text-gray-900">{selectedResponse.email}</p>
                    </div>
                  )}
                  {selectedResponse.sub1 && (
                    <div>
                      <label className="font-medium text-gray-700">Sub1:</label>
                      <p className="text-gray-900">{selectedResponse.sub1}</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Survey Responses</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedResponse.responses || {}).map(([question, answer]) => (
                      <div key={question} className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {questionMap[question] || question}
                        </label>
                        <p className="text-gray-900">{String(answer)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyResponses;
