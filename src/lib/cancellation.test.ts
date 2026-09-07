/**
 * What a cancelled wash is written down as.
 *
 * A cancellation is the end of a job, so whatever it records is final -
 * there is no later step that would correct the amount or mark the money
 * received. The cases that matter are the ones where money changed hands
 * before the car left, and the ones where an unchecked body would have
 * put something impossible in the till.
 */

import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { buildCancellationUpdate } from './cancellation';

const FINISHED_AT = new Date('2026-01-15T10:30:00.000Z');

describe('buildCancellationUpdate, nothing taken', () => {
  it('records a cancellation with no money against it', () => {
    expect(buildCancellationUpdate({}, FINISHED_AT)).toEqual({
      status: 'CANCELLED',
      finishTime: FINISHED_AT,
      amountPaid: 0,
      paymentType: null,
      paymentReceived: false,
      notes: null,
    });
  });

  it('treats an explicit zero the same as nothing at all', () => {
    expect(buildCancellationUpdate({ amountPaid: 0 }, FINISHED_AT).paymentReceived).toBe(
      false
    );
  });

  it('clears the payment method rather than leaving the old one', () => {
    const update = buildCancellationUpdate(
      { amountPaid: 0, paymentType: 'CASH' },
      FINISHED_AT
    );
    expect(update.paymentType).toBeNull();
  });

  it('accepts a body with nothing in it at all', () => {
    expect(buildCancellationUpdate(null, FINISHED_AT).amountPaid).toBe(0);
    expect(buildCancellationUpdate(undefined, FINISHED_AT).amountPaid).toBe(0);
  });
});

describe('buildCancellationUpdate, money taken', () => {
  it('records the amount and the method', () => {
    const update = buildCancellationUpdate(
      { amountPaid: 50, paymentType: 'INSTAPAY' },
      FINISHED_AT
    );
    expect(update.amountPaid).toBe(50);
    expect(update.paymentType).toBe('INSTAPAY');
  });

  it('counts money taken as money held', () => {
    expect(
      buildCancellationUpdate({ amountPaid: 50, paymentType: 'CASH' }, FINISHED_AT)
        .paymentReceived
    ).toBe(true);
  });

  it('refuses money taken with no method named', () => {
    expect(() => buildCancellationUpdate({ amountPaid: 50 }, FINISHED_AT)).toThrow(ZodError);
    expect(() =>
      buildCancellationUpdate({ amountPaid: 50, paymentType: null }, FINISHED_AT)
    ).toThrow(ZodError);
  });

  it('records a fractional amount as it was taken', () => {
    expect(
      buildCancellationUpdate({ amountPaid: 12.5, paymentType: 'CASH' }, FINISHED_AT)
        .amountPaid
    ).toBe(12.5);
  });
});

describe('buildCancellationUpdate, the notes', () => {
  it('keeps a reason for the cancellation', () => {
    expect(
      buildCancellationUpdate({ notes: 'Customer left' }, FINISHED_AT).notes
    ).toBe('Customer left');
  });

  it('trims the reason', () => {
    expect(
      buildCancellationUpdate({ notes: '  Customer left  ' }, FINISHED_AT).notes
    ).toBe('Customer left');
  });

  it('reads a blank reason as no reason', () => {
    expect(buildCancellationUpdate({ notes: '' }, FINISHED_AT).notes).toBeNull();
    expect(buildCancellationUpdate({ notes: '   ' }, FINISHED_AT).notes).toBeNull();
    expect(buildCancellationUpdate({ notes: null }, FINISHED_AT).notes).toBeNull();
  });
});

describe('buildCancellationUpdate, bodies it will not act on', () => {
  it('refuses money the shop would owe back', () => {
    expect(() =>
      buildCancellationUpdate({ amountPaid: -50, paymentType: 'CASH' }, FINISHED_AT)
    ).toThrow(ZodError);
  });

  it('refuses an amount that is not a number', () => {
    expect(() =>
      buildCancellationUpdate({ amountPaid: '50', paymentType: 'CASH' }, FINISHED_AT)
    ).toThrow(ZodError);
    expect(() =>
      buildCancellationUpdate({ amountPaid: NaN, paymentType: 'CASH' }, FINISHED_AT)
    ).toThrow(ZodError);
  });

  it('refuses a payment method the shop does not take', () => {
    expect(() =>
      buildCancellationUpdate({ amountPaid: 50, paymentType: 'CHEQUE' }, FINISHED_AT)
    ).toThrow(ZodError);
  });

  it('says which field it objected to', () => {
    try {
      buildCancellationUpdate({ amountPaid: 50 }, FINISHED_AT);
      expect.unreachable('money with no method should be refused');
    } catch (error) {
      expect((error as ZodError).errors[0].path).toEqual(['paymentType']);
    }
  });
});

describe('buildCancellationUpdate, the finish time', () => {
  it('stamps the moment it was cancelled', () => {
    expect(buildCancellationUpdate({}, FINISHED_AT).finishTime).toBe(FINISHED_AT);
  });

  it('stamps now when no moment is given', () => {
    const before = Date.now();
    const update = buildCancellationUpdate({});
    expect(update.finishTime.getTime()).toBeGreaterThanOrEqual(before);
    expect(update.finishTime.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('always marks the record cancelled', () => {
    expect(buildCancellationUpdate({}, FINISHED_AT).status).toBe('CANCELLED');
  });
});
