/**
 * Deployment Fix Utilities
 * Handles API URL detection and authentication compatibility
 */

export const getApiBaseUrl = (): string => {
  // Check if we're in development or production
  const isDevelopment = window.location.hostname.includes('localhost') || 
                       window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    return 'http://localhost:5000';
  }
  
  // Production API URL
  return 'https://api.theinterwebsite.space';
};

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Priority 1: JWT token (deployed backend uses JWT)
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Using JWT token for authentication');
    return headers;
  }

  // Priority 2: User ID from user_data (fallback for simple auth)
  const userData = localStorage.getItem('user_data');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.id) {
        headers['Authorization'] = `Bearer ${user.id}`;
        console.log('Using user ID for authentication');
        return headers;
      }
    } catch (e) {
      console.warn('Error parsing user_data:', e);
    }
  }

  console.warn('No authentication token found');
  return headers;
};

export const makeApiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const defaultHeaders = getAuthHeaders();
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    credentials: 'include'
  };

  console.log(`Making API request to: ${url}`);
  
  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      
      // Check if we got HTML instead of JSON (endpoint not found)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error(`Endpoint not found: ${endpoint}`);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`Network error for ${url}:`, error);
    throw error;
  }
};

export const handleApiError = (error: any, context: string): string => {
  console.error(`${context} error:`, error);
  
  if (error.message.includes('Endpoint not found')) {
    return `Service temporarily unavailable. Please try again later.`;
  }
  
  if (error.message.includes('Failed to fetch')) {
    return `Network error. Please check your connection and try again.`;
  }
  
  if (error.message.includes('Unexpected token')) {
    return `Service configuration error. Please contact support.`;
  }
  
  return error.message || 'An unexpected error occurred';
};
