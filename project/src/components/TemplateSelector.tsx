import React from 'react';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelectTemplate: (template: string) => void;
}

const templates = [
  {
    id: 'customer_feedback',
    name: 'Customer Feedback',
    description: 'Understand satisfaction with your service/product',
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    id: 'employee_checkin',
    name: 'Employee Check-In',
    description: 'Check your team\'s mental state and support needs',
    gradient: 'from-green-400 to-green-600'
  },
  {
    id: 'event_feedback',
    name: 'Event Feedback',
    description: 'Understand how attendees felt post-event',
    gradient: 'from-orange-400 to-orange-600'
  },
  {
    id: 'product_feedback',
    name: 'Product Feedback',
    description: 'Explore customer experience and pain points',
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Evaluate meetings, trust and alignment',
    gradient: 'from-indigo-400 to-indigo-600'
  },
  {
    id: 'onboarding_review',
    name: 'Onboarding Review',
    description: 'Learn how new hires felt during onboarding',
    gradient: 'from-teal-400 to-teal-600'
  },
  {
    id: 'website_experience',
    name: 'Website Experience',
    description: 'Test usability, flow, and clarity',
    gradient: 'from-cyan-400 to-cyan-600'
  },
  {
    id: 'training_feedback',
    name: 'Training Feedback',
    description: 'Measure the impact of your training session',
    gradient: 'from-pink-400 to-pink-600'
  },
  {
    id: 'service_cancellation',
    name: 'Service Cancellation',
    description: 'Learn why users left and what could change their mind',
    gradient: 'from-red-400 to-red-600'
  }
];

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  selectedTemplate, 
  onSelectTemplate 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-4">
        <span className="text-xl mr-2"></span>
        Choose a Template
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              selectedTemplate === template.id 
                ? 'ring-4 ring-red-500 ring-offset-2' 
                : ''
            }`}
          >
            <div className={`bg-gradient-to-br ${template.gradient} p-6 text-white h-40 flex flex-col justify-between`}>
              <div>
                <h4 className="font-bold text-lg mb-2">{template.name}</h4>
                <p className="text-sm opacity-90">{template.description}</p>
              </div>
              <div className="flex justify-end">
                <span className="text-2xl"></span>
              </div>
            </div>
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2 bg-white text-red-600 rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;