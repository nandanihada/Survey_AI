import React from 'react';
import { useParams } from 'react-router-dom';
import SurveyAnalyticsDetail from '../components/analytics/SurveyAnalyticsDetail';
import { useAuth } from '../contexts/AuthContext';

const SurveyAnalyticsPage: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const { user } = useAuth();
  const userTier = (user?.role || 'basic') as 'basic' | 'premium' | 'enterprise' | 'admin';

  if (!surveyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Survey not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SurveyAnalyticsDetail
          surveyId={surveyId}
          userTier={userTier}
          onBack={() => window.close()}
        />
      </div>
    </div>
  );
};

export default SurveyAnalyticsPage;
