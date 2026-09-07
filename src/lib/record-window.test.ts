/**
 * The stretch of time a listing covers.
 *
 * These windows decide which day's takings the owner is looking at, so a
 * window that slips by an hour or a month silently shows the wrong money.
 * The cases pinned here are the ones the four hand-written copies got
 * wrong: a month parameter that is not a month, a thirteenth month, the
 * turn of a year, and the Cairo offset either side of summer time.
 *
 * Everything is asserted as an instant in UTC rather than as a local
 * string, so the suite says the same thing on a laptop in Cairo and on a
 * build machine set to UTC.
 */

import { describe, expect, it } from 'vitest';

import {
  cairoDayWindow,
  cairoMonthWindow,
  cairoWeekWindow,
  parseDayString,
  resolveCairoMonthString,
  resolveDayString,
  resolveRecordWindow,
} from './record-window';

/** 15 January 2026, 20:30 Cairo - winter, so Cairo is two hours ahead. */
const WINTER_EVENING = new Date('2026-01-15T18:30:00.000Z');

/** 15 July 2026, 20:30 Cairo - summer time, so three hours ahead. */
const SUMMER_EVENING = new Date('2026-07-15T17:30:00.000Z');

describe('parseDayString', () => {
  it('reads a day', () => {
    expect(parseDayString('2026-03-05')).toEqual({ year: 2026, month: 3, day: 5 });
  });

  it('ignores padding', () => {
    expect(parseDayString('  2026-03-05  ')).toEqual({ year: 2026, month: 3, day: 5 });
  });

  it('rejects a month that does not exist', () => {
    expect(parseDayString('2026-13-01')).toBeNull();
    expect(parseDayString('2026-00-01')).toBeNull();
  });

  it('rejects a day that does not exist in that month', () => {
    expect(parseDayString('2026-02-30')).toBeNull();
    expect(parseDayString('2026-04-31')).toBeNull();
    expect(parseDayString('2026-01-32')).toBeNull();
    expect(parseDayString('2026-01-00')).toBeNull();
  });

  it('accepts the 29th of February in a leap year and refuses it otherwise', () => {
    expect(parseDayString('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseDayString('2026-02-29')).toBeNull();
  });

  it('rejects a day written some other way', () => {
    expect(parseDayString('2026-3-5')).toBeNull();
    expect(parseDayString('05/03/2026')).toBeNull();
    expect(parseDayString('2026-03-05T10:00:00Z')).toBeNull();
    expect(parseDayString('2026-03')).toBeNull();
  });

  it('rejects nothing at all', () => {
    expect(parseDayString(null)).toBeNull();
    expect(parseDayString(undefined)).toBeNull();
    expect(parseDayString('')).toBeNull();
  });
});

describe('cairoDayWindow', () => {
  it('runs midnight to midnight in Cairo, two hours ahead in winter', () => {
    const window = cairoDayWindow('2026-01-15');
    expect(window.start.toISOString()).toBe('2026-01-14T22:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-01-15T21:59:59.999Z');
  });

  it('runs three hours ahead under summer time', () => {
    const window = cairoDayWindow('2026-07-15');
    expect(window.start.toISOString()).toBe('2026-07-14T21:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-07-15T20:59:59.999Z');
  });

  it('covers the day and nothing either side of it', () => {
    const { start, end } = cairoDayWindow('2026-01-15');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('falls back to the day it is in Cairo when asked for nothing', () => {
    expect(cairoDayWindow(null, WINTER_EVENING).start.toISOString()).toBe(
      '2026-01-14T22:00:00.000Z'
    );
  });

  it('falls back rather than building an impossible window from a typo', () => {
    expect(cairoDayWindow('yesterday', WINTER_EVENING)).toEqual(
      cairoDayWindow(null, WINTER_EVENING)
    );
    expect(cairoDayWindow('2026-02-30', WINTER_EVENING)).toEqual(
      cairoDayWindow(null, WINTER_EVENING)
    );
  });

  it('never hands the database an invalid date', () => {
    for (const bad of ['nope', '2026-13-40', '', '   ']) {
      const window = cairoDayWindow(bad, WINTER_EVENING);
      expect(Number.isNaN(window.start.getTime())).toBe(false);
      expect(Number.isNaN(window.end.getTime())).toBe(false);
    }
  });

  it('reads late Cairo evening as still that Cairo day', () => {
    // 23:30 Cairo on the 15th is 21:30 UTC the same day.
    const lateEvening = new Date('2026-01-15T21:30:00.000Z');
    expect(cairoDayWindow(null, lateEvening).start.toISOString()).toBe(
      '2026-01-14T22:00:00.000Z'
    );
  });

  it('reads an instant just past Cairo midnight as the next Cairo day', () => {
    // 00:30 Cairo on the 16th is 22:30 UTC on the 15th.
    const justPastMidnight = new Date('2026-01-15T22:30:00.000Z');
    expect(cairoDayWindow(null, justPastMidnight).start.toISOString()).toBe(
      '2026-01-15T22:00:00.000Z'
    );
  });
});

describe('cairoMonthWindow', () => {
  it('runs the first of the month to the last, in Cairo', () => {
    const window = cairoMonthWindow('2026-01');
    expect(window.start.toISOString()).toBe('2025-12-31T22:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-01-31T21:59:59.999Z');
  });

  it('runs to the end of a short month', () => {
    expect(cairoMonthWindow('2026-02').end.toISOString()).toBe('2026-02-28T21:59:59.999Z');
  });

  it('includes the 29th of a leap February', () => {
    expect(cairoMonthWindow('2028-02').end.toISOString()).toBe('2028-02-29T21:59:59.999Z');
  });

  it('runs three hours ahead under summer time', () => {
    const window = cairoMonthWindow('2026-07');
    expect(window.start.toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-07-31T20:59:59.999Z');
  });

  it('refuses a thirteenth month rather than rolling into the next year', () => {
    expect(cairoMonthWindow('2026-13', WINTER_EVENING)).toEqual(
      cairoMonthWindow(null, WINTER_EVENING)
    );
  });

  it('falls back to the month Cairo is in when asked for nothing', () => {
    expect(cairoMonthWindow(null, WINTER_EVENING).start.toISOString()).toBe(
      '2025-12-31T22:00:00.000Z'
    );
  });

  it('falls back to the Cairo month even when UTC is still in the old one', () => {
    // 00:30 Cairo on 1 February is 22:30 UTC on 31 January.
    const justPastMidnight = new Date('2026-01-31T22:30:00.000Z');
    expect(cairoMonthWindow(null, justPastMidnight)).toEqual(cairoMonthWindow('2026-02'));
  });

  it('stays in the Cairo month through its last hours', () => {
    // 23:30 Cairo on 31 January is 21:30 UTC the same day.
    const lateEvening = new Date('2026-01-31T21:30:00.000Z');
    expect(cairoMonthWindow(null, lateEvening)).toEqual(cairoMonthWindow('2026-01'));
  });

  it('never hands the database an invalid date', () => {
    for (const bad of ['nope', '2026-13', '2026', '2026-1', '']) {
      const window = cairoMonthWindow(bad, WINTER_EVENING);
      expect(Number.isNaN(window.start.getTime())).toBe(false);
      expect(Number.isNaN(window.end.getTime())).toBe(false);
    }
  });

  it('starts where the previous month ends, with nothing falling between', () => {
    const december = cairoMonthWindow('2025-12');
    const january = cairoMonthWindow('2026-01');
    expect(january.start.getTime() - december.end.getTime()).toBe(1);
  });
});

describe('cairoWeekWindow', () => {
  it('starts on the Sunday before the day asked for', () => {
    // Thursday 15 January 2026; the Sunday before is the 11th.
    const window = cairoWeekWindow('2026-01-15');
    expect(window.start.toISOString()).toBe('2026-01-10T22:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-01-17T21:59:59.999Z');
  });

  it('treats a Sunday as the first day of its own week', () => {
    const sunday = cairoWeekWindow('2026-01-11');
    expect(sunday.start.toISOString()).toBe('2026-01-10T22:00:00.000Z');
  });

  it('treats a Saturday as the last day of that same week', () => {
    const saturday = cairoWeekWindow('2026-01-17');
    expect(saturday).toEqual(cairoWeekWindow('2026-01-11'));
  });

  it('covers seven days', () => {
    const { start, end } = cairoWeekWindow('2026-01-15');
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });

  it('carries back across the turn of a year', () => {
    // Friday 2 January 2026; the Sunday before is 28 December 2025.
    expect(cairoWeekWindow('2026-01-02').start.toISOString()).toBe(
      '2025-12-27T22:00:00.000Z'
    );
  });

  it('falls back to the week Cairo is in now', () => {
    expect(cairoWeekWindow(null, WINTER_EVENING)).toEqual(cairoWeekWindow('2026-01-15'));
  });

  it('falls back rather than building a window from a typo', () => {
    expect(cairoWeekWindow('last week', WINTER_EVENING)).toEqual(
      cairoWeekWindow(null, WINTER_EVENING)
    );
  });

  it('turns the week over on Cairo midnight, not on UTC midnight', () => {
    // 00:30 Cairo on Sunday 18 January is 22:30 UTC on Saturday the 17th.
    const justPastMidnight = new Date('2026-01-17T22:30:00.000Z');
    expect(cairoWeekWindow(null, justPastMidnight)).toEqual(cairoWeekWindow('2026-01-18'));
    expect(cairoWeekWindow(null, justPastMidnight)).not.toEqual(
      cairoWeekWindow('2026-01-17')
    );
  });
});

describe('resolveDayString', () => {
  it('keeps a day it can read', () => {
    expect(resolveDayString('2026-03-05')).toBe('2026-03-05');
  });

  it('trims a day it can read', () => {
    expect(resolveDayString(' 2026-03-05 ')).toBe('2026-03-05');
  });

  it('falls back to the day it is in Cairo', () => {
    expect(resolveDayString(null, WINTER_EVENING)).toBe('2026-01-15');
    expect(resolveDayString('rubbish', SUMMER_EVENING)).toBe('2026-07-15');
  });

  it('falls back for a day that does not exist', () => {
    expect(resolveDayString('2026-02-30', WINTER_EVENING)).toBe('2026-01-15');
  });

  it('always returns something the window helper accepts', () => {
    for (const input of [null, 'nope', '2026-13-40', '2026-03-05']) {
      expect(parseDayString(resolveDayString(input, WINTER_EVENING))).not.toBeNull();
    }
  });
});

describe('resolveCairoMonthString', () => {
  it('keeps a month it can read', () => {
    expect(resolveCairoMonthString('2026-03')).toBe('2026-03');
  });

  it('falls back to the month it is in Cairo, not on the server', () => {
    expect(resolveCairoMonthString(null, WINTER_EVENING)).toBe('2026-01');
    expect(resolveCairoMonthString('2026-13', SUMMER_EVENING)).toBe('2026-07');
  });

  it('reads the last hours of a Cairo month as that month', () => {
    // 23:30 Cairo on 31 January is 21:30 UTC the same day.
    expect(resolveCairoMonthString(null, new Date('2026-01-31T21:30:00.000Z'))).toBe('2026-01');
  });

  it('reads the first hour of the next Cairo month as the next month', () => {
    // 00:30 Cairo on 1 February is 22:30 UTC on 31 January.
    expect(resolveCairoMonthString(null, new Date('2026-01-31T22:30:00.000Z'))).toBe('2026-02');
  });
});

describe('resolveRecordWindow', () => {
  it('takes the day when a day is asked for', () => {
    expect(resolveRecordWindow({ date: '2026-01-15' })).toEqual(cairoDayWindow('2026-01-15'));
  });

  it('takes the month when only a month is asked for', () => {
    expect(resolveRecordWindow({ month: '2026-01' })).toEqual(cairoMonthWindow('2026-01'));
  });

  it('prefers the day when both are asked for', () => {
    expect(resolveRecordWindow({ date: '2026-01-15', month: '2026-07' })).toEqual(
      cairoDayWindow('2026-01-15')
    );
  });

  it('falls through to the month when the day cannot be read', () => {
    expect(resolveRecordWindow({ date: 'nope', month: '2026-07' })).toEqual(
      cairoMonthWindow('2026-07')
    );
  });

  it('gives today when nothing is asked for', () => {
    expect(resolveRecordWindow({}, WINTER_EVENING)).toEqual(
      cairoDayWindow(null, WINTER_EVENING)
    );
    expect(resolveRecordWindow({ date: null, month: null }, WINTER_EVENING)).toEqual(
      cairoDayWindow(null, WINTER_EVENING)
    );
  });

  it('always ends after it starts', () => {
    const queries = [
      {},
      { date: '2026-01-15' },
      { month: '2026-02' },
      { date: 'nope' },
      { month: '2026-13' },
      { date: '2026-02-30', month: 'nope' },
    ];
    for (const query of queries) {
      const { start, end } = resolveRecordWindow(query, WINTER_EVENING);
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    }
  });
});
