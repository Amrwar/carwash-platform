/**
 * The takings summary - how many cars, how much money, whose.
 *
 * Every screen and report that shows a total worked it out for itself: the
 * dashboard, the monthly report, the Excel export, and the worker-stats
 * endpoint three times over (once per worker, once for the unassigned
 * cars, once for the day as a whole). Six copies of the same arithmetic,
 * which is six chances for the till and the report to disagree about a
 * day's cash.
 *
 * The one rule here that is not obvious is net revenue. A tip paid by
 * InstaPay lands in the shop's account but belongs to the worker, so the
 * shop's own takings are the revenue less the InstaPay tips. Cash tips
 * never pass through the shop and so never enter the sum.
 */

/** The fields of a wash record the totals are worked out from. */
export interface WashRecordFacts {
  status: string;
  washType: string;
  paymentType: string | null;
  amountPaid: number;
  tipAmount: number;
  paymentReceived: boolean;
}

/** A wash record together with the worker who washed it, if anyone did. */
export type WashRecordWithWorkerFacts = WashRecordFacts & {
  worker: { name: string } | null;
};

export interface WashTotals {
  totalCars: number;
  finishedCars: number;
  inProgressCars: number;
  cancelledCars: number;
  /** Everything paid, by whatever means, tips excluded. */
  totalRevenue: number;
  totalTips: number;
  cashRevenue: number;
  instapayRevenue: number;
  cashTips: number;
  instapayTips: number;
  /** Revenue actually collected in cash so far. */
  cashReceived: number;
  /** Revenue actually collected by InstaPay so far. */
  instapayReceived: number;
  /** Revenue less the InstaPay tips that are owed on to the workers. */
  netRevenue: number;
}

/** The wash types, in the order the screens list them. */
export const WASH_TYPES = ['INNER', 'OUTER', 'FULL', 'FREE'] as const;

export type WashTypeName = (typeof WASH_TYPES)[number];

/**
 * One pass over a set of records for every total the screens show. An
 * empty set gives zeroes rather than nothing, so a quiet day still renders.
 */
export function summarizeWashRecords(records: readonly WashRecordFacts[]): WashTotals {
  const totals: WashTotals = {
    totalCars: records.length,
    finishedCars: 0,
    inProgressCars: 0,
    cancelledCars: 0,
    totalRevenue: 0,
    totalTips: 0,
    cashRevenue: 0,
    instapayRevenue: 0,
    cashTips: 0,
    instapayTips: 0,
    cashReceived: 0,
    instapayReceived: 0,
    netRevenue: 0,
  };

  for (const record of records) {
    if (record.status === 'FINISHED') totals.finishedCars++;
    else if (record.status === 'IN_PROGRESS') totals.inProgressCars++;
    else if (record.status === 'CANCELLED') totals.cancelledCars++;

    totals.totalRevenue += record.amountPaid;
    totals.totalTips += record.tipAmount;

    if (record.paymentType === 'CASH') {
      totals.cashRevenue += record.amountPaid;
      totals.cashTips += record.tipAmount;
      if (record.paymentReceived) totals.cashReceived += record.amountPaid;
    } else if (record.paymentType === 'INSTAPAY') {
      totals.instapayRevenue += record.amountPaid;
      totals.instapayTips += record.tipAmount;
      if (record.paymentReceived) totals.instapayReceived += record.amountPaid;
    }
  }

  totals.netRevenue = totals.totalRevenue - totals.instapayTips;
  return totals;
}

/**
 * How many cars of each wash type. Every wash type is present, at zero if
 * none were washed, because the breakdown is a fixed set of columns.
 */
export function countByWashType(
  records: readonly WashRecordFacts[]
): Record<WashTypeName, number> {
  const counts = { INNER: 0, OUTER: 0, FULL: 0, FREE: 0 };
  for (const record of records) {
    if (record.washType in counts) {
      counts[record.washType as WashTypeName]++;
    }
  }
  return counts;
}

/**
 * Cars and revenue per wash type, listing only the types that actually
 * turned up - these become rows in a report, and a row of zeroes is noise.
 */
export function groupByWashType(
  records: readonly WashRecordFacts[]
): Record<string, { count: number; revenue: number }> {
  const groups: Record<string, { count: number; revenue: number }> = {};
  for (const record of records) {
    const group = (groups[record.washType] ??= { count: 0, revenue: 0 });
    group.count++;
    group.revenue += record.amountPaid;
  }
  return groups;
}

/**
 * Cars, revenue and tips per worker, keyed by name, with cars nobody was
 * assigned to gathered under `unassignedLabel`.
 */
export function groupByWorker(
  records: readonly WashRecordWithWorkerFacts[],
  unassignedLabel = 'Unassigned'
): Record<string, { count: number; revenue: number; tips: number; instapayTips: number }> {
  const groups: Record<
    string,
    { count: number; revenue: number; tips: number; instapayTips: number }
  > = {};
  for (const record of records) {
    const name = record.worker?.name || unassignedLabel;
    const group = (groups[name] ??= { count: 0, revenue: 0, tips: 0, instapayTips: 0 });
    group.count++;
    group.revenue += record.amountPaid;
    group.tips += record.tipAmount;
    if (record.paymentType === 'INSTAPAY') {
      group.instapayTips += record.tipAmount;
    }
  }
  return groups;
}
