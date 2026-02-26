import React, { useState } from 'react';
import { X, CheckCircle, Sparkles, Eye } from 'lucide-react';
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

interface TemplatePreviewModalProps {
  template: {
    id: string;
    name: string;
    description: string;
    fullDescription: string;
    gradient: string;
    icon: React.ReactNode;
    imageUrl: string;
    previewQuestions: string[];
    features: string[];
  };
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  isDarkMode?: boolean;
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

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  isOpen,
  onClose,
  onSelect,
  isDarkMode = false
}) => {
  const [showLivePreview, setShowLivePreview] = useState(false);

  if (!isOpen) return null;

  // Create a mock survey for preview
  const mockSurvey: Survey = {
    id: 'preview',
    title: template.name,
    subtitle: template.description,
    template_type: template.id,
    questions: template.previewQuestions.slice(0, 3).map((q, i) => ({
      id: `q${i}`,
      question: q,
      type: i === 0 ? 'text' : i === 1 ? 'multiple_choice' : 'rating',
      options: i === 1 ? ['Excellent', 'Good', 'Fair', 'Poor'] : undefined,
    })),
  };

  const TemplateComponent = templateMap[template.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          isDarkMode ? 'bg-slate-900' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all hover:scale-110"
        >
          <X size={20} className="text-gray-700" />
        </button>

        {/* Toggle Preview Button */}
        <button
          onClick={() => setShowLivePreview(!showLivePreview)}
          className="absolute top-4 right-16 z-10 px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all hover:scale-105 flex items-center gap-2"
        >
          <Eye size={16} />
          {showLivePreview ? 'Show Details' : 'Live Preview'}
        </button>

        {showLivePreview ? (
          /* Live Template Preview via iframe */
          <div className="p-4">
            <div className="mb-4 text-center">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {template.name} - Live Preview
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This is how your survey will look to respondents
              </p>
            </div>
            <div className="border-4 border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative" style={{ height: '70vh' }}>
              <IframePreview style={{ width: '100%', height: '100%' }}>
                {TemplateComponent && <TemplateComponent survey={mockSurvey} />}
              </IframePreview>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={onSelect}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r ${template.gradient} hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2`}
              >
                <Sparkles size={20} />
                Use This Template
              </button>
              <button
                onClick={onClose}
                className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                  isDarkMode
                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header Image */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={template.imageUrl}
                alt={template.name}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${template.gradient} opacity-80`} />
              <div className="absolute bottom-6 left-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {template.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold drop-shadow-lg">{template.name}</h2>
                    <p className="text-white/90 text-sm drop-shadow">{template.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
          {/* Full Description */}
          <div className="mb-8">
            <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              About This Template
            </h3>
            <p className={`text-base leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {template.fullDescription}
            </p>
          </div>

          {/* Features */}
          <div className="mb-8">
            <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {template.features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    isDarkMode ? 'bg-slate-800' : 'bg-gray-50'
                  }`}
                >
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Questions */}
          <div className="mb-8">
            <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Sample Questions
            </h3>
            <div className="space-y-3">
              {template.previewQuestions.map((question, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    isDarkMode 
                      ? 'bg-slate-800 border-blue-500' 
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`font-semibold text-sm ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Q{index + 1}.
                    </span>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {question}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={onSelect}
                  className={`flex-1 py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r ${template.gradient} hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2`}
                >
                  <Sparkles size={20} />
                  Use This Template
                </button>
                <button
                  onClick={onClose}
                  className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                    isDarkMode
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
