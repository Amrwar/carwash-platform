/**
 * The mechanic's day, added up.
 *
 * These four figures are the mechanic screen's stat cards, so what has to
 * hold is that they agree with each other: the two category revenues make
 * the day's revenue, and what is received plus what is outstanding makes
 * it too. The cases that could break that are a quiet day, a job of
 * neither category, and jobs booked but not yet paid for.
 */

import { describe, expect, it } from 'vitest';

import { MechanicRecordFacts, summarizeMechanicRecords } from './mechanic-stats';

function oilJob(overrides: Partial<MechanicRecordFacts> = {}): MechanicRecordFacts {
  return {
    category: 'OIL_SERVICE',
    totalAmount: 2500,
    paymentReceived: true,
    ...overrides,
  };
}

function otherJob(overrides: Partial<MechanicRecordFacts> = {}): MechanicRecordFacts {
  return {
    category: 'OTHER_SERVICE',
    totalAmount: 900,
    paymentReceived: true,
    ...overrides,
  };
}

describe('summarizeMechanicRecords', () => {
  it('gives zeroes for a day with no jobs at all', () => {
    expect(summarizeMechanicRecords([])).toEqual({
      total: 0,
      totalRevenue: 0,
      oilServices: 0,
      oilRevenue: 0,
      otherServices: 0,
      otherRevenue: 0,
      received: 0,
      outstanding: 0,
    });
  });

  it('counts the jobs of each kind', () => {
    const totals = summarizeMechanicRecords([oilJob(), oilJob(), otherJob()]);
    expect(totals.total).toBe(3);
    expect(totals.oilServices).toBe(2);
    expect(totals.otherServices).toBe(1);
  });

  it('splits the revenue by kind', () => {
    const totals = summarizeMechanicRecords([
      oilJob({ totalAmount: 2500 }),
      oilJob({ totalAmount: 3000 }),
      otherJob({ totalAmount: 900 }),
    ]);
    expect(totals.oilRevenue).toBe(5500);
    expect(totals.otherRevenue).toBe(900);
    expect(totals.totalRevenue).toBe(6400);
  });

  it('counts only what has been paid for as received', () => {
    const totals = summarizeMechanicRecords([
      oilJob({ totalAmount: 2500, paymentReceived: true }),
      otherJob({ totalAmount: 900, paymentReceived: false }),
    ]);
    expect(totals.received).toBe(2500);
    expect(totals.outstanding).toBe(900);
  });

  it('owes nothing on a day where everyone paid', () => {
    const totals = summarizeMechanicRecords([oilJob(), otherJob()]);
    expect(totals.outstanding).toBe(0);
    expect(totals.received).toBe(totals.totalRevenue);
  });

  it('has taken nothing on a day where nobody paid yet', () => {
    const totals = summarizeMechanicRecords([
      oilJob({ paymentReceived: false }),
      otherJob({ paymentReceived: false }),
    ]);
    expect(totals.received).toBe(0);
    expect(totals.outstanding).toBe(totals.totalRevenue);
  });

  it('always splits the revenue into received and outstanding', () => {
    const totals = summarizeMechanicRecords([
      oilJob({ totalAmount: 2500, paymentReceived: true }),
      oilJob({ totalAmount: 3000, paymentReceived: false }),
      otherJob({ totalAmount: 900, paymentReceived: false }),
      otherJob({ totalAmount: 150, paymentReceived: true }),
    ]);
    expect(totals.received + totals.outstanding).toBe(totals.totalRevenue);
  });

  it('counts a free job as a job worth nothing', () => {
    const totals = summarizeMechanicRecords([otherJob({ totalAmount: 0 })]);
    expect(totals.total).toBe(1);
    expect(totals.otherServices).toBe(1);
    expect(totals.totalRevenue).toBe(0);
  });

  it('counts a job of neither kind towards the day but neither breakdown', () => {
    const totals = summarizeMechanicRecords([
      oilJob({ totalAmount: 2500 }),
      { category: 'TYRE_SERVICE', totalAmount: 400, paymentReceived: true },
    ]);
    expect(totals.total).toBe(2);
    expect(totals.totalRevenue).toBe(2900);
    expect(totals.oilServices).toBe(1);
    expect(totals.otherServices).toBe(0);
    expect(totals.oilRevenue + totals.otherRevenue).toBe(2500);
    expect(totals.received).toBe(2900);
  });

  it('does not read a category written some other way as one it knows', () => {
    const totals = summarizeMechanicRecords([
      { category: 'oil_service', totalAmount: 2500, paymentReceived: false },
    ]);
    expect(totals.oilServices).toBe(0);
    expect(totals.totalRevenue).toBe(2500);
  });

  it('leaves the records it was given alone', () => {
    const records = [oilJob(), otherJob()];
    const copy = records.map((record) => ({ ...record }));
    summarizeMechanicRecords(records);
    expect(records).toEqual(copy);
  });
});
