export interface SessionContext {
  session_id: string;
  user_id?: string;
  survey_id: string;
  timestamp: number;
  query_params: Record<string, string>;
  custom_data: Record<string, any>;
  fail_reason?: string;
  pass_score?: number;
}

export interface RedirectConfig {
  pass_redirect_url: string;
  fail_redirect_url: string;
  parameter_mappings?: Record<string, string>;
}

/**
 * Builds a dynamic redirect URL by replacing placeholders with actual values
 */
export function buildRedirectUrl(
  template: string, 
  context: SessionContext
): string {
  if (!template) return '';

  let url = template;

  // Replace standard placeholders
  const replacements: Record<string, string> = {
    '{session_id}': context.session_id || '',
    '{user_id}': context.user_id || '',
    '{survey_id}': context.survey_id || '',
    '{timestamp}': context.timestamp?.toString() || Date.now().toString(),
    '{unix_timestamp}': Math.floor((context.timestamp || Date.now()) / 1000).toString(),
    '{iso_timestamp}': new Date(context.timestamp || Date.now()).toISOString(),
    '{pass_score}': context.pass_score?.toString() || '',
    '{fail_reason}': context.fail_reason || '',
  };

  // Add query parameters as replacements
  Object.entries(context.query_params || {}).forEach(([key, value]) => {
    replacements[`{query_param_${key}}`] = value;
    replacements[`{${key}}`] = value; // Also support direct parameter names
  });
  
  // Add specific support for sub1 parameter
  if (context.query_params?.sub1) {
    replacements['{sub1}'] = context.query_params.sub1;
  }

  // Add custom data as replacements
  Object.entries(context.custom_data || {}).forEach(([key, value]) => {
    replacements[`{custom_${key}}`] = String(value);
  });

  // Replace all placeholders in the URL - use simple string replacement
  Object.entries(replacements).forEach(([placeholder, value]) => {
    url = url.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  console.log('🔍 Original template:', template);
  console.log('🔍 Session context:', context);
  console.log('🔍 Redirect URL replacements:', replacements);
  console.log('🔍 URL before replacements:', url);
  console.log('🎯 Final URL after replacements:', url);

  // Handle any remaining unmatched placeholders by removing them or replacing with empty string
  url = url.replace(/\{[^}]+\}/g, '');

  return url;
}

/**
 * Extracts query parameters from current URL
 */
export function extractQueryParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const urlParams = new URLSearchParams(window.location.search);
  
  urlParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Stores original query parameters in session storage for later use
 */
export function storeOriginalParams(params: Record<string, string>): void {
  try {
    sessionStorage.setItem('original_query_params', JSON.stringify(params));
  } catch (error) {
    console.warn('Failed to store original query params:', error);
  }
}

/**
 * Retrieves stored original query parameters
 */
export function getStoredParams(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem('original_query_params');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to retrieve stored query params:', error);
    return {};
  }
}

/**
 * Creates a session context object for redirect URL building
 */
export function createSessionContext(
  sessionId: string,
  surveyId: string,
  userId?: string
): SessionContext {
  const queryParams = extractQueryParams();
  
  return {
    session_id: sessionId,
    survey_id: surveyId,
    user_id: userId,
    timestamp: Date.now(),
    query_params: queryParams,
    custom_data: {}
  };
}

/**
 * Validates a redirect URL template
 */
export function validateRedirectTemplate(template: string): {
  isValid: boolean;
  errors: string[];
  placeholders: string[];
} {
  const errors: string[] = [];
  const placeholders: string[] = [];
  
  if (!template) {
    errors.push('Template cannot be empty');
    return { isValid: false, errors, placeholders };
  }

  // Extract all placeholders
  const matches = template.match(/\{[^}]+\}/g);
  if (matches) {
    placeholders.push(...matches);
  }

  // Check for valid URL format
  try {
    // Replace placeholders with dummy values for URL validation
    let testUrl = template;
    placeholders.forEach(placeholder => {
      testUrl = testUrl.replace(placeholder, 'test');
    });
    
    new URL(testUrl);
  } catch (error) {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    placeholders
  };
}
