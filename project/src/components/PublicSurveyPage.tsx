import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import type { Survey } from '../types/Survey';

// Import all templates
import CustomerFeedbackTemplate from '../templates/CustomerFeedbackTemplate';
import EmployeeCheckInTemplate from '../templates/EmployeeCheckInTemplate';
import BasicSurveyTemplate from '../templates/BasicSurveyTemplate';
import EventFeedbackTemplate from '../templates/EventFeedbackTemplate';
import ProductFeedbackTemplate from '../templates/ProductFeedbackTemplate';
import TeamCollaborationTemplate from '../templates/TeamCollaborationTemplate';
import OnboardingReviewTemplate from '../templates/OnboardingReviewTemplate';
import WebsiteExperienceTemplate from '../templates/WebsiteExperienceTemplate';
import TrainingFeedbackTemplate from '../templates/TrainingFeedbackTemplate';
import ServiceCancellationTemplate from '../templates/ServiceCancellationTemplate';

// Mapping template types to components
const templateMap: Record<string, React.ComponentType<{ survey: Survey }>> = {
  customer_feedback: CustomerFeedbackTemplate,
  employee_checkin: EmployeeCheckInTemplate,
  custom: BasicSurveyTemplate,
  event_feedback: EventFeedbackTemplate,
  product_feedback: ProductFeedbackTemplate,
  team_collaboration: TeamCollaborationTemplate,
  onboarding_review: OnboardingReviewTemplate,
  website_experience: WebsiteExperienceTemplate,
  training_feedback: TrainingFeedbackTemplate,
  service_cancellation: ServiceCancellationTemplate,
  default: CustomerFeedbackTemplate,
};

// Error boundary for template rendering
class TemplateErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ fontSize: 18, color: '#dc2626', marginBottom: 8 }}>Something went wrong loading this survey.</p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>{this.state.error}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PublicSurveyPage: React.FC = () => {
  const { id, shortId } = useParams<{ id: string; shortId: string }>();
  const [searchParams] = useSearchParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resolve survey ID: offer_id query param > path :id > path :shortId
  const offerId = searchParams.get('offer_id');
  const surveyId = offerId || id || shortId;

  const isLocalhost = window.location.hostname === 'localhost';
  const apiBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';

  useEffect(() => {
    if (!surveyId) {
      setError('No survey ID provided');
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      setLoading(true);
      setError('');
      try {
        console.log(`[PublicSurvey] Fetching survey: ${surveyId}`);
        const response = await axios.get(`${apiBaseUrl}/survey/${surveyId}/view`);
        const data = response.data;
        const surveyData = data.survey || data;

        if (!surveyData || !surveyData.questions || surveyData.questions.length === 0) {
          throw new Error('Survey has no questions');
        }

        console.log(`[PublicSurvey] Loaded: "${surveyData.title}" (${surveyData.template_type}) with ${surveyData.questions.length} questions`);
        setSurvey(surveyData);
      } catch (err) {
        console.error('[PublicSurvey] Failed to fetch survey:', err);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            setError('Survey not found. It may have been deleted.');
          } else if (err.response?.status === 500) {
            setError('Server error. Please try again later.');
          } else if (!err.response) {
            setError('Cannot reach the server. Please check your connection.');
          } else {
            setError(`Failed to load survey (${err.response.status})`);
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load survey');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId, apiBaseUrl]);

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#6b7280' }}>Loading survey...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
          <p style={{ fontSize: 16, color: '#374151', fontWeight: 600, marginBottom: 8 }}>Oops</p>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No survey
  if (!survey) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: 16, color: '#374151' }}>Survey not found</p>
        </div>
      </div>
    );
  }

  // Render template
  const TemplateComponent = templateMap[survey.template_type] || templateMap['default'];

  return (
    <TemplateErrorBoundary>
      <TemplateComponent survey={survey} />
    </TemplateErrorBoundary>
  );
};

export default PublicSurveyPage;
