import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import type { Survey } from '../types/Survey';
// import type { Survey } from '../types/Survey'; // Adjust the path if needed

// ImSurvey, port all templates
import CustomerFeedbackTemplate from '../templates/CustomerFeedbackTemplate';

// import other templates as needed...

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
  custom: CustomerFeedbackTemplate, // Use same template for custom surveys
  default: CustomerFeedbackTemplate, // Fallback

  // Add other templates here...
};




const PublicSurveyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSurvey = async () => {
  if (!id) return;
    // 🔁 Auto switch between local and live
      const isLocalhost = window.location.hostname === 'localhost';
      const apiBaseUrl = isLocalhost
        ? 'http://localhost:5000'
        : 'https://pepper-flask-app.onrender.com';
  try {
    const response =await axios.get(`${apiBaseUrl}/survey/${id}/view`);
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
  }, [id]);

  if (loading) return <div>Loading survey...</div>;
  if (!survey) return <div>Survey not found</div>;

  const TemplateComponent = templateMap[survey.template_type];
  
  

  if (!TemplateComponent) {
    return <div>No template found for: {survey.template_type}</div>;
  }

  return <TemplateComponent survey={survey} />;
};

export default PublicSurveyPage;
