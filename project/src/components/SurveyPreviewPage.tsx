import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Eye, Share2, Copy, CheckCircle, ArrowLeft, Settings, BarChart3 } from 'lucide-react';
import { fetchSurveyData } from '../utils/api';
import { generateSurveyLink, parseParamString, stringifyParams, type SurveyLinkParams } from '../utils/surveyLinkUtils';
import { useAuth } from '../contexts/AuthContext';
import type { Survey } from '../types/Survey';
import SurveyResponses from './SurveyResponses';
import ResponseLogs from './ResponseLogs';

const SurveyPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [paramString, setParamString] = useState('');
  const [urlParams, setUrlParams] = useState<SurveyLinkParams>({});
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    if (!id) return;

    const loadSurvey = async () => {
      try {
        setIsLoading(true);
        const data = await fetchSurveyData(id);
        setSurvey(data.survey || data);
        
        // Set share link with user_id and aff_sub
        const username = user?.name || user?.email?.split('@')[0] || `user_${user?.simpleUserId}`;
        const link = generateSurveyLink(id!, user?.simpleUserId?.toString(), urlParams, username);
        setShareLink(link);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey');
      } finally {
        setIsLoading(false);
      }
    };

    loadSurvey();
  }, [id, urlParams, user]);

  const handleParamStringChange = (value: string) => {
    setParamString(value);
    const parsed = parseParamString(value);
    setUrlParams(parsed);
  };

  const handleAddParam = () => {
    const newParams = { ...urlParams, uid: '123' };
    setUrlParams(newParams);
    setParamString(stringifyParams(newParams));
  };

  const handleAddUsername = () => {
    const newParams = { ...urlParams, username: 'user123' };
    setUrlParams(newParams);
    setParamString(stringifyParams(newParams));
  };

  const handleRemoveParam = (key: string) => {
    const newParams = { ...urlParams };
    delete newParams[key];
    setUrlParams(newParams);
    setParamString(stringifyParams(newParams));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Survey not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Eye size={20} />
                Survey Preview
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/edit/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 size={16} />
                Edit Survey
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Survey Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Survey Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Survey Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-sm text-gray-900">{survey.title || 'Untitled Survey'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-600">{survey.subtitle || 'No description'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Questions</label>
                  <p className="text-sm text-gray-900">{survey.questions?.length || 0} questions</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                  <p className="text-sm text-gray-900 capitalize">{survey.template_type || 'Custom'}</p>
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Share2 size={18} />
                  Share Survey
                </h3>
                <button
                  onClick={() => setShowParamEditor(!showParamEditor)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Settings size={12} />
                  {showParamEditor ? 'Hide' : 'Add'} Parameters
                </button>
              </div>
              <div className="space-y-3">
                {showParamEditor && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      URL Parameters (e.g., uid=123&source=email)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={paramString}
                        onChange={(e) => handleParamStringChange(e.target.value)}
                        placeholder="uid=123&source=email&campaign=winter"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <button
                        onClick={handleAddParam}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                      >
                        Add UID
                      </button>
                      <button
                        onClick={handleAddUsername}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg"
                      >
                        Add Username
                      </button>
                    </div>
                    {Object.keys(urlParams).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(urlParams).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {key}={value}
                            <button
                              onClick={() => handleRemoveParam(key)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Survey Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Eye size={16} />
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('responses')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'responses' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Responses
              </button>
              <button
                onClick={() => setActiveTab('response-logs')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'response-logs' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Response Logs
              </button>
            </div>
            {activeTab === 'preview' ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h2>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    src={shareLink}
                    title="Survey Preview"
                    className="w-full h-[600px] border-0"
                    style={{
                      transform: 'scale(0.95)',
                      transformOrigin: 'top left',
                      width: '105.26%',
                      height: '631px',
                    }}
                  />
                </div>
              </div>
            ) : activeTab === 'responses' ? (
              <SurveyResponses surveyId={id} />
            ) : (
              <ResponseLogs surveyId={id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPreviewPage;
