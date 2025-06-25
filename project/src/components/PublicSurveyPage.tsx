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

  // Add other templates here...
};




const PublicSurveyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSurvey = async () => {
  if (!id) return;
  try {
    const response = await axios.get(`http://localhost:5000/survey/${id}/view`);
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
