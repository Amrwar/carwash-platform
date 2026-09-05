/**
 * The takings summary.
 *
 * These numbers are what the owner counts the cash drawer against at the
 * end of the day, so the cases that matter are the ones where money could
 * quietly land in the wrong column: a tip paid by InstaPay, which the shop
 * holds but does not keep; a car still in the bay that has not been paid
 * for; a cancelled car; a free wash. Net revenue is the number the shop
 * actually keeps, and it is the one worth being strict about.
 */

import { describe, expect, it } from 'vitest';

import {
  countByWashType,
  groupByWashType,
  groupByWorker,
  summarizeWashRecords,
  WASH_TYPES,
  type WashRecordWithWorkerFacts,
} from './wash-stats';

type RecordOverrides = Partial<WashRecordWithWorkerFacts>;

/** A finished, paid-for full wash, which each case then varies. */
function record(overrides: RecordOverrides = {}): WashRecordWithWorkerFacts {
  return {
    status: 'FINISHED',
    washType: 'FULL',
    paymentType: 'CASH',
    amountPaid: 100,
    tipAmount: 0,
    paymentReceived: true,
    worker: { name: 'Sayed' },
    ...overrides,
  };
}

describe('summarizeWashRecords', () => {
  it('gives zeroes for a day with no cars', () => {
    const totals = summarizeWashRecords([]);
    expect(totals).toEqual({
      totalCars: 0,
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
    });
  });

  it('counts every car it is given', () => {
    expect(summarizeWashRecords([record(), record(), record()]).totalCars).toBe(3);
  });

  it('splits the cars by status', () => {
    const totals = summarizeWashRecords([
      record({ status: 'FINISHED' }),
      record({ status: 'FINISHED' }),
      record({ status: 'IN_PROGRESS' }),
      record({ status: 'CANCELLED' }),
    ]);
    expect(totals.finishedCars).toBe(2);
    expect(totals.inProgressCars).toBe(1);
    expect(totals.cancelledCars).toBe(1);
  });

  it('counts a status it does not recognise in the total but in no bucket', () => {
    const totals = summarizeWashRecords([record({ status: 'ON_HOLD' })]);
    expect(totals.totalCars).toBe(1);
    expect(totals.finishedCars + totals.inProgressCars + totals.cancelledCars).toBe(0);
  });

  it('adds up revenue regardless of status, because a cancelled car may still have been paid for', () => {
    const totals = summarizeWashRecords([
      record({ status: 'CANCELLED', amountPaid: 40 }),
      record({ status: 'IN_PROGRESS', amountPaid: 60 }),
    ]);
    expect(totals.totalRevenue).toBe(100);
  });

  it('keeps tips out of revenue', () => {
    const totals = summarizeWashRecords([record({ amountPaid: 100, tipAmount: 20 })]);
    expect(totals.totalRevenue).toBe(100);
    expect(totals.totalTips).toBe(20);
  });

  it('splits revenue between cash and InstaPay', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'CASH', amountPaid: 70 }),
      record({ paymentType: 'INSTAPAY', amountPaid: 30 }),
    ]);
    expect(totals.cashRevenue).toBe(70);
    expect(totals.instapayRevenue).toBe(30);
    expect(totals.cashRevenue + totals.instapayRevenue).toBe(totals.totalRevenue);
  });

  it('splits tips between cash and InstaPay', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'CASH', tipAmount: 15 }),
      record({ paymentType: 'INSTAPAY', tipAmount: 25 }),
    ]);
    expect(totals.cashTips).toBe(15);
    expect(totals.instapayTips).toBe(25);
  });

  it('leaves an unpaid car out of both payment columns but in the total', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: null, amountPaid: 0, status: 'IN_PROGRESS' }),
      record({ paymentType: 'CASH', amountPaid: 50 }),
    ]);
    expect(totals.totalCars).toBe(2);
    expect(totals.cashRevenue).toBe(50);
    expect(totals.instapayRevenue).toBe(0);
  });

  it('does not lose a payment recorded against a car with no payment type', () => {
    // Nothing should credit an untyped payment to cash by default.
    const totals = summarizeWashRecords([record({ paymentType: null, amountPaid: 80 })]);
    expect(totals.totalRevenue).toBe(80);
    expect(totals.cashRevenue).toBe(0);
    expect(totals.instapayRevenue).toBe(0);
  });

  it('takes the InstaPay tips back out of net revenue', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'INSTAPAY', amountPaid: 100, tipAmount: 20 }),
    ]);
    expect(totals.totalRevenue).toBe(100);
    expect(totals.netRevenue).toBe(80);
  });

  it('leaves net revenue alone for a cash tip, which never reaches the shop', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'CASH', amountPaid: 100, tipAmount: 20 }),
    ]);
    expect(totals.netRevenue).toBe(100);
  });

  it('nets out only the InstaPay share when the day mixes both', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'CASH', amountPaid: 100, tipAmount: 10 }),
      record({ paymentType: 'INSTAPAY', amountPaid: 100, tipAmount: 30 }),
    ]);
    expect(totals.totalRevenue).toBe(200);
    expect(totals.totalTips).toBe(40);
    expect(totals.netRevenue).toBe(170);
  });

  it('equals total revenue when nobody tipped', () => {
    const totals = summarizeWashRecords([record({ tipAmount: 0 }), record({ tipAmount: 0 })]);
    expect(totals.netRevenue).toBe(totals.totalRevenue);
  });

  it('counts as received only what has actually been collected', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'CASH', amountPaid: 50, paymentReceived: true }),
      record({ paymentType: 'CASH', amountPaid: 70, paymentReceived: false }),
      record({ paymentType: 'INSTAPAY', amountPaid: 90, paymentReceived: true }),
      record({ paymentType: 'INSTAPAY', amountPaid: 30, paymentReceived: false }),
    ]);
    expect(totals.cashRevenue).toBe(120);
    expect(totals.cashReceived).toBe(50);
    expect(totals.instapayRevenue).toBe(120);
    expect(totals.instapayReceived).toBe(90);
  });

  it('reports nothing received when the whole day is still owed', () => {
    const totals = summarizeWashRecords([
      record({ paymentType: 'CASH', amountPaid: 50, paymentReceived: false }),
      record({ paymentType: 'INSTAPAY', amountPaid: 50, paymentReceived: false }),
    ]);
    expect(totals.totalRevenue).toBe(100);
    expect(totals.cashReceived).toBe(0);
    expect(totals.instapayReceived).toBe(0);
  });

  it('handles a free wash without disturbing the money', () => {
    const totals = summarizeWashRecords([
      record({ washType: 'FREE', paymentType: null, amountPaid: 0, paymentReceived: false }),
      record({ amountPaid: 60 }),
    ]);
    expect(totals.totalCars).toBe(2);
    expect(totals.totalRevenue).toBe(60);
  });

  it('leaves the records it was handed untouched', () => {
    const records = [record({ amountPaid: 40 }), record({ amountPaid: 60 })];
    const before = JSON.stringify(records);
    summarizeWashRecords(records);
    expect(JSON.stringify(records)).toBe(before);
  });

  it('gives the same answer whatever order the day arrived in', () => {
    const records = [
      record({ paymentType: 'INSTAPAY', amountPaid: 30, tipAmount: 5 }),
      record({ paymentType: 'CASH', amountPaid: 70, tipAmount: 10, paymentReceived: false }),
      record({ status: 'CANCELLED', paymentType: null, amountPaid: 0 }),
    ];
    const forwards = summarizeWashRecords(records);
    const backwards = summarizeWashRecords([...records].reverse());
    expect(backwards).toEqual(forwards);
  });
});

