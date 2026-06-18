/**
 * Display helpers. The briefing stores kickoffs in UTC; we convert to
 * Europe/Helsinki ONLY here, using the browser's Intl with an explicit timeZone
 * (never manual offset math) — so there is no risk of double-conversion.
 */
const HELSINKI = 'Europe/Helsinki';

const koFormatter = new Intl.DateTimeFormat('fi-FI', {
  timeZone: HELSINKI,
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** e.g. "to 18.6. klo 19:00" */
export function formatKickoff(utcIso: string): string {
  const parts = koFormatter.formatToParts(new Date(utcIso));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = get('weekday').replace('.', '');
  return `${weekday} ${get('day')}.${get('month')}. klo ${get('hour')}:${get('minute')}`;
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(1)} %`;
}

export function scoreline(home: string, away: string, hg: number, ag: number): string {
  return `${home}–${away} ${hg}–${ag}`;
}
