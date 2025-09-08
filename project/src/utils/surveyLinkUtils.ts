/**
 * Utility functions for generating survey links with custom parameters
 */

export interface SurveyLinkParams {
  [key: string]: string | number | boolean;
}

/**
 * Generates a survey link with optional URL parameters
 * @param surveyId - The survey ID (will be used as offer_id)
 * @param baseUrl - The base URL (localhost or production)
 * @param params - Optional URL parameters to append (should include user_id)
 * @returns Complete survey link with parameters
 */
export function generateSurveyLink(
  surveyId: string, 
  baseUrl?: string, 
  params?: SurveyLinkParams
): string {
  const finalBaseUrl = baseUrl || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5173'
      : 'https://theinterwebsite.space'
  );

  // New format: /survey?offer_id=RXDA1&user_id=123
  const searchParams = new URLSearchParams();
  searchParams.append('offer_id', surveyId);
  
  if (params && Object.keys(params).length > 0) {
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
  }

  return `${finalBaseUrl}/survey?${searchParams.toString()}`;
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
