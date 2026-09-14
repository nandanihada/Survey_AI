/**
 * Date formatting utilities — all output in IST (Asia/Kolkata, UTC+5:30)
 *
 * Use these helpers everywhere a date/time is displayed to the user.
 * They accept ISO strings, timestamps (number), or Date objects.
 */

const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };

type DateInput = string | number | Date | null | undefined;

function toDate(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const d = new Date(input as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/** "14 Sep 2026, 10:30 AM" */
export function formatIST(input: DateInput, fallback = '—'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return d.toLocaleString('en-IN', {
    ...IST,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** "14 Sep 2026" (date only) */
export function formatISTDate(input: DateInput, fallback = '—'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString('en-IN', {
    ...IST,
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** "10:30 AM" (time only) */
export function formatISTTime(input: DateInput, fallback = '—'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-IN', {
    ...IST,
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** "Sep 14" — for chart axis labels */
export function formatISTChartDay(input: DateInput, fallback = '?'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString('en-IN', { ...IST, month: 'short', day: 'numeric' });
}