describe('countByWashType', () => {
  it('reports every wash type even on an empty day', () => {
    expect(countByWashType([])).toEqual({ INNER: 0, OUTER: 0, FULL: 0, FREE: 0 });
  });

  it('names the same four wash types the screens list', () => {
    expect(Object.keys(countByWashType([]))).toEqual([...WASH_TYPES]);
  });

  it('counts the cars of each type', () => {
    const counts = countByWashType([
      record({ washType: 'INNER' }),
      record({ washType: 'INNER' }),
      record({ washType: 'OUTER' }),
      record({ washType: 'FREE' }),
    ]);
    expect(counts).toEqual({ INNER: 2, OUTER: 1, FULL: 0, FREE: 1 });
  });

  it('ignores a wash type it does not know rather than inventing a column', () => {
    const counts = countByWashType([record({ washType: 'WAXING' }), record({ washType: 'FULL' })]);
    expect(counts).toEqual({ INNER: 0, OUTER: 0, FULL: 1, FREE: 0 });
  });

  it('accounts for every car it recognises', () => {
    const records = [
      record({ washType: 'INNER' }),
      record({ washType: 'OUTER' }),
      record({ washType: 'FULL' }),
      record({ washType: 'FREE' }),
      record({ washType: 'FULL' }),
    ];
    const counts = countByWashType(records);
    const counted = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(counted).toBe(records.length);
  });
});

