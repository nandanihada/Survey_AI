import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { fetchSurveyData } from '../utils/api';
import type { Survey } from '../types/Survey';
import SurveyResponses from './SurveyResponses';
import ResponseLogs from './ResponseLogs';
import PartnerMapping from './PartnerMapping';

const SurveyResponsesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'responses' | 'response-logs' | 'partner-mapping'>('responses');

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
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading responses...</p>
        </div>
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

  const tabs = [
    { key: 'responses' as const, label: 'Responses' },
    { key: 'response-logs' as const, label: 'Response Logs' },
    { key: 'partner-mapping' as const, label: 'Partner Mapping' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} />
                {survey.title || 'Survey'} — Responses
              </h1>
            </div>
            <button
              onClick={() => navigate(`/dashboard/edit/${id}`)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Survey
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'responses' && <SurveyResponses surveyId={id || ''} />}
        {activeTab === 'response-logs' && <ResponseLogs surveyId={id || ''} />}
        {activeTab === 'partner-mapping' && <PartnerMapping surveyId={id || ''} />}
      </div>
    </div>
  );
};

export default SurveyResponsesPage;
