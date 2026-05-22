/**
 * Moustacheleads Survey Router Integration (Frontend)
 * 
 * When users arrive from Moustacheleads, the URL contains:
 *   - session_id (or ml_session_id): Moustacheleads session identifier
 *   - postback_url: URL to fire GET on survey completion
 *   - success_url: Redirect destination on pass/completion
 *   - fail_url: Redirect destination on fail
 *   - quota_url: Redirect destination when survey is full/quota reached
 * 
 * These params are captured on page load and stored in sessionStorage,
 * then included in the survey submission payload for backend processing.
 */

const ML_STORAGE_KEY = 'moustacheleads_params';

export interface MoustacheleadsParams {
  ml_session_id?: string;
  postback_url: string;
  success_url?: string;
  fail_url?: string;
  quota_url?: string;
}

/**
 * Extract Moustacheleads params from current URL and store them.
 * Call this once when the survey page loads.
 */
export function captureMoustacheleadsParams(): MoustacheleadsParams | null {
  const params = new URLSearchParams(window.location.search);
  
  const postbackUrl = params.get('postback_url');
  if (!postbackUrl) return null;
  
  const mlData: MoustacheleadsParams = {
    postback_url: postbackUrl,
  };
  
  // session_id from Moustacheleads (may collide with our internal session_id)
  const mlSession = params.get('ml_session_id') || params.get('session_id');
  if (mlSession) mlData.ml_session_id = mlSession;
  
  if (params.get('success_url')) mlData.success_url = params.get('success_url')!;
  if (params.get('fail_url')) mlData.fail_url = params.get('fail_url')!;
  if (params.get('quota_url')) mlData.quota_url = params.get('quota_url')!;
  
  // Persist in sessionStorage so it survives within the survey session
  try {
    sessionStorage.setItem(ML_STORAGE_KEY, JSON.stringify(mlData));
  } catch (e) {
    console.warn('[Moustacheleads] Failed to store params:', e);
  }
  
  console.log('🧔 [Moustacheleads] Params captured:', mlData);
  return mlData;
}

/**
 * Retrieve stored Moustacheleads params (if any).
 * Returns null if this is not a Moustacheleads session.
 */
export function getMoustacheleadsParams(): MoustacheleadsParams | null {
  try {
    const stored = sessionStorage.getItem(ML_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.postback_url ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Check if the current session originated from Moustacheleads.
 */
export function isMoustacheleadsSession(): boolean {
  return getMoustacheleadsParams() !== null;
}

/**
 * Get the moustacheleads payload to include in submission body.
 * Returns an object to spread into the fetch body, or empty object.
 * 
 * Usage:
 *   body: JSON.stringify({ responses, email, ...getMoustacheleadsPayload() })
 */
export function getMoustacheleadsPayload(): { moustacheleads?: MoustacheleadsParams } {
  const params = getMoustacheleadsParams();
  if (!params) return {};
  return { moustacheleads: params };
}
