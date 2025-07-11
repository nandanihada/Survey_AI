const SERVER_URL = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : 'https://pepper-flask-app.onrender.com';

export interface SurveyRequest {
  prompt: string;
  response_type: string;
  template_type: string;
  question_count: number;
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
  const response = await fetch(`${SERVER_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
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
  
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
};

export const fetchSurveys = async () => {
  const response = await fetch(`${SERVER_URL}/surveys`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch surveys: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
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