describe('groupByWashType', () => {
  it('lists nothing for an empty day, rather than four empty rows', () => {
    expect(groupByWashType([])).toEqual({});
  });

  it('lists only the types that turned up', () => {
    const groups = groupByWashType([record({ washType: 'INNER' })]);
    expect(Object.keys(groups)).toEqual(['INNER']);
  });

  it('counts the cars and adds up the revenue per type', () => {
    const groups = groupByWashType([
      record({ washType: 'INNER', amountPaid: 40 }),
      record({ washType: 'INNER', amountPaid: 60 }),
      record({ washType: 'FULL', amountPaid: 150 }),
    ]);
    expect(groups).toEqual({
      INNER: { count: 2, revenue: 100 },
      FULL: { count: 1, revenue: 150 },
    });
  });

  it('keeps a free wash as a row worth nothing', () => {
    const groups = groupByWashType([record({ washType: 'FREE', amountPaid: 0 })]);
    expect(groups.FREE).toEqual({ count: 1, revenue: 0 });
  });

  it("splits the day's revenue without losing any of it", () => {
    const records = [
      record({ washType: 'INNER', amountPaid: 40 }),
      record({ washType: 'OUTER', amountPaid: 55 }),
      record({ washType: 'FULL', amountPaid: 120 }),
    ];
    const grouped = Object.values(groupByWashType(records)).reduce((sum, g) => sum + g.revenue, 0);
    expect(grouped).toBe(summarizeWashRecords(records).totalRevenue);
  });
});

describe('groupByWorker', () => {
  it('lists nobody for an empty day', () => {
    expect(groupByWorker([])).toEqual({});
  });

  it("keys the breakdown by the worker's name", () => {
    const groups = groupByWorker([record({ worker: { name: 'Mahmoud' } })]);
    expect(Object.keys(groups)).toEqual(['Mahmoud']);
  });

  it("adds up a worker's cars, revenue and tips", () => {
    const groups = groupByWorker([
      record({ worker: { name: 'Sayed' }, amountPaid: 100, tipAmount: 10 }),
      record({ worker: { name: 'Sayed' }, amountPaid: 50, tipAmount: 5 }),
    ]);
    expect(groups.Sayed).toEqual({ count: 2, revenue: 150, tips: 15, instapayTips: 0 });
  });

  it('keeps two workers apart', () => {
    const groups = groupByWorker([
      record({ worker: { name: 'Sayed' }, amountPaid: 100 }),
      record({ worker: { name: 'Mahmoud' }, amountPaid: 40 }),
    ]);
    expect(groups.Sayed.revenue).toBe(100);
    expect(groups.Mahmoud.revenue).toBe(40);
  });

  it('gathers the cars nobody was assigned to', () => {
    const groups = groupByWorker([record({ worker: null, amountPaid: 30 })]);
    expect(groups.Unassigned).toEqual({ count: 1, revenue: 30, tips: 0, instapayTips: 0 });
  });

  it('treats a blank worker name as unassigned rather than as a worker called nothing', () => {
    const groups = groupByWorker([record({ worker: { name: '' }, amountPaid: 30 })]);
    expect(Object.keys(groups)).toEqual(['Unassigned']);
  });

  it('takes the label for unassigned cars from the caller', () => {
    const groups = groupByWorker([record({ worker: null })], 'غير محدد');
    expect(Object.keys(groups)).toEqual(['غير محدد']);
  });

  it("counts only the InstaPay share of a worker's tips separately", () => {
    const groups = groupByWorker([
      record({ worker: { name: 'Sayed' }, paymentType: 'CASH', tipAmount: 10 }),
      record({ worker: { name: 'Sayed' }, paymentType: 'INSTAPAY', tipAmount: 25 }),
    ]);
    expect(groups.Sayed.tips).toBe(35);
    expect(groups.Sayed.instapayTips).toBe(25);
  });

  it('accounts for every car and every pound the day took', () => {
    const records = [
      record({ worker: { name: 'Sayed' }, amountPaid: 100 }),
      record({ worker: { name: 'Mahmoud' }, amountPaid: 40 }),
      record({ worker: null, amountPaid: 30 }),
    ];
    const groups = Object.values(groupByWorker(records));
    const totals = summarizeWashRecords(records);
    expect(groups.reduce((sum, g) => sum + g.count, 0)).toBe(totals.totalCars);
    expect(groups.reduce((sum, g) => sum + g.revenue, 0)).toBe(totals.totalRevenue);
  });
});
