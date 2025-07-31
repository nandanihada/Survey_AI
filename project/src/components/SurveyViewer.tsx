import React from 'react';
import CustomerFeedbackTemplate from '../templates/CustomerFeedbackTemplate';
import type { Survey } from '../types/Survey';

interface SurveyViewerProps {
  survey: Survey;
}

const templateMap: Record<string, React.ComponentType<{ survey: Survey }>> = {
  customer_feedback: CustomerFeedbackTemplate,
  // add more mappings if needed
};

const SurveyViewer: React.FC<SurveyViewerProps> = ({ survey }) => {
  const TemplateComponent = templateMap[survey.template_type];

  if (!TemplateComponent) {
    return (
      <div className="text-center text-red-500">
        No preview available for this template type: <strong>{survey.template_type}</strong>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: 'scale(0.75)',
        transformOrigin: 'top left',
        width: '133%',
        pointerEvents: 'none',
      }}
    >
      <TemplateComponent survey={survey} />
    </div>
  );
};

export default SurveyViewer;
