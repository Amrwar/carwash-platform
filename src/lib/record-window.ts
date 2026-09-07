/**
 * The stretch of time a listing covers.
 *
 * Three handlers - wash records, mechanic records and the daily export -
 * each turned `?date=` and `?month=` into a start and an end for
 * themselves, and none of them checked what arrived first:
 *
 *   - `?month=` was split on the dash and read as two numbers, so
 *     `?month=nope` gave NaN, an Invalid Date, and a query the database
 *     rejected: a 500 for a typo in a URL.
 *   - `2026-13` sailed through the same split and came back as January
 *     2027 - a month of takings quietly attributed to the wrong month.
 *   - the anchor date for a month was local midnight on the 1st, which on
 *     a server running ahead of Cairo is still the previous month there,
 *     so the window covered the month before the one that was asked for.
 *
 * The window is worked out here instead, in Cairo, from an anchor built in
 * UTC so it cannot be dragged over a boundary by the server's own clock.
 * Anything unreadable falls back to today or to this month, which is what
 * the screens ask for when they ask for nothing in particular.
 */

import {
  formatCairoDate,
  getCairoDayEnd,
  getCairoDayStart,
  getCairoMonthEnd,
  getCairoMonthStart,
} from '@/lib/date-utils';
import { parseMonthString } from '@/lib/month';

/** The half of the day the records are looked up between, inclusive. */
export interface RecordWindow {
  start: Date;
  end: Date;
}

/** A calendar day, as the three numbers a "YYYY-MM-DD" names. */
export interface DayParts {
  year: number;
  month: number;
  day: number;
}

const DAY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Midday UTC on a calendar day - far enough from either edge that no
 * timezone between Honolulu and Auckland reads it as a different date. */
function utcMidday(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

/**
 * The day a string names, or null if it is not one. The day has to exist:
 * "2026-02-30" matches the shape and is still rejected.
 */
export function parseDayString(value: string | null | undefined): DayParts | null {
  if (!value) return null;
  const match = DAY_PATTERN.exec(value.trim());
  if (!match) return null;

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  const anchor = utcMidday(parts.year, parts.month, parts.day);
  if (anchor.getUTCDate() !== parts.day || anchor.getUTCMonth() !== parts.month - 1) {
    return null;
  }
  return parts;
}

/** The Cairo day a "YYYY-MM-DD" names, or today's if it names none. */
export function cairoDayWindow(
  value: string | null | undefined,
  now: Date = new Date()
): RecordWindow {
  const parts = parseDayString(value);
  const anchor = parts ? utcMidday(parts.year, parts.month, parts.day) : now;
  return { start: getCairoDayStart(anchor), end: getCairoDayEnd(anchor) };
}

/**
 * The Sunday-to-Saturday week a day falls in, in Cairo. The handler that
 * did this read the day of the week off the server's own clock and stepped
 * whole days with setDate, so a server in another timezone could start the
 * week on the wrong day.
 */
export function cairoWeekWindow(
  value: string | null | undefined,
  now: Date = new Date()
): RecordWindow {
  const parts = parseDayString(value) ?? parseDayString(formatCairoDate(now, 'yyyy-MM-dd'));
  const anchor = parts ? utcMidday(parts.year, parts.month, parts.day) : now;

  const sunday = new Date(anchor);
  sunday.setUTCDate(sunday.getUTCDate() - anchor.getUTCDay());
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);

  return { start: getCairoDayStart(sunday), end: getCairoDayEnd(saturday) };
}

/** The Cairo month a "YYYY-MM" names, or the one Cairo is in now. */
export function cairoMonthWindow(
  value: string | null | undefined,
  now: Date = new Date()
): RecordWindow {
  const parts = value ? parseMonthString(value) : null;
  const anchor = parts
    ? utcMidday(parts.year, parts.month, 1)
    : monthAnchorFor(now);
  return { start: getCairoMonthStart(anchor), end: getCairoMonthEnd(anchor) };
}

/** Midday UTC on the first of whatever month it is in Cairo right now. */
function monthAnchorFor(now: Date): Date {
  const parts = parseMonthString(formatCairoDate(now, 'yyyy-MM'));
  if (!parts) return now;
  return utcMidday(parts.year, parts.month, 1);
}

/**
 * The day a request asked for, written the one way we write days, or the
 * day it is in Cairo if it asked for nothing readable. This is the string
 * that ends up in the export's filename, so it has to be a real day.
 */
export function resolveDayString(
  value: string | null | undefined,
  now: Date = new Date()
): string {
  return parseDayString(value) ? value!.trim() : formatCairoDate(now, 'yyyy-MM-dd');
}

/**
 * The month a request asked for, or the month it is in Cairo. Cairo, not
 * the server: a report run from a machine an hour ahead should still be
 * the shop's month.
 */
export function resolveCairoMonthString(
  value: string | null | undefined,
  now: Date = new Date()
): string {
  return value && parseMonthString(value) ? value.trim() : formatCairoDate(now, 'yyyy-MM');
}

/** The query parameters a listing handler is asked for a window with. */
export interface RecordWindowQuery {
  date?: string | null;
  month?: string | null;
}

/**
 * The window a listing request covers. A day beats a month, as it did in
 * all three handlers; a day that cannot be read falls through to the month
 * beside it; a request that names neither gets today.
 */
export function resolveRecordWindow(
  query: RecordWindowQuery,
  now: Date = new Date()
): RecordWindow {
  if (parseDayString(query.date)) return cairoDayWindow(query.date, now);
  if (query.month) return cairoMonthWindow(query.month, now);
  return cairoDayWindow(null, now);
}
