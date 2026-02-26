import React, { useRef, useState } from 'react';
import {
  Users,
  CheckCircle,
  Calendar,
  Package,
  Handshake,
  Rocket,
  Globe,
  GraduationCap,
  XCircle,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  Heart,
  TrendingUp
} from 'lucide-react';
import TemplatePreviewModal from './TemplatePreviewModal';

interface Template {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  gradient: string;
  icon: React.ReactNode;
  imageUrl: string;
  previewQuestions: string[];
  features: string[];
}

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelectTemplate: (template: string) => void;
  isDarkMode?: boolean;
}

const templatesData: Template[] = [
  {
    id: 'custom',
    name: 'Basic Survey',
    description: 'Clean, flexible survey for any use case',
    fullDescription: 'The PepperAds signature survey template. A clean, professional design with step-by-step flow, keyboard navigation, and a polished experience that represents your brand beautifully.',
    gradient: 'from-red-400 via-orange-400 to-amber-400',
    icon: <Sparkles size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    previewQuestions: [
      'What is your primary goal for using our service?',
      'How would you rate your overall experience?',
      'What features would you like to see added?',
      'How likely are you to recommend us to others?'
    ],
    features: [
      'PepperAds signature design',
      'One-question-at-a-time flow',
      'Keyboard navigation support',
      'Clean, professional look',
      'Fully customizable questions',
      'Advanced analytics'
    ]
  },
  {
    id: 'customer_feedback',
    name: 'Customer Feedback',
    description: 'Satisfaction & service quality',
    fullDescription: 'Gather comprehensive feedback about your products and services. Understand customer satisfaction levels, identify pain points, and discover opportunities for improvement.',
    gradient: 'from-blue-500 to-cyan-500',
    icon: <Users size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    previewQuestions: [
      'How satisfied are you with our product/service?',
      'What did you like most about your experience?',
      'What could we improve?',
      'How likely are you to purchase from us again?',
      'Would you recommend us to friends or colleagues?'
    ],
    features: [
      'Net Promoter Score (NPS) tracking',
      'Customer satisfaction metrics',
      'Service quality assessment',
      'Product feedback collection',
      'Sentiment analysis',
      'Actionable insights dashboard'
    ]
  },
  {
    id: 'employee_checkin',
    name: 'Employee Check-In',
    description: 'Team wellness & support',
    fullDescription: 'Regular pulse checks to monitor employee wellbeing, engagement, and satisfaction. Build a supportive workplace culture by understanding your team\'s needs and concerns.',
    gradient: 'from-green-500 to-emerald-500',
    icon: <Heart size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    previewQuestions: [
      'How are you feeling about your workload this week?',
      'Do you have the resources you need to succeed?',
      'How supported do you feel by your manager?',
      'What\'s one thing that would improve your work experience?',
      'On a scale of 1-10, how would you rate your work-life balance?'
    ],
    features: [
      'Weekly wellness tracking',
      'Anonymous feedback option',
      'Burnout detection',
      'Team morale insights',
      'Manager support metrics',
      'Trend analysis over time'
    ]
  },
  {
    id: 'event_feedback',
    name: 'Event Feedback',
    description: 'Post-event experience',
    fullDescription: 'Capture attendee feedback immediately after your event. Measure success, identify highlights, and gather insights to make your next event even better.',
    gradient: 'from-orange-500 to-amber-500',
    icon: <Calendar size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    previewQuestions: [
      'How would you rate the overall event experience?',
      'What was your favorite part of the event?',
      'How relevant was the content to your needs?',
      'How likely are you to attend future events?',
      'What suggestions do you have for improvement?'
    ],
    features: [
      'Real-time feedback collection',
      'Session-specific ratings',
      'Speaker evaluation',
      'Venue assessment',
      'Networking effectiveness',
      'ROI measurement'
    ]
  },
  {
    id: 'product_feedback',
    name: 'Product Feedback',
    description: 'User experience & pain points',
    fullDescription: 'Deep dive into user experience with your product. Identify usability issues, discover feature requests, and prioritize your product roadmap based on real user needs.',
    gradient: 'from-purple-500 to-indigo-500',
    icon: <Package size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    previewQuestions: [
      'How easy is our product to use?',
      'Which features do you use most frequently?',
      'What problems does our product solve for you?',
      'What features are you missing?',
      'How does our product compare to alternatives?'
    ],
    features: [
      'Feature usage tracking',
      'Usability scoring',
      'Pain point identification',
      'Feature request prioritization',
      'Competitive analysis',
      'User journey mapping'
    ]
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Teamwork & alignment',
    fullDescription: 'Assess how well your team works together. Identify collaboration bottlenecks, improve communication, and strengthen team dynamics for better results.',
    gradient: 'from-indigo-500 to-blue-500',
    icon: <Handshake size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    previewQuestions: [
      'How effectively does your team communicate?',
      'Do you feel your ideas are heard and valued?',
      'How clear are team goals and priorities?',
      'What barriers prevent better collaboration?',
      'How can we improve cross-team coordination?'
    ],
    features: [
      'Communication effectiveness',
      'Goal alignment tracking',
      'Collaboration barriers',
      'Team dynamics assessment',
      'Cross-functional insights',
      'Action plan recommendations'
    ]
  },
  {
    id: 'onboarding_review',
    name: 'Onboarding Review',
    description: 'New hire experience',
    fullDescription: 'Optimize your onboarding process by gathering feedback from new hires. Ensure smooth transitions, identify gaps, and create a welcoming experience that sets employees up for success.',
    gradient: 'from-teal-500 to-cyan-500',
    icon: <Rocket size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
    previewQuestions: [
      'How prepared did you feel on your first day?',
      'Was the onboarding process clear and organized?',
      'Did you receive adequate training for your role?',
      'How welcomed did you feel by the team?',
      'What would have improved your onboarding experience?'
    ],
    features: [
      'First-day experience tracking',
      'Training effectiveness',
      'Cultural integration assessment',
      'Resource adequacy check',
      'Manager support evaluation',
      'Time-to-productivity metrics'
    ]
  },
  {
    id: 'website_experience',
    name: 'Website Experience',
    description: 'Test usability, flow, and clarity',
    fullDescription: 'Understand how visitors interact with your website. Identify usability issues, optimize user flows, and improve conversion rates through actionable feedback.',
    gradient: 'from-cyan-500 to-blue-500',
    icon: <Globe size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    previewQuestions: [
      'How easy was it to find what you were looking for?',
      'How would you rate the website design?',
      'Did you experience any technical issues?',
      'How clear was the information presented?',
      'What would improve your website experience?'
    ],
    features: [
      'Navigation usability',
      'Design feedback',
      'Technical issue reporting',
      'Content clarity assessment',
      'Mobile experience evaluation',
      'Conversion funnel analysis'
    ]
  },
  {
    id: 'training_feedback',
    name: 'Training Feedback',
    description: 'Measure the impact of your training session',
    fullDescription: 'Evaluate training effectiveness and learning outcomes. Gather participant feedback to improve content, delivery, and ensure knowledge retention.',
    gradient: 'from-pink-500 to-rose-500',
    icon: <GraduationCap size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    previewQuestions: [
      'How relevant was the training content to your role?',
      'How engaging was the training delivery?',
      'What did you learn that you can apply immediately?',
      'How confident do you feel with the new skills?',
      'What topics need more coverage?'
    ],
    features: [
      'Content relevance scoring',
      'Trainer effectiveness',
      'Knowledge retention check',
      'Skill confidence assessment',
      'Application readiness',
      'Follow-up recommendations'
    ]
  },
  {
    id: 'service_cancellation',
    name: 'Service Cancellation',
    description: 'Understand why users left',
    fullDescription: 'Learn why customers are leaving and what could bring them back. Reduce churn by understanding pain points and addressing concerns before it\'s too late.',
    gradient: 'from-red-500 to-orange-500',
    icon: <TrendingUp size={20} className="text-white" />,
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    previewQuestions: [
      'What is your primary reason for canceling?',
      'What could we have done differently?',
      'Did you find a better alternative?',
      'How likely are you to return in the future?',
      'What would make you reconsider your decision?'
    ],
    features: [
      'Churn reason analysis',
      'Win-back opportunity identification',
      'Competitive insights',
      'Service gap detection',
      'Retention strategy recommendations',
      'Exit interview automation'
    ]
  }
];

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
  isDarkMode = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handlePreview = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewTemplate(template);
  };

  const handleSelectFromPreview = () => {
    if (previewTemplate) {
      onSelectTemplate(previewTemplate.id);
      setPreviewTemplate(null);
    }
  };

  return (
    <>
      <div className="p-5 relative">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
              isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Grid3X3 size={12} />
          </div>
          <h3
            className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-stone-800'
            }`}
          >
            Choose a Template
          </h3>
        </div>

        {/* Carousel Controls */}
        <button
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 bg-white rounded-full shadow-md hover:bg-stone-100 transition"
          onClick={() => scroll('left')}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1 bg-white rounded-full shadow-md hover:bg-stone-100 transition"
          onClick={() => scroll('right')}
        >
          <ChevronRight size={20} />
        </button>

        {/* Horizontal Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
        >
          {templatesData.map((template) => (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={`min-w-[240px] snap-start flex-shrink-0 rounded-xl overflow-hidden shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl relative group ${
                selectedTemplate === template.id ? 'ring-4 ring-blue-500 ring-offset-2' : ''
              }`}
            >
              {/* Image with Gradient Overlay */}
              <div className="relative h-36 overflow-hidden">
                <img
                  src={template.imageUrl}
                  alt={template.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${template.gradient} opacity-60 group-hover:opacity-70 transition-opacity`} />
                
                {/* Preview Button */}
                <button
                  onClick={(e) => handlePreview(template, e)}
                  className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                  title="Preview Template"
                >
                  <Eye size={16} className="text-gray-700" />
                </button>
              </div>

              {/* Content */}
              <div
                className={`p-4 ${
                  isDarkMode
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-stone-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br ${template.gradient}`}>
                    {template.icon}
                  </div>
                  <h4 className="font-semibold text-sm leading-tight">{template.name}</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {template.description}
                </p>
              </div>

              {/* Selected Indicator */}
              {selectedTemplate === template.id && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1.5 shadow-lg animate-bounce">
                  <CheckCircle size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={handleSelectFromPreview}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
};

export default TemplateSelector;
