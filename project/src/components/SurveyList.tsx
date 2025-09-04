import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Calendar,
  Users,
  MoreVertical,
  Plus,
  Filter,
  Search,
  Edit,
  Eye,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface SurveyListProps {
  isDarkMode?: boolean;
}

interface Survey {
  id: string;
  title?: string;
  created_at?: string;
  questions?: unknown[];
  template_type?: string;
}

const SurveyList: React.FC<SurveyListProps> = ({ isDarkMode = false }) => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost
    ? 'http://localhost:5000'
    : 'https://api.theinterwebsite.space/';

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiBaseUrl}/api/surveys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch surveys');
      const data = await response.json();
      setSurveys(data.surveys || []);
    } catch (err) {
      setError('Failed to load surveys');
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (surveyId: string) => {
    navigate(`/edit/${surveyId}`);
  };

  const handlePreview = (surveyId: string) => {
    navigate(`/preview/${surveyId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const getResponseCount = () => {
    return Math.floor(Math.random() * 100);
  };

  const getStatus = (survey: Survey) => {
    if (survey.questions && survey.questions.length > 0) {
      return 'Active';
    }
    return 'Draft';
  };

  const inputBase = `pl-9 pr-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-red-500/20 focus:border-red-500`;
  const cardBase = `rounded-xl border p-5 transition-all duration-200 hover:shadow-sm`;
  const statusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={20} />
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Your Surveys
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  isDarkMode ? 'text-slate-400' : 'text-stone-400'
                }`}
              />
              <input
                type="text"
                placeholder="Search surveys..."
                className={`${inputBase} ${
                  isDarkMode
                    ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400'
                    : 'bg-stone-50 border-stone-300 placeholder-stone-500'
                }`}
              />
            </div>
            <button
              className={`p-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'border-slate-600 hover:bg-slate-700 text-slate-300'
                  : 'border-stone-300 hover:bg-stone-50 text-stone-600'
              }`}
            >
              <Filter size={16} />
            </button>
          </div>

          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
            <Plus size={16} />
            Create New Survey
          </button>
        </div>
      </div>

      {/* Conditional Rendering for Loading/Error/Survey List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchSurveys}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Survey Cards */}
          <div className="grid gap-4">
            {surveys.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg mb-4">No surveys found</p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 mx-auto">
                  <Plus size={16} />
                  Create Your First Survey
                </button>
              </div>
            ) : (
              surveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`${cardBase} ${
                    isDarkMode
                      ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3
                        className={`text-base font-medium mb-2 ${
                          isDarkMode ? 'text-white' : 'text-stone-800'
                        }`}
                      >
                        {survey.title || 'Untitled Survey'}
                      </h3>
                      <div
                        className={`flex items-center flex-wrap gap-4 text-sm ${
                          isDarkMode ? 'text-slate-400' : 'text-stone-500'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {survey.created_at ? formatDate(survey.created_at) : 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {getResponseCount()} responses
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {survey.template_type || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(
                          getStatus(survey)
                        )}`}
                      >
                        {getStatus(survey)}
                      </span>
                      <button
                        onClick={() => handleEdit(survey.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-stone-100'
                        }`}
                        title="Edit Survey"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handlePreview(survey.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-stone-100'
                        }`}
                        title="Preview Survey"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SurveyList;
