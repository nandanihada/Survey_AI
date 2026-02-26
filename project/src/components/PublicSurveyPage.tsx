import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import type { Survey } from '../types/Survey';
// import type { Survey } from '../types/Survey'; // Adjust the path if needed

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

// Define fallback Survey type if you don't have a separate shared file
// interface Question {
//   id: string;
//   question: string;
//   type: 'text' | 'radio' | 'range';
//   options?: string[];
// }

// export interface Survey {
//   id: string;
//   title?: string;
//   subtitle?: string;
//   template_type: string;
//   questions: Question[];
//   [key: string]: unknown;
// }
// Mapping template types to components
const templateMap: Record<string, React.ComponentType<{ survey: Survey }>> = {
  customer_feedback: CustomerFeedbackTemplate,
  employee_checkin: EmployeeCheckInTemplate,
  custom: BasicSurveyTemplate, // Basic Survey template (PepperAds signature)
  event_feedback: EventFeedbackTemplate,
  product_feedback: ProductFeedbackTemplate,
  team_collaboration: TeamCollaborationTemplate,
  onboarding_review: OnboardingReviewTemplate,
  website_experience: WebsiteExperienceTemplate,
  training_feedback: TrainingFeedbackTemplate,
  service_cancellation: ServiceCancellationTemplate,
  default: CustomerFeedbackTemplate, // Fallback
};




const PublicSurveyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Get offer_id from query parameters (new format)
  const offerId = searchParams.get('offer_id');
  const surveyId = offerId || id; // Use offer_id if available, fallback to old format

  useEffect(() => {
    const fetchSurvey = async () => {
  if (!surveyId) return;
    // 🔁 Auto switch between local and live
      const isLocalhost = window.location.hostname === 'localhost';
      const apiBaseUrl = isLocalhost
        ? 'http://localhost:5000'
        : 'https://hostslice.onrender.com/';
  try {
    const response =await axios.get(`${apiBaseUrl}/survey/${surveyId}/view`);
   const data = response.data;
setSurvey(data.survey || data)
; 
  } catch (error) {
    console.error('Failed to fetch survey:', error);
  } finally {
    setLoading(false);
  }
};


    fetchSurvey();
  }, [surveyId]);

  if (loading) return <div>Loading survey...</div>;
  if (!survey) return <div>Survey not found</div>;

  console.log('Survey template_type:', survey.template_type, '| Available templates:', Object.keys(templateMap));
  const TemplateComponent = templateMap[survey.template_type] || templateMap['default'];

  if (!TemplateComponent) {
    return <div>No template found for: {survey.template_type}</div>;
  }

  return <TemplateComponent survey={survey} />;
};

export default PublicSurveyPage;
