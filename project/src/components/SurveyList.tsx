import React, { useState, useEffect } from 'react';
import { fetchSurveys } from '../utils/api';
import { Calendar, ExternalLink, Eye, Users, Copy } from 'lucide-react';

interface Question {
  question: string;
  options?: string[];
  // Add other fields as needed
}

interface Survey {
  id: string;
  prompt: string;
  created_at: string;
  template_type: string;
  questions: Question[];
}

const SurveyList: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await fetchSurveys();
      setSurveys(data.surveys || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load surveys');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

const getShareLink = (surveyId: string) => {
  const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5173'
    : 'https://pepperadsresponses.web.app';
  return `${baseUrl}/survey/${surveyId}`;
};


  const copyShareLink = async (surveyId: string) => {
    try {
      await navigator.clipboard.writeText(getShareLink(surveyId));
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl"></span>
          Your Surveys
        </h2>
        <button
          onClick={loadSurveys}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-red-100">
          <span className="text-6xl mb-4 block"></span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No surveys yet</h3>
          <p className="text-gray-600">Create your first AI-powered survey to get started!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white rounded-2xl p-6 shadow-lg border border-red-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-xl"><img
  src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
  alt="Chilli Icon"
  className="w-6 h-6 inline-block "
/></span>
                    {survey.prompt}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {formatDate(survey.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={16} />
                      {survey.template_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      {survey.questions?.length || 0} questions
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyShareLink(survey.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Copy share link"
                  >
                    <Copy size={18} />
                  </button>
                  <a
                    href={getShareLink(survey.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Open survey"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Share link: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {getShareLink(survey.id).substring(0, 50)}...
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSurvey(selectedSurvey?.id === survey.id ? null : survey)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    {selectedSurvey?.id === survey.id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>
              </div>

              {selectedSurvey?.id === survey.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Questions Preview:</h4>
                  <div className="space-y-3">
                    {survey.questions?.slice(0, 3).map((question, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium text-gray-900 mb-2">
                          <span className="text-red-600 mr-2"><img
  src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
  alt="Chilli Icon"
  className="w-6 h-6 inline-block "
/></span>
                          Q{index + 1}: {question.question}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Options: {question.options.slice(0, 2).join(', ')}
                            {question.options.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    ))}
                    {survey.questions?.length > 3 && (
                      <p className="text-sm text-gray-600 italic">
                        ... and {survey.questions.length - 3} more questions
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyList;