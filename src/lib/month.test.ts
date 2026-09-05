/**
 * Month strings.
 *
 * The reports and worker-stats screens page through months a click at a
 * time and hand the result to the export endpoint, so a month that steps
 * wrong shows the owner the wrong month's takings without saying so. The
 * cases that matter are the boundaries - December to January, February in
 * a leap year - and the timezone, since the screens run in whatever
 * timezone the reader's browser is in.
 */

import { describe, expect, it } from 'vitest';

import {
  monthStartDate,
  parseMonthString,
  resolveMonthString,
  shiftMonth,
  toMonthString,
} from './month';

describe('toMonthString', () => {
  it('writes the month a date falls in', () => {
    expect(toMonthString(new Date(2026, 2, 15))).toBe('2026-03');
  });

  it('pads a single-digit month', () => {
    expect(toMonthString(new Date(2026, 0, 1))).toBe('2026-01');
  });

  it('reads the first instant of a month as that month', () => {
    expect(toMonthString(new Date(2026, 6, 1, 0, 0, 0, 0))).toBe('2026-07');
  });

  it('reads the last instant of a month as that month', () => {
    expect(toMonthString(new Date(2026, 6, 31, 23, 59, 59, 999))).toBe('2026-07');
  });

  it('pads a year below four digits', () => {
    const date = new Date(2000, 4, 1);
    date.setFullYear(99);
    expect(toMonthString(date)).toBe('0099-05');
  });
});

describe('parseMonthString', () => {
  it('reads a well-formed month', () => {
    expect(parseMonthString('2026-03')).toEqual({ year: 2026, month: 3 });
  });

  it('reads January as month 1, not month 0', () => {
    expect(parseMonthString('2026-01')).toEqual({ year: 2026, month: 1 });
  });

  it('reads December', () => {
    expect(parseMonthString('2026-12')).toEqual({ year: 2026, month: 12 });
  });

  it('ignores surrounding whitespace', () => {
    expect(parseMonthString('  2026-03  ')).toEqual({ year: 2026, month: 3 });
  });

  it('rejects a month above December', () => {
    expect(parseMonthString('2026-13')).toBeNull();
  });

  it('rejects month zero', () => {
    expect(parseMonthString('2026-00')).toBeNull();
  });

  it('rejects an unpadded month', () => {
    expect(parseMonthString('2026-3')).toBeNull();
  });

  it('rejects a full date', () => {
    expect(parseMonthString('2026-03-04')).toBeNull();
  });

  it('rejects a two-digit year', () => {
    expect(parseMonthString('26-03')).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(parseMonthString('')).toBeNull();
  });

  it('rejects something that is not a month at all', () => {
    expect(parseMonthString('last month')).toBeNull();
  });
});

describe('resolveMonthString', () => {
  const now = new Date(2026, 8, 5);

  it('keeps a month it can read', () => {
    expect(resolveMonthString('2025-11', now)).toBe('2025-11');
  });

  it('trims a month it can read', () => {
    expect(resolveMonthString(' 2025-11 ', now)).toBe('2025-11');
  });

  it('falls back to the current month when nothing was asked for', () => {
    expect(resolveMonthString(null, now)).toBe('2026-09');
  });

  it('falls back to the current month for undefined', () => {
    expect(resolveMonthString(undefined, now)).toBe('2026-09');
  });

  it('falls back to the current month for an empty parameter', () => {
    expect(resolveMonthString('', now)).toBe('2026-09');
  });

  it('falls back to the current month for a malformed parameter', () => {
    expect(resolveMonthString('2026-13', now)).toBe('2026-09');
  });

  it('always returns something the parser accepts', () => {
    for (const input of ['nonsense', '2026-13', '', null, undefined, '2026-3']) {
      expect(parseMonthString(resolveMonthString(input, now))).not.toBeNull();
    }
  });
});

describe('monthStartDate', () => {
  it('lands on the first of the month', () => {
    const start = monthStartDate('2026-03');
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(1);
  });

  it('lands on local midnight', () => {
    const start = monthStartDate('2026-03');
    expect([start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()])
      .toEqual([0, 0, 0, 0]);
  });

  it('is the same calendar month the string named, in any timezone', () => {
    // `new Date("2026-03-01")` parses as UTC and reads back as February
    // west of Greenwich; this must not.
    expect(toMonthString(monthStartDate('2026-03'))).toBe('2026-03');
  });

  it('handles January', () => {
    expect(toMonthString(monthStartDate('2026-01'))).toBe('2026-01');
  });

  it('handles December', () => {
    expect(toMonthString(monthStartDate('2026-12'))).toBe('2026-12');
  });

  it('keeps a year below 100 out of the 1900s', () => {
    expect(monthStartDate('0099-05').getFullYear()).toBe(99);
  });

  it('falls back to the current month for a malformed string', () => {
    const start = monthStartDate('nonsense', new Date(2026, 8, 5));
    expect(toMonthString(start)).toBe('2026-09');
  });
});

describe('shiftMonth', () => {
  it('steps forward within a year', () => {
    expect(shiftMonth('2026-03', 1)).toBe('2026-04');
  });

  it('steps back within a year', () => {
    expect(shiftMonth('2026-03', -1)).toBe('2026-02');
  });

  it('steps forward across the new year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('steps back across the new year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('steps a whole year forward', () => {
    expect(shiftMonth('2026-07', 12)).toBe('2027-07');
  });

  it('steps a whole year back', () => {
    expect(shiftMonth('2026-07', -12)).toBe('2025-07');
  });

  it('steps several years back at once', () => {
    expect(shiftMonth('2026-02', -26)).toBe('2023-12');
  });

  it('stays put for a step of zero', () => {
    expect(shiftMonth('2026-07', 0)).toBe('2026-07');
  });

  it('does not skip a month at the end of a long one', () => {
    // Stepping through Date arithmetic turns 31 January into 3 March.
    expect(shiftMonth('2026-01', 1)).toBe('2026-02');
  });

  it('comes back to where it started after stepping both ways', () => {
    for (let month = 1; month <= 12; month++) {
      const start = `2026-${String(month).padStart(2, '0')}`;
      expect(shiftMonth(shiftMonth(start, 1), -1)).toBe(start);
    }
  });

  it('walks twenty-four months without repeating or skipping one', () => {
    const seen: string[] = [];
    let month = '2025-01';
    for (let step = 0; step < 24; step++) {
      seen.push(month);
      month = shiftMonth(month, 1);
    }
    expect(new Set(seen).size).toBe(24);
    expect(seen[0]).toBe('2025-01');
    expect(seen[11]).toBe('2025-12');
    expect(seen[12]).toBe('2026-01');
    expect(month).toBe('2027-01');
  });

  it('falls back to the current month for a malformed string', () => {
    expect(shiftMonth('nonsense', -1, new Date(2026, 8, 5))).toBe('2026-08');
  });
});
