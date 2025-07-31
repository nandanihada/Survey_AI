import React, { useRef } from 'react';
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
  Zap
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
  imageUrl: string;
}

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelectTemplate: (template: string) => void;
  isDarkMode?: boolean;
}

const templatesData: Template[] = [
  {
    id: 'custom',
    name: 'AI Custom Survey',
    description: 'Unlimited questions, AI-generated',
    gradient: 'from-gradient-start to-gradient-end',
    icon: <Sparkles size={14} />,
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'customer_feedback',
    name: 'Customer Feedback',
    description: 'Satisfaction & service quality',
    gradient: 'from-blue-400 to-blue-600',
    icon: <Users size={14} />,
    imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGVvcGxlJTIwdGFsa2luZ3xlbnwwfHwwfHx8MA%3D%3D'
  },
  {
    id: 'employee_checkin',
    name: 'Employee Check-In',
    description: 'Team wellness & support',
    gradient: 'from-green-400 to-green-600',
    icon: <CheckCircle size={14} />,
    imageUrl: 'https://hiramjohnson.scusd.edu/sites/main/files/imagecache/lightbox/main-images/camera_lense_0.jpeg'
  },
  {
    id: 'event_feedback',
    name: 'Event Feedback',
    description: 'Post-event experience',
    gradient: 'from-orange-400 to-orange-600',
    icon: <Calendar size={14} />,
    imageUrl: 'https://images.pexels.com/photos/220769/pexels-photo-220769.jpeg'
  },
  {
    id: 'product_feedback',
    name: 'Product Feedback',
    description: 'User experience & pain points',
    gradient: 'from-purple-400 to-purple-600',
    icon: <Package size={14} />,
    imageUrl: 'https://www.shutterstock.com/image-photo/quality-assurance-concept-business-people-600nw-2182306991.jpg'
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Teamwork & alignment',
    gradient: 'from-indigo-400 to-indigo-600',
    icon: <Handshake size={14} />,
    imageUrl: 'https://burst.shopifycdn.com/photos/thick-lush-green-forest.jpg?width=1000&format=pjpg&exif=0&iptc=0'
  },
  {
    id: 'onboarding_review',
    name: 'Onboarding Review',
    description: 'New hire experience',
    gradient: 'from-teal-400 to-teal-600',
    icon: <Rocket size={14} />,
    imageUrl: 'https://www.watchesandcrystals.com/cdn/shop/articles/Tissot_watches_9a16dfe7-bff8-469f-9ac7-e04efb5d1efd.jpg?v=1750781147'
  },
  {
    id: 'website_experience',
    name: 'Website Experience',
    description: 'Test usability, flow, and clarity',
    gradient: 'from-cyan-400 to-cyan-600',
    icon: <Globe size={14} />,
    imageUrl: 'https://images.pexels.com/photos/32770328/pexels-photo-32770328.jpeg'
  },
  {
    id: 'training_feedback',
    name: 'Training Feedback',
    description: 'Measure the impact of your training session',
    gradient: 'from-pink-400 to-pink-600',
    icon: <GraduationCap size={14} />,
    imageUrl: 'https://images.pexels.com/photos/32730641/pexels-photo-32730641.jpeg'
  },
  {
    id: 'service_cancellation',
    name: 'Service Cancellation',
    description: 'Understand why users left',
    gradient: 'from-red-400 to-red-600',
    icon: <XCircle size={14} />,
    imageUrl: 'https://images.pexels.com/photos/35196/water-plant-green-fine-layers.jpg'
  }
];

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
  isDarkMode = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Repeat templates to simulate infinite
  const templates = [...templatesData, ...templatesData];

  return (
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
        {templates.map((template, index) => (
          <div
            key={`${template.id}-${index}`} // unique even when repeated
            onClick={() => onSelectTemplate(template.id)}
            className={`min-w-[220px] snap-start flex-shrink-0 rounded-xl overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:scale-[1.03] relative group ${
              selectedTemplate === template.id ? 'ring-2 ring-red-500' : ''
            }`}
          >
            <img
              src={template.imageUrl}
              alt={template.name}
              className="h-32 w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div
              className={`p-3 text-sm flex flex-col gap-1 bg-gradient-to-br ${
                template.id === 'custom'
                  ? 'from-purple-600 to-pink-600 text-white'
                  : isDarkMode
                  ? 'from-slate-800 to-slate-900 text-white'
                  : 'from-white to-stone-100 text-stone-800'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-5 h-5 flex items-center justify-center bg-opacity-10 rounded-full bg-black text-xs">
                  {template.icon}
                </span>
                {template.name}
              </div>
              <p className="text-xs opacity-70 leading-tight">
                {template.description}
              </p>
            </div>

            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2 bg-white text-red-600 rounded-full p-1 shadow-sm scale-90 group-hover:scale-100 transition">
                <CheckCircle size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
