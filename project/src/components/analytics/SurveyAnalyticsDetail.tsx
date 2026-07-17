import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalyticsHeroHeader from './AnalyticsHeroHeader';
import QuestionBreakdownCard from './QuestionBreakdownCard';
import IndividualResponsesTable from './IndividualResponsesTable';
import EnterpriseDeepAnalysis from './EnterpriseDeepAnalysis';
import PremiumPreviewSection from './PremiumPreviewSection';
import { getApiBaseUrl } from '../../utils/deploymentFix';

interface AnswerItem {
  answer: string;
  count: number;
  percentage: number;
}

interface TimingStats {
  avg_time: number;
  median_time: number;
  min_time: number;
  max_time: number;
  careful_count: number;
  rushed_count: number;
  timings: number[];
}

interface QuestionData {
  question_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  total_responses: number;
  answer_distribution: AnswerItem[];
  timing_stats: TimingStats;
  careful_answers: Record<string, number>;
  rushed_answers: Record<string, number>;
}

interface Stats {
  total_responses: number;
  avg_completion_time: number;
  careful_count: number;
  rushed_count: number;
  rush_rate: number;
}

interface IndividualResponse {
  response_id: string;
  name: string;
  email: string;
  submitted_at: string;
  ip_address: string;
  user_agent: string;
  device: string;
  location: string;
  total_time: number | null;
  avg_time_per_question: number | null;
  overall_status: string;
  per_question: { question_id: string; answer: string; time: number | null; status: string }[];
}

interface Props {
  surveyId: string;
  userTier: 'basic' | 'premium' | 'enterprise' | 'admin';
  onBack: () => void;
}

const SurveyAnalyticsDetail: React.FC<Props> = ({ surveyId, userTier, onBack }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stats, setStats] = useState<Stats>({
    total_responses: 0,
    avg_completion_time: 0,
    careful_count: 0,
    rushed_count: 0,
    rush_rate: 0
  });
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [individualResponses, setIndividualResponses] = useState<IndividualResponse[]>([]);
  const [loadingIndividual, setLoadingIndividual] = useState(true);

  const baseUrl = getApiBaseUrl();
  const isPremium = userTier === 'premium' || userTier === 'enterprise' || userTier === 'admin';
  const isEnterprise = userTier === 'enterprise' || userTier === 'admin';

  // Fetch analytics data
  useEffect(() => {
    fetchAnalytics();
    fetchIndividualResponses();
  }, [surveyId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/analytics/survey/${surveyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTitle(data.title || 'Untitled Survey');
        setDescription(data.description || '');
        setStats(data.stats || stats);
        setQuestions(data.question_breakdown || []);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
    setLoading(false);
  };

  const fetchIndividualResponses = async () => {
    setLoadingIndividual(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/analytics/survey/${surveyId}/individual`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIndividualResponses(data.responses || []);
      }
    } catch (err) {
      console.error('Error fetching individual responses:', err);
    }
    setLoadingIndividual(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Header with Stats */}
      <AnalyticsHeroHeader
        title={title}
        description={description}
        stats={stats}
        onBack={onBack}
      />

      {/* ════════════════ FREE TIER CONTENT ════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-700">
            Included in your plan
          </span>
        </div>

        {/* Question Breakdown Cards with bar charts + AI summary */}
        {questions.map((question, index) => (
          <div key={question.question_id}>
            <QuestionBreakdownCard
              question={question}
              index={index}
              userTier={userTier}
              surveyId={surveyId}
            />
            {/* Individual Responses per Question */}
            <div className="mb-6 -mt-2 pl-2">
              <IndividualResponsesTable
                responses={individualResponses}
                userTier={userTier}
                questionIndex={index}
                loading={loadingIndividual}
              />
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No responses yet. Share your survey to collect data.</p>
          </div>
        )}
      </div>

      {/* ════════════════ PREMIUM PREVIEW (for free users) ════════════════ */}
      {!isPremium && (
        <PremiumPreviewSection
          tier="premium"
          onUpgrade={() => navigate('/pricing?theme=light')}
        />
      )}

      {/* ════════════════ ENTERPRISE PREVIEW (for free & premium users) ════════════════ */}
      {!isEnterprise && (
        <PremiumPreviewSection
          tier="enterprise"
          onUpgrade={() => navigate('/pricing?theme=light')}
        />
      )}

      {/* ════════════════ ACTUAL ENTERPRISE CONTENT (for enterprise users) ════════════════ */}
      {isEnterprise && (
        <EnterpriseDeepAnalysis userTier={userTier} totalResponses={stats.total_responses} />
      )}
    </div>
  );
};

export default SurveyAnalyticsDetail;
