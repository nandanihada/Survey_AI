/**
 * Main dashboard page showing user's surveys
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { 
  Eye, 
  Edit3, 
  Share2, 
  Calendar, 
  User, 
  FileText,
  Plus,
  AlertCircle
} from 'lucide-react';

interface Survey {
  _id: string;
  short_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner?: {
    name: string;
    email: string;
  };
}

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSurvey, setCopiedSurvey] = useState<string | null>(null);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      // Dynamic API URL based on environment
      const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://api.theinterwebsite.space';
      
      // Use admin endpoint if user is admin
      const endpoint = isAdmin ? '/api/surveys/admin/all' : '/api/surveys';
      
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
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch surveys');
      }

      const data = await response.json();
      setSurveys(data.surveys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [isAdmin]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Eye size={12} className="mr-1" />;
      case 'draft':
        return <FileText size={12} className="mr-1" />;
      case 'archived':
        return <AlertCircle size={12} className="mr-1" />;
      default:
        return <FileText size={12} className="mr-1" />;
    }
  };

  const handleShare = async (survey: Survey) => {
    const shareUrl = `${window.location.origin}/survey/${survey.short_id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedSurvey(survey._id);
      setTimeout(() => setCopiedSurvey(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedSurvey(survey._id);
      setTimeout(() => setCopiedSurvey(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-theme">
        <Header />
        <div className="flex items-center justify-center pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-theme">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page header */}
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-white drop-shadow-lg sm:text-3xl sm:truncate">
                {isAdmin ? 'All Surveys' : 'My Surveys'}
              </h2>
              <p className="mt-1 text-sm text-white/80 drop-shadow">
                Welcome back, {user?.name}!
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <a
                href="/create"
                className="ml-3 inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
              >
                <Plus size={16} className="mr-2" />
                Create Survey
              </a>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex">
                <AlertCircle className="text-red-600 mr-3" size={20} />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Surveys grid */}
          {surveys.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
                <FileText className="mx-auto h-16 w-16 text-white/60 mb-4" />
                <h3 className="mt-2 text-lg font-medium text-white drop-shadow">No surveys</h3>
                <p className="mt-1 text-sm text-white/80 drop-shadow">
                  Get started by creating your first survey.
                </p>
                <div className="mt-6">
                  <a
                    href="/create"
                    className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus size={16} className="mr-2" />
                    Create Survey
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {surveys.map((survey) => (
                <div
                  key={survey._id}
                  className="bg-white/95 backdrop-blur-md overflow-hidden shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20"
                >
                  <div className="p-6">
                    {/* Status and Owner */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          survey.status
                        )}`}
                      >
                        {getStatusIcon(survey.status)}
                        {survey.status}
                      </span>
                      {isAdmin && survey.owner && (
                        <div className="flex items-center text-xs text-gray-500">
                          <User size={12} className="mr-1" />
                          {survey.owner.name}
                        </div>
                      )}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {survey.title}
                    </h3>
                    
                    {/* Description */}
                    {survey.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {survey.description}
                      </p>
                    )}
                    
                    {/* Created Date */}
                    <div className="flex items-center text-xs text-gray-500 mb-6">
                      <Calendar size={12} className="mr-1" />
                      Created {formatDate(survey.created_at)}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-3">
                      {/* View Button */}
                      <a
                        href={`/survey/${survey.short_id}`}
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-110 shadow-lg group"
                        title="View Survey"
                      >
                        <Eye size={18} className="group-hover:scale-110 transition-transform" />
                      </a>
                      
                      {/* Edit Button */}
                      <a
                        href={`/edit/${survey.short_id}`}
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-110 shadow-lg group"
                        title="Edit Survey"
                      >
                        <Edit3 size={18} className="group-hover:scale-110 transition-transform" />
                      </a>
                      
                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(survey)}
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-110 shadow-lg group"
                        title={copiedSurvey === survey._id ? "Copied!" : "Share Survey"}
                      >
                        <Share2 size={18} className={`group-hover:scale-110 transition-transform ${copiedSurvey === survey._id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    
                    {/* Copied Feedback */}
                    {copiedSurvey === survey._id && (
                      <div className="mt-3 text-center">
                        <span className="text-xs text-green-600 font-medium">Link copied to clipboard!</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
