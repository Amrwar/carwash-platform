/**
 * What we know about the car in front of us.
 *
 * The search handler typed a plate, pulled the recent washes that contain
 * it, and worked the customer card out inline: how many visits, how much
 * they have spent, which wash they usually ask for, whether they count as
 * a regular. All of it is arithmetic over a list, and none of it needed
 * the database, so it lives here where it can be read and checked.
 *
 * The one thing the handler got wrong is which plate the card describes.
 * A search matches two spellings of the same number - Latin and
 * Arabic-Indic - but the exact-match test compared the Latin spelling
 * only. A plate stored the Egyptian way therefore never counted as an
 * exact match, and the card could be built from a longer plate that
 * merely contained the digits typed.
 */

import { normalizePlate } from '@/lib/plates';

/** How many visits make a regular. */
export const VIP_VISIT_THRESHOLD = 5;

/** How many recent visits the card lists. */
export const RECENT_VISIT_COUNT = 5;

/** The shortest query worth searching on. */
export const MIN_PLATE_QUERY_LENGTH = 2;

/** The fields of a past wash the customer card is built from. */
export interface CustomerVisitFacts {
  plateNumber: string;
  carType: string | null;
  phoneNumber: string | null;
  washType: string;
  amountPaid: number;
  entryTime: Date | string;
}

/** The customer card the search endpoint answers with. */
export interface CustomerSummary<TVisit extends CustomerVisitFacts> {
  plateNumber: string;
  carType: string | null;
  phoneNumber: string | null;
  totalVisits: number;
  totalSpent: number;
  lastVisit: Date | string;
  favoriteWashType: string;
  isVIP: boolean;
  recentVisits: TVisit[];
}

/**
 * Whether a typed plate is worth a search. One character matches half the
 * yard, so the screen waits until there are two - counted after the digits
 * are normalised, so two Arabic-Indic digits count as two.
 */
export function isSearchablePlateQuery(query: string | null | undefined): boolean {
  return normalizePlate(query ?? '').length >= MIN_PLATE_QUERY_LENGTH;
}

/**
 * The visits of each plate, keyed by the plate as it is stored. Insertion
 * order follows the records, so the plate of the most recent visit comes
 * first when the caller passes them newest first.
 */
export function groupByPlate<TVisit extends CustomerVisitFacts>(
  records: readonly TVisit[]
): Record<string, TVisit[]> {
  const groups: Record<string, TVisit[]> = {};
  for (const record of records) {
    (groups[record.plateNumber] ??= []).push(record);
  }
  return groups;
}

/**
 * Which of the matched plates the card is about. A plate that is exactly
 * what was typed wins, in either spelling; otherwise it is the plate of
 * the most recent visit, since a partial search is a guess anyway.
 */
export function pickMatchingPlate(
  plates: readonly string[],
  query: string
): string | null {
  if (plates.length === 0) return null;
  const wanted = normalizePlate(query);
  return plates.find((plate) => normalizePlate(plate) === wanted) ?? plates[0];
}

/**
 * The wash this customer asks for most often. Ties go to the wash they
 * had most recently, which is the first of the records as they arrive.
 */
export function favoriteWashType(records: readonly CustomerVisitFacts[]): string | null {
  const counts: Record<string, number> = {};
  const order: string[] = [];
  for (const record of records) {
    if (!(record.washType in counts)) order.push(record.washType);
    counts[record.washType] = (counts[record.washType] ?? 0) + 1;
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const washType of order) {
    if (counts[washType] > bestCount) {
      best = washType;
      bestCount = counts[washType];
    }
  }
  return best;
}

/**
 * The customer card for a plate search, or null if nothing matched. The
 * records are expected newest first, as the query returns them, and the
 * totals cover the visits handed over rather than all of history.
 */
export function summarizeCustomerHistory<TVisit extends CustomerVisitFacts>(
  records: readonly TVisit[],
  query: string
): CustomerSummary<TVisit> | null {
  if (records.length === 0) return null;

  const groups = groupByPlate(records);
  const plateNumber = pickMatchingPlate(Object.keys(groups), query);
  if (!plateNumber) return null;

  const visits = groups[plateNumber];
  const lastVisit = visits[0];

  return {
    plateNumber,
    carType: lastVisit.carType,
    phoneNumber: lastVisit.phoneNumber,
    totalVisits: visits.length,
    totalSpent: visits.reduce((sum, visit) => sum + visit.amountPaid, 0),
    lastVisit: lastVisit.entryTime,
    favoriteWashType: favoriteWashType(visits) ?? lastVisit.washType,
    isVIP: visits.length >= VIP_VISIT_THRESHOLD,
    recentVisits: visits.slice(0, RECENT_VISIT_COUNT),
  };
}
