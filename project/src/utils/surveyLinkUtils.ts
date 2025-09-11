/**
 * Utility functions for generating survey links with custom parameters
 */

export interface SurveyLinkParams {
  [key: string]: string | number | boolean;
}

/**
 * Generates a survey link with optional URL parameters
 * @param surveyId - The survey ID (will be used as offer_id)
 * @param userId - Optional user ID to append
 * @param additionalParams - Optional URL parameters to append
 * @param username - Optional username for aff_sub parameter
 * @returns Complete survey link with parameters
 */
export function generateSurveyLink(
  surveyId: string, 
  userId?: string, 
  additionalParams: SurveyLinkParams = {},
  username?: string
): string {
  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5173'
    : 'https://theinterwebsite.space';
  
  // Create URL with query parameters - ALWAYS go to /survey page
  const url = new URL(`${baseUrl}/survey`);
  
  // Add offer_id parameter
  url.searchParams.set('offer_id', surveyId);
  
  // Add user_id parameter if provided
  if (userId) {
    url.searchParams.set('user_id', userId);
  }
  
  // Add aff_sub parameter if username is provided
  if (username) {
    url.searchParams.set('aff_sub', username);
  }
  
  // Add any additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  
  return url.toString();
}

/**
 * Parses URL parameters from a string format like "uid=123&source=email"
 * @param paramString - String containing URL parameters
 * @returns Object with parsed parameters
 */
export function parseParamString(paramString: string): SurveyLinkParams {
  const params: SurveyLinkParams = {};
  
  if (!paramString.trim()) return params;

  // Handle both "key=value&key2=value2" and "?key=value&key2=value2" formats
  const cleanString = paramString.startsWith('?') ? paramString.slice(1) : paramString;
  
  cleanString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      params[key.trim()] = decodeURIComponent(value.trim());
    }
  });

  return params;
}

/**
 * Converts parameter object to URL parameter string
 * @param params - Parameters object
 * @returns URL parameter string (without leading ?)
 */
export function stringifyParams(params: SurveyLinkParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
}
