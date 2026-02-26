import React from 'react';
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
import IframePreview from './IframePreview';
import type { Survey } from '../types/Survey';

interface SurveyViewerProps {
  survey: Survey;
}

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
};

const SurveyViewer: React.FC<SurveyViewerProps> = ({ survey }) => {
  const TemplateComponent = templateMap[survey.template_type] || templateMap['customer_feedback'];

  if (!TemplateComponent) {
    return (
      <div className="text-center text-red-500">
        No preview available for this template type: <strong>{survey.template_type}</strong>
      </div>
    );
  }

  return (
    <div style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', pointerEvents: 'none' }}>
      <IframePreview style={{ width: '100%', height: '100%' }}>
        <TemplateComponent survey={survey} />
      </IframePreview>
    </div>
  );
};

export default SurveyViewer;
