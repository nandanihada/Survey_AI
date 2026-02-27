import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Edit3, BarChart3 } from 'lucide-react';
import { fetchSurveyData } from '../utils/api';
import { generateSurveyLink, type SurveyLinkParams } from '../utils/surveyLinkUtils';
import { useAuth } from '../contexts/AuthContext';
import type { Survey } from '../types/Survey';

const SurveyPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlParams] = useState<SurveyLinkParams>({});

  const shareLink = id
    ? generateSurveyLink(id, user?.simpleUserId?.toString(), urlParams, user?.name || user?.email?.split('@')[0] || `user_${user?.simpleUserId}`)
    : '';

  useEffect(() => {
    if (!id) return;
    const loadSurvey = async () => {
      try {
        setIsLoading(true);
        const data = await fetchSurveyData(id);
        setSurvey(data.survey || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey');
      } finally {
        setIsLoading(false);
      }
    };
    loadSurvey();
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Survey not found'}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0">
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
              </button>
              <div className="w-px h-5 bg-gray-300 hidden sm:block" />
              <h1 className="text-sm sm:text-xl font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2 truncate">
                <Eye size={16} className="flex-shrink-0" /> <span className="truncate">Preview: {survey.title || 'Survey'}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => navigate(`/dashboard/edit/${id}`)}
                className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 size={13} /> <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => navigate(`/dashboard/responses/${id}`)}
                className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <BarChart3 size={13} /> <span className="hidden sm:inline">Responses</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <iframe
            src={shareLink}
            title="Survey Preview"
            className="w-full border-0"
            style={{ height: '80vh' }}
          />
        </div>
      </div>
    </div>
  );
};

export default SurveyPreviewPage;
