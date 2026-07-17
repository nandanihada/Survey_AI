import React, { useState, useEffect } from 'react';
import SurveyListView from '../components/analytics/SurveyListView';
import { getApiBaseUrl } from '../utils/deploymentFix';

interface SurveyCard {
  id: string;
  title: string;
  status: string;
  created_at: string;
  total_responses: number;
  total_questions: number;
  description: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [surveys, setSurveys] = useState<SurveyCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/analytics/surveys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
      } else {
        console.error('Failed to fetch surveys:', response.status);
      }
    } catch (err) {
      console.error('Error fetching surveys:', err);
    }
    setLoading(false);
  };

  return (
    <SurveyListView
      surveys={surveys}
      onSelectSurvey={() => {}} // Cards open in new tab directly
      loading={loading}
    />
  );
};

export default AnalyticsDashboard;
