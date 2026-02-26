import { getApiBaseUrl, makeApiRequest, handleApiError } from './deploymentFix';

const SERVER_URL = getApiBaseUrl();

export interface SurveyRequest {
  prompt: string;
  response_type?: string;
  template_type: string;
  question_count?: number;
  image_context?: string;
  theme: {
    font: string;
    intent: string;
    colors: {
      primary: string;
      background: string;
      text: string;
    };
  };
}

export const generateSurvey = async (data: SurveyRequest) => {
  // Add default values for missing optional fields
  const requestData = {
    ...data,
    response_type: data.response_type || 'multiple_choice',
    question_count: data.question_count || (data.template_type === 'custom' ? 20 : 10)
  };
  
  console.log('Sending request to backend:', requestData);
  
  // Use deployment fix for consistent authentication
  try {
    const response = await makeApiRequest('/generate', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    const result = await response.json();
    
    console.log('Backend response:', result);
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error('Survey generation failed:', error);
    throw new Error(handleApiError(error, 'Survey generation'));
  }
};

export const fetchSurveys = async () => {
  try {
    const response = await makeApiRequest('/api/surveys/', {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch surveys: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Fetch surveys failed:', error);
    throw new Error(handleApiError(error, 'Fetch surveys'));
  }
};

export const generateInsights = async (surveyId: string) => {
  const response = await fetch(`${SERVER_URL}/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ survey_id: surveyId })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate insights: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export const submitSurveyResponse = async (surveyId: string, responses: any, trackingId?: string, email?: string, username?: string) => {
  const response = await fetch(`${SERVER_URL}/survey/${surveyId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      responses,
      tracking_id: trackingId,
      email,
      username
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to submit response: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export const fetchSurveyData = async (surveyId: string, email?: string, username?: string) => {
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (username) params.append('username', username);
  
  const url = `${SERVER_URL}/survey/${surveyId}/view${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch survey: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};


export const parseImage = async (imageBase64: string): Promise<string> => {
  try {
    const response = await makeApiRequest('/parse-image', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
    });
    if (!response.ok) throw new Error(`Image parse failed: ${response.status}`);
    const data = await response.json();
    return data.extracted_text || '';
  } catch (error) {
    console.error('Image parsing failed:', error);
    throw new Error(handleApiError(error, 'Image parsing'));
  }
};
