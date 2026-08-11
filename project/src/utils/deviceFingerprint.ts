/**
 * Lightweight device fingerprint generator.
 *
 * Combines stable, non-PII browser signals and hashes them to a hex string.
 * Deliberately avoids canvas/audio fingerprinting that can change on innocent
 * browser updates — we only want a soft duplicate signal, not a tracker.
 *
 * Signals used:
 *  - navigator.userAgent
 *  - navigator.language
 *  - navigator.platform
 *  - screen.width × screen.height × screen.colorDepth
 *  - Intl timezone
 *  - navigator.hardwareConcurrency (CPU threads, relatively stable)
 */

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceFingerprint(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? 0),
  ].join('||');

  try {
    return await sha256(signals);
  } catch {
    // Fallback: base64-like compact representation
    return btoa(signals).slice(0, 64);
  }
}

// ─── LocalStorage helpers ────────────────────────────────────────────────────

const LS_PREFIX = 'survey_done_';

export function markSurveyComplete(surveyId: string): void {
  try {
    localStorage.setItem(`${LS_PREFIX}${surveyId}`, Date.now().toString());
  } catch {
    // localStorage may be blocked in certain contexts — silently ignore
  }
}

export function hasSurveyBeenCompleted(surveyId: string): boolean {
  try {
    return localStorage.getItem(`${LS_PREFIX}${surveyId}`) !== null;
  } catch {
    return false;
  }
}

export function clearSurveyComplete(surveyId: string): void {
  try {
    localStorage.removeItem(`${LS_PREFIX}${surveyId}`);
  } catch {
    // ignore
  }
}
