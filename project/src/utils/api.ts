const SERVER_URL = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : 'https://api.theinterwebsite.space';

export interface SurveyRequest {
  prompt: string;
  response_type?: string;
  template_type: string;
  question_count?: number;
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
  
  // Get user data from localStorage (new auth system)
  const userData = localStorage.getItem('user_data');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Add Authorization header with user_id if user is logged in
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.id) {
        headers['Authorization'] = `Bearer ${user.id}`;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  const response = await fetch(`${SERVER_URL}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestData),
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
  
  console.log('Backend response:', result);
  
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
};

export const fetchSurveys = async () => {
  // Get user data from localStorage (new auth system)
  const userData = localStorage.getItem('user_data');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  // Add Authorization header with user_id if user is logged in
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.id) {
        headers['Authorization'] = `Bearer ${user.id}`;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  const response = await fetch(`${SERVER_URL}/api/surveys/`, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  
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