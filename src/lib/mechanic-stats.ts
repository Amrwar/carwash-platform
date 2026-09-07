/**
 * The mechanic's day, added up.
 *
 * The wash side of the shop already shares one summary; the mechanic side
 * worked its own out in the page, filtering the day's jobs three times to
 * count oil changes, other work and what has actually been paid for, and
 * subtracting one card's figure from another's in the markup to get the
 * fourth. That is arithmetic over money sitting in a component, so it is
 * here instead, next to the wash summary it mirrors.
 */

/** The fields of a mechanic job the totals are worked out from. */
export interface MechanicRecordFacts {
  category: string;
  totalAmount: number;
  paymentReceived: boolean;
}

export interface MechanicTotals {
  /** Jobs taken in, of either kind. */
  total: number;
  /** Everything billed, paid or not. */
  totalRevenue: number;
  oilServices: number;
  oilRevenue: number;
  otherServices: number;
  otherRevenue: number;
  /** Billed and collected. */
  received: number;
  /** Billed and still owed. */
  outstanding: number;
}

/**
 * One pass over a day's jobs for every figure the mechanic screen shows.
 * An empty day gives zeroes rather than nothing, so a quiet day renders.
 *
 * A job of neither category still counts towards the day's total and its
 * revenue - it is money taken - but it belongs to neither breakdown, so
 * the two counts do not have to add up to `total`.
 */
export function summarizeMechanicRecords(
  records: readonly MechanicRecordFacts[]
): MechanicTotals {
  const totals: MechanicTotals = {
    total: records.length,
    totalRevenue: 0,
    oilServices: 0,
    oilRevenue: 0,
    otherServices: 0,
    otherRevenue: 0,
    received: 0,
    outstanding: 0,
  };

  for (const record of records) {
    totals.totalRevenue += record.totalAmount;

    if (record.category === 'OIL_SERVICE') {
      totals.oilServices++;
      totals.oilRevenue += record.totalAmount;
    } else if (record.category === 'OTHER_SERVICE') {
      totals.otherServices++;
      totals.otherRevenue += record.totalAmount;
    }

    if (record.paymentReceived) totals.received += record.totalAmount;
  }

  totals.outstanding = totals.totalRevenue - totals.received;
  return totals;
}
