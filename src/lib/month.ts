/**
 * Month strings - the "YYYY-MM" the reports and worker-stats screens page
 * through and hand to the export and stats endpoints.
 *
 * Four places had their own copy of this: two API routes built the default
 * month out of getFullYear()/getMonth() and split it back apart, and two
 * pages did the same to step a month forwards or backwards. The page copies
 * disagreed - one stepped through `new Date("2026-03-01")`, which parses as
 * UTC and then reads back in local time, so west of Greenwich the previous
 * month button landed a month short. Stepping is arithmetic on year and
 * month here, so it cannot drift with the reader's timezone.
 */

export interface MonthParts {
  /** Four-digit calendar year. */
  year: number;
  /** Calendar month, 1-12 - not the 0-11 a Date reports. */
  month: number;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The "YYYY-MM" a date falls in, read in the reader's own timezone. */
export function toMonthString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * The year and month a string names, or null if it is not a month string.
 * Only "YYYY-MM" with a month in 01-12 counts: "2026-13", "2026-1" and
 * "2026-03-04" are all rejected rather than quietly read as something else.
 */
export function parseMonthString(month: string): MonthParts | null {
  const match = MONTH_PATTERN.exec(month.trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/**
 * A usable month string from whatever arrived - a query parameter, a piece
 * of component state, nothing at all. Anything unreadable falls back to the
 * month `now` is in, which is what the screens ask for when they ask for no
 * month in particular.
 */
export function resolveMonthString(
  input: string | null | undefined,
  now: Date = new Date()
): string {
  if (input && parseMonthString(input)) return input.trim();
  return toMonthString(now);
}

/** The month a string names, falling back to the month `now` is in. */
function partsOrNow(month: string, now: Date): MonthParts {
  return (
    parseMonthString(month) ?? { year: now.getFullYear(), month: now.getMonth() + 1 }
  );
}

/**
 * Local midnight on the first of the month. Built by setting the year
 * explicitly, because the Date constructor reads a bare year under 100 as
 * 1900-something.
 */
export function monthStartDate(month: string, now: Date = new Date()): Date {
  const parts = partsOrNow(month, now);
  const date = new Date(2000, 0, 1, 0, 0, 0, 0);
  date.setFullYear(parts.year, parts.month - 1, 1);
  return date;
}

/**
 * The month `delta` months away, as another month string. Negative deltas
 * step backwards, and both directions carry across a year boundary.
 */
export function shiftMonth(month: string, delta: number, now: Date = new Date()): string {
  const parts = partsOrNow(month, now);
  const monthsFromYearZero = parts.year * 12 + (parts.month - 1) + delta;
  const year = Math.floor(monthsFromYearZero / 12);
  const shifted = monthsFromYearZero - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(shifted).padStart(2, '0')}`;
}
