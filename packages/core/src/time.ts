import { DateTime } from 'luxon';

/**
 * The one and only display/scheduling timezone for this app.
 *
 * GOLDEN RULE — never double-convert:
 *  - Store every kickoff as a UTC instant.
 *  - Convert to Helsinki ONLY for display, via Luxon (here).
 *  - If a source already shows GMT+3 / UTC+3 / EEST, that offset IS Helsinki
 *    summer time — parse it as-is (parseInstant respects the offset) and DO NOT
 *    add anything. There are tests proving this in time.test.ts.
 */
export const APP_TZ = 'Europe/Helsinki';

/** The daily briefing anchor hour in Helsinki local time (18:00). */
export const BRIEFING_ANCHOR_HOUR = 18;

/**
 * Parse an instant from a source into a UTC Luxon DateTime.
 *
 * Accepts:
 *  - an ISO string WITH offset/Z (e.g. "2026-06-18T18:00:00+03:00") — the offset
 *    determines the absolute instant; we do not shift it again.
 *  - a JS Date (already an absolute instant).
 *
 * Throws on invalid input. Does NOT accept naive wall-clock strings (no offset) —
 * for those, you must say which zone they're in; use {@link wallTimeToUtc}.
 */
export function parseInstant(input: string | Date): DateTime {
  let dt: DateTime;
  if (input instanceof Date) {
    dt = DateTime.fromJSDate(input, { zone: 'utc' });
  } else {
    // setZone keeps the absolute instant but expresses it in UTC. If the string
    // carries no offset, Luxon assumes UTC here — which would be ambiguous, so we
    // guard against it below.
    const hasOffset = /([zZ])|([+-]\d{2}:?\d{2})$/.test(input.trim());
    if (!hasOffset) {
      throw new Error(
        `parseInstant got an offset-less timestamp "${input}". ` +
          `Use wallTimeToUtc(..., zone) to interpret naive local times.`,
      );
    }
    dt = DateTime.fromISO(input, { setZone: true }).toUTC();
  }
  if (!dt.isValid) {
    throw new Error(`Invalid instant "${String(input)}": ${dt.invalidReason}`);
  }
  return dt;
}

/** Interpret a naive wall-clock time as local to `zone`, return the UTC instant. */
export function wallTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute?: number },
  zone: string = APP_TZ,
): Date {
  const dt = DateTime.fromObject(
    { ...parts, minute: parts.minute ?? 0, second: 0, millisecond: 0 },
    { zone },
  );
  if (!dt.isValid) {
    throw new Error(`Invalid ${zone} wall time: ${dt.invalidReason}`);
  }
  return dt.toUTC().toJSDate();
}

/** Convert a UTC instant to a Helsinki-zoned Luxon DateTime (for formatting). */
export function toHelsinki(utc: string | Date, zone: string = APP_TZ): DateTime {
  return parseInstant(utc).setZone(zone);
}

/** Format a kickoff for the Finnish briefing, e.g. "to 18.6. klo 18:00". */
export function formatHelsinkiKickoff(utc: string | Date, zone: string = APP_TZ): string {
  return toHelsinki(utc, zone).setLocale('fi').toFormat("ccc d.M. 'klo' HH:mm");
}

export interface BriefingWindow {
  /** Inclusive start (UTC). */
  startUtc: Date;
  /** Exclusive end (UTC). */
  endUtc: Date;
  /** The Helsinki calendar date the window's start falls on (YYYY-MM-DD). */
  helsinkiDate: string;
}

/**
 * The 24h briefing window that CONTAINS `now`, anchored at 18:00 Helsinki.
 *
 * At/after 18:00 → [today 18:00, tomorrow 18:00). Before 18:00 → [yesterday 18:00,
 * today 18:00). This makes the 18:00 cron produce exactly "today 18:00 → tomorrow
 * 18:00" while staying well-defined if called at any other time.
 */
export function briefingWindow(
  now: Date | DateTime = new Date(),
  zone: string = APP_TZ,
): BriefingWindow {
  const nowZ =
    now instanceof DateTime ? now.setZone(zone) : DateTime.fromJSDate(now).setZone(zone);

  let start = nowZ.set({
    hour: BRIEFING_ANCHOR_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (nowZ < start) {
    start = start.minus({ days: 1 });
  }
  const end = start.plus({ days: 1 });

  return {
    startUtc: start.toUTC().toJSDate(),
    endUtc: end.toUTC().toJSDate(),
    helsinkiDate: start.toFormat('yyyy-MM-dd'),
  };
}

/** Is the given UTC kickoff inside the window? (start inclusive, end exclusive) */
export function isInWindow(koUtc: string | Date, w: BriefingWindow): boolean {
  const t = parseInstant(koUtc).toMillis();
  return t >= w.startUtc.getTime() && t < w.endUtc.getTime();
}

/** Filter & sort matches whose kickoff lies in the window (earliest first). */
export function matchesInWindow<T extends { koUtc: string }>(
  matches: readonly T[],
  w: BriefingWindow,
): T[] {
  return matches
    .filter((m) => isInWindow(m.koUtc, w))
    .sort((a, b) => parseInstant(a.koUtc).toMillis() - parseInstant(b.koUtc).toMillis());
}
