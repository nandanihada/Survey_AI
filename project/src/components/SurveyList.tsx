import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Mail
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
    : 'https://hostslice.onrender.com';

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
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

  const getResponseCount = () => {
    return Math.floor(Math.random() * 100);
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
                placeholder="Search surveys..."
                className={`w-full ${inputBase} ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-stone-50 border-stone-300 placeholder-stone-500'}`}
              />
            </div>
            <button className={`p-2 border rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-stone-300 hover:bg-stone-50 text-stone-600'}`}>
              <Filter size={16} />
            </button>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
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
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Create Your First Survey
              </button>
            </div>
          ) : (
            surveys.map((survey) => (
              <div
                key={survey.id}
                className={`${cardBase} ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className={`text-sm sm:text-base font-medium truncate ${isDarkMode ? 'text-white' : 'text-stone-800'}`} title={survey.title || 'Untitled Survey'}>
                        {generateShortTitle(survey.title || 'Untitled Survey')}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${statusBadge(getStatus(survey))}`}>
                        {getStatus(survey)}
                      </span>
                    </div>
                    <div className={`flex items-center flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {survey.created_at ? formatDate(survey.created_at) : 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {getResponseCount()} responses
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'}`}>
                        {survey.template_type || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/dashboard/edit/${survey.id}`)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Edit Survey"
                    >
                      <Edit size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const liveLink = `${window.location.origin}/survey?offer_id=${survey.id}`;
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
                      Open / Live Link
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard?tab=email&survey_id=${survey.id}`)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      }`}
                      title="Configure Email Triggers"
                    >
                      <Mail size={13} />
                      Email
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/responses/${survey.id}`)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                      title="View Responses"
                    >
                      <BarChart3 size={13} />
                      Responses
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SurveyList;
