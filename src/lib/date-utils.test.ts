/**
 * Cairo time.
 *
 * The till, the shift reports and the day's takings are all reckoned in
 * Africa/Cairo while the database stores UTC, so every boundary here is an
 * offset question. Egypt keeps summer time again, which means the offset is
 * +02:00 for half the year and +03:00 for the other half - the January and
 * July cases below are there for exactly that reason.
 */

import { describe, expect, it } from 'vitest';

import {
  calculateElapsedMinutes,
  formatCairoDate,
  formatCairoDateTime,
  formatCairoTime,
  getCairoDayEnd,
  getCairoDayStart,
  getCairoMonthEnd,
  getCairoMonthStart,
  getDateRangeForDay,
  getDateRangeForMonth,
  parseDateString,
} from './date-utils';

/** 22:30 UTC is already tomorrow in Cairo, which is the interesting part. */
const WINTER_EVENING = new Date('2026-01-15T22:30:00Z');
const SUMMER_EVENING = new Date('2026-07-15T22:30:00Z');

describe('formatCairoDate', () => {
  it('rolls an evening UTC stamp into the next Cairo day', () => {
    expect(formatCairoDate(WINTER_EVENING)).toBe('2026-01-16');
  });

  it('takes an ISO string as readily as a Date', () => {
    expect(formatCairoDate('2026-01-15T22:30:00Z')).toBe('2026-01-16');
  });

  it('honours a format string', () => {
    expect(formatCairoDate(WINTER_EVENING, 'dd/MM/yyyy')).toBe('16/01/2026');
  });

  it('reads midday as the same day either side of the offset', () => {
    expect(formatCairoDate(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01-15');
  });
});

describe('formatCairoTime', () => {
  it('adds two hours in winter', () => {
    expect(formatCairoTime(WINTER_EVENING)).toBe('00:30');
  });

  it('adds three in summer, when Egypt keeps DST', () => {
    expect(formatCairoTime(SUMMER_EVENING)).toBe('01:30');
  });

  it('pads to a 24-hour clock', () => {
    expect(formatCairoTime(new Date('2026-01-15T06:05:00Z'))).toBe('08:05');
  });
});

describe('formatCairoDateTime', () => {
  it('gives the date and the time together', () => {
    expect(formatCairoDateTime(WINTER_EVENING)).toBe('2026-01-16 00:30:00');
  });

  it('agrees with the two parts it is made of', () => {
    const both = formatCairoDateTime(SUMMER_EVENING);
    expect(both.startsWith(formatCairoDate(SUMMER_EVENING))).toBe(true);
    expect(both).toContain(formatCairoTime(SUMMER_EVENING));
  });
});

describe('the Cairo day', () => {
  it('starts at midnight Cairo, which is 22:00 UTC the day before', () => {
    expect(getCairoDayStart(WINTER_EVENING).toISOString()).toBe(
      '2026-01-15T22:00:00.000Z',
    );
  });

  it('ends on the last millisecond of the Cairo day', () => {
    expect(getCairoDayEnd(WINTER_EVENING).toISOString()).toBe(
      '2026-01-16T21:59:59.999Z',
    );
  });

  it('ends after it starts', () => {
    expect(getCairoDayEnd(WINTER_EVENING).getTime()).toBeGreaterThan(
      getCairoDayStart(WINTER_EVENING).getTime(),
    );
  });

  it('is a shade under 24 hours long', () => {
    const span =
      getCairoDayEnd(WINTER_EVENING).getTime() -
      getCairoDayStart(WINTER_EVENING).getTime();
    expect(span).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('contains the moment it was asked about', () => {
    expect(getCairoDayStart(WINTER_EVENING).getTime()).toBeLessThanOrEqual(
      WINTER_EVENING.getTime(),
    );
    expect(getCairoDayEnd(WINTER_EVENING).getTime()).toBeGreaterThanOrEqual(
      WINTER_EVENING.getTime(),
    );
  });
});

describe('the Cairo month', () => {
  it('starts at midnight on the first', () => {
    expect(getCairoMonthStart(WINTER_EVENING).toISOString()).toBe(
      '2025-12-31T22:00:00.000Z',
    );
  });

  it('ends on the last millisecond of the last day', () => {
    expect(getCairoMonthEnd(WINTER_EVENING).toISOString()).toBe(
      '2026-01-31T21:59:59.999Z',
    );
  });

  it('brackets the day it was asked about', () => {
    expect(getCairoMonthStart(WINTER_EVENING).getTime()).toBeLessThan(
      getCairoDayStart(WINTER_EVENING).getTime(),
    );
    expect(getCairoMonthEnd(WINTER_EVENING).getTime()).toBeGreaterThan(
      getCairoDayEnd(WINTER_EVENING).getTime(),
    );
  });
});

describe('getDateRangeForDay', () => {
  it('brackets the Cairo day the string names', () => {
    const range = getDateRangeForDay('2026-01-15');
    expect(range.start.toISOString()).toBe('2026-01-14T22:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-01-15T21:59:59.999Z');
  });

  it('moves the bracket with the date', () => {
    const first = getDateRangeForDay('2026-01-15');
    const second = getDateRangeForDay('2026-01-16');
    expect(second.start.getTime()).toBeGreaterThan(first.start.getTime());
  });

  it('leaves no gap between one day and the next', () => {
    const first = getDateRangeForDay('2026-01-15');
    const second = getDateRangeForDay('2026-01-16');
    expect(second.start.getTime() - first.end.getTime()).toBe(1);
  });
});

describe('getDateRangeForMonth', () => {
  it('brackets the Cairo month the string names', () => {
    const range = getDateRangeForMonth('2026-01');
    expect(range.start.toISOString()).toBe('2025-12-31T22:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-01-31T21:59:59.999Z');
  });

  it('covers every day of that month', () => {
    const month = getDateRangeForMonth('2026-01');
    const day = getDateRangeForDay('2026-01-31');
    expect(month.start.getTime()).toBeLessThanOrEqual(day.start.getTime());
    expect(month.end.getTime()).toBeGreaterThanOrEqual(day.end.getTime());
  });

  it('leaves no gap between one month and the next', () => {
    const january = getDateRangeForMonth('2026-01');
    const february = getDateRangeForMonth('2026-02');
    expect(february.start.getTime() - january.end.getTime()).toBe(1);
  });
});

describe('calculateElapsedMinutes', () => {
  it('counts the minutes a car was in the bay', () => {
    expect(
      calculateElapsedMinutes(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T11:30:00Z'),
      ),
    ).toBe(90);
  });

  it('is zero when the two stamps match', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    expect(calculateElapsedMinutes(now, now)).toBe(0);
  });

  it('rounds to the nearest minute', () => {
    expect(
      calculateElapsedMinutes(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T10:00:31Z'),
      ),
    ).toBe(1);
  });

  it('goes negative if the stamps are the wrong way round', () => {
    expect(
      calculateElapsedMinutes(
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T10:00:00Z'),
      ),
    ).toBe(-60);
  });

  it('is unaffected by the offset, being a difference', () => {
    expect(
      calculateElapsedMinutes(
        new Date('2026-07-01T10:00:00Z'),
        new Date('2026-07-01T11:00:00Z'),
      ),
    ).toBe(60);
  });
});

describe('parseDateString', () => {
  it('reads an ISO date', () => {
    expect(parseDateString('2026-01-15').getUTCFullYear()).toBe(2026);
  });

  it('reads a full ISO stamp', () => {
    expect(parseDateString('2026-01-15T22:30:00Z').toISOString()).toBe(
      '2026-01-15T22:30:00.000Z',
    );
  });

  it('gives an invalid date for nonsense rather than throwing', () => {
    expect(Number.isNaN(parseDateString('not a date').getTime())).toBe(true);
  });
});
