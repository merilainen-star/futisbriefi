import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  briefingWindow,
  formatHelsinkiKickoff,
  isInWindow,
  matchesInWindow,
  parseInstant,
  toHelsinki,
  wallTimeToUtc,
} from './time.js';

describe('no double-conversion (the rule that has burned us)', () => {
  it('treats a +03:00 / EEST source time as Helsinki summer time and adds nothing', () => {
    // 18:00 in Helsinki on a June day == 15:00 UTC. The source already says +03:00,
    // so the absolute instant is 15:00Z — we must NOT shift it by another 3 hours.
    const fromSource = parseInstant('2026-06-18T18:00:00+03:00');
    expect(fromSource.toUTC().toISO()).toBe('2026-06-18T15:00:00.000Z');

    // And displaying it back in Helsinki returns 18:00, not 21:00.
    expect(toHelsinki(fromSource.toJSDate()).toFormat('HH:mm')).toBe('18:00');
  });

  it('round-trips a Helsinki wall time through UTC exactly once', () => {
    const utc = wallTimeToUtc({ year: 2026, month: 6, day: 18, hour: 18 });
    expect(utc.toISOString()).toBe('2026-06-18T15:00:00.000Z');
    expect(toHelsinki(utc).toFormat('HH:mm')).toBe('18:00');
  });

  it('the whole World Cup window is EEST (UTC+3): 18:00 Helsinki is always 15:00 UTC', () => {
    for (const day of ['2026-06-11', '2026-06-30', '2026-07-19']) {
      const [y, m, d] = day.split('-').map(Number);
      const utc = wallTimeToUtc({ year: y!, month: m!, day: d!, hour: 18 });
      expect(utc.toISOString().slice(11, 16)).toBe('15:00');
    }
  });

  it('rejects an offset-less timestamp instead of silently assuming a zone', () => {
    expect(() => parseInstant('2026-06-18T18:00:00')).toThrow(/offset-less/);
  });
});

describe('briefingWindow', () => {
  const helsinki = (iso: string) => DateTime.fromISO(iso, { zone: 'Europe/Helsinki' });

  it('at 18:00 spans today 18:00 → tomorrow 18:00 (Helsinki)', () => {
    const w = briefingWindow(helsinki('2026-06-18T18:00:00'));
    expect(w.startUtc.toISOString()).toBe('2026-06-18T15:00:00.000Z');
    expect(w.endUtc.toISOString()).toBe('2026-06-19T15:00:00.000Z');
    expect(w.helsinkiDate).toBe('2026-06-18');
  });

  it('just before 18:00 belongs to the previous window', () => {
    const w = briefingWindow(helsinki('2026-06-18T17:59:00'));
    expect(w.startUtc.toISOString()).toBe('2026-06-17T15:00:00.000Z');
    expect(w.endUtc.toISOString()).toBe('2026-06-18T15:00:00.000Z');
  });

  it('after midnight still belongs to the prior 18:00 window', () => {
    const w = briefingWindow(helsinki('2026-06-19T02:30:00'));
    expect(w.startUtc.toISOString()).toBe('2026-06-18T15:00:00.000Z');
    expect(w.endUtc.toISOString()).toBe('2026-06-19T15:00:00.000Z');
  });
});

describe('isInWindow / matchesInWindow', () => {
  const w = briefingWindow(DateTime.fromISO('2026-06-18T18:00:00', { zone: 'Europe/Helsinki' }));

  it('includes the start instant and excludes the end instant', () => {
    expect(isInWindow('2026-06-18T15:00:00Z', w)).toBe(true); // start, inclusive
    expect(isInWindow('2026-06-19T15:00:00Z', w)).toBe(false); // end, exclusive
    expect(isInWindow('2026-06-18T14:59:59Z', w)).toBe(false);
    expect(isInWindow('2026-06-19T13:00:00Z', w)).toBe(true);
  });

  it('filters and sorts matches earliest-first', () => {
    const matches = [
      { id: 'late', koUtc: '2026-06-19T13:00:00Z' },
      { id: 'out', koUtc: '2026-06-20T13:00:00Z' },
      { id: 'early', koUtc: '2026-06-18T16:00:00Z' },
    ];
    expect(matchesInWindow(matches, w).map((m) => m.id)).toEqual(['early', 'late']);
  });
});

describe('formatHelsinkiKickoff', () => {
  it('formats in Finnish with Helsinki time', () => {
    const s = formatHelsinkiKickoff('2026-06-18T15:00:00Z');
    expect(s).toMatch(/18\.6\./);
    expect(s).toMatch(/klo 18:00/);
  });
});
