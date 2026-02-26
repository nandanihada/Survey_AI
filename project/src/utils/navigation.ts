import { NavigateFunction } from 'react-router-dom';

export const navigationHistory: string[] = [];

/**
 * Track navigation for smart back button
 */
export function trackNavigation(path: string) {
  navigationHistory.push(path);
  if (navigationHistory.length > 10) {
    navigationHistory.shift(); // Keep only last 10
  }
}

/**
 * Smart back navigation with fallback
 */
export function goBack(navigate: NavigateFunction, fallback: string = '/dashboard') {
  // Check if we have internal history
  if (navigationHistory.length > 1) {
    navigationHistory.pop(); // Remove current
    const previous = navigationHistory[navigationHistory.length - 1];
    navigate(previous);
  } else if (window.history.length > 2) {
    // Use browser history if available
    navigate(-1);
  } else {
    // No history, go to fallback
    navigate(fallback);
  }
}

/**
 * Context-aware navigation helpers
 */
export function goBackToSurveys(navigate: NavigateFunction) {
  navigate('/dashboard', { replace: false });
}

export function goBackToDashboard(navigate: NavigateFunction) {
  navigate('/dashboard', { replace: false });
}

/**
 * Navigate to create survey
 */
export function navigateToCreateSurvey(navigate: NavigateFunction) {
  navigate('/dashboard/create', { state: { openCreate: true } });
}

/**
 * Navigate to survey edit
 */
export function navigateToEditSurvey(navigate: NavigateFunction, surveyId: string) {
  navigate(`/dashboard/edit/${surveyId}`);
}

/**
 * Navigate to survey preview
 */
export function navigateToPreviewSurvey(navigate: NavigateFunction, surveyId: string) {
  navigate(`/dashboard/preview/${surveyId}`);
}
