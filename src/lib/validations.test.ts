/**
 * The request schemas.
 *
 * These sit in front of every write the app makes. Two of the rules are
 * cross-field and are the ones worth pinning: a FREE wash that somehow
 * carries money, and a paid wash with no payment type, are both things the
 * till cannot reconcile at the end of the day.
 */

import { describe, expect, it } from 'vitest';

import {
  CreateWashRecordSchema,
  CreateWorkerSchema,
  FinishWashRecordSchema,
  PaymentTypeSchema,
  StatusSchema,
  UpdateWashRecordSchema,
  UpdateWorkerSchema,
  WashTypeSchema,
} from './validations';

const paidWash = {
  plateNumber: 'abc 123',
  washType: 'FULL' as const,
  paymentType: 'CASH' as const,
  amountPaid: 150,
};

describe('the enums', () => {
  it('accepts every wash type the app offers', () => {
    for (const type of ['INNER', 'OUTER', 'FREE', 'FULL']) {
      expect(WashTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it('refuses a wash type it does not offer', () => {
    expect(WashTypeSchema.safeParse('WAX').success).toBe(false);
  });

  it('is case-sensitive, matching the database', () => {
    expect(WashTypeSchema.safeParse('full').success).toBe(false);
  });

  it('accepts both ways of paying', () => {
    expect(PaymentTypeSchema.safeParse('CASH').success).toBe(true);
    expect(PaymentTypeSchema.safeParse('INSTAPAY').success).toBe(true);
  });

  it('refuses a third way of paying', () => {
    expect(PaymentTypeSchema.safeParse('CARD').success).toBe(false);
  });

  it('knows the two states a record can be in', () => {
    expect(StatusSchema.safeParse('IN_PROGRESS').success).toBe(true);
    expect(StatusSchema.safeParse('FINISHED').success).toBe(true);
    expect(StatusSchema.safeParse('CANCELLED').success).toBe(false);
  });
});

describe('CreateWashRecordSchema', () => {
  it('accepts a complete paid wash', () => {
    expect(CreateWashRecordSchema.safeParse(paidWash).success).toBe(true);
  });

  it('stores the plate upper-cased and trimmed', () => {
    const parsed = CreateWashRecordSchema.parse({
      ...paidWash,
      plateNumber: '  abc 123  ',
    });
    expect(parsed.plateNumber).toBe('ABC 123');
  });

  it('insists on a plate', () => {
    expect(
      CreateWashRecordSchema.safeParse({ ...paidWash, plateNumber: '' }).success,
    ).toBe(false);
  });

  it('insists on a wash type', () => {
    const { washType, ...rest } = paidWash;
    void washType;
    expect(CreateWashRecordSchema.safeParse(rest).success).toBe(false);
  });

  it('defaults the amount to nothing', () => {
    const parsed = CreateWashRecordSchema.parse({
      plateNumber: 'ABC 1',
      washType: 'FREE',
    });
    expect(parsed.amountPaid).toBe(0);
    expect(parsed.tipAmount).toBe(0);
  });

  it('turns a blank car type into null rather than an empty string', () => {
    const parsed = CreateWashRecordSchema.parse({ ...paidWash, carType: '   ' });
    expect(parsed.carType).toBeNull();
  });

  it('trims a car type it keeps', () => {
    const parsed = CreateWashRecordSchema.parse({
      ...paidWash,
      carType: '  Corolla ',
    });
    expect(parsed.carType).toBe('Corolla');
  });

  it('refuses a negative amount', () => {
    expect(
      CreateWashRecordSchema.safeParse({ ...paidWash, amountPaid: -1 }).success,
    ).toBe(false);
  });

  it('refuses a negative tip', () => {
    expect(
      CreateWashRecordSchema.safeParse({ ...paidWash, tipAmount: -1 }).success,
    ).toBe(false);
  });

  it('accepts a tip of nothing, which is the usual case', () => {
    expect(
      CreateWashRecordSchema.safeParse({ ...paidWash, tipAmount: 0 }).success,
    ).toBe(true);
  });

  it('refuses a worker id that is not a uuid', () => {
    expect(
      CreateWashRecordSchema.safeParse({ ...paidWash, workerId: 'bob' }).success,
    ).toBe(false);
  });

  it('accepts no worker at all', () => {
    expect(
      CreateWashRecordSchema.safeParse({ ...paidWash, workerId: null }).success,
    ).toBe(true);
  });

  describe('a FREE wash', () => {
    it('is accepted when nothing was paid', () => {
      expect(
        CreateWashRecordSchema.safeParse({
          plateNumber: 'ABC 1',
          washType: 'FREE',
          amountPaid: 0,
        }).success,
      ).toBe(true);
    });

    it('is refused when money changed hands', () => {
      expect(
        CreateWashRecordSchema.safeParse({
          plateNumber: 'ABC 1',
          washType: 'FREE',
          amountPaid: 50,
        }).success,
      ).toBe(false);
    });

    it('blames the amount, which is the field to fix', () => {
      const result = CreateWashRecordSchema.safeParse({
        plateNumber: 'ABC 1',
        washType: 'FREE',
        amountPaid: 50,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['amountPaid']);
      }
    });

    it('needs no payment type, nothing having been paid', () => {
      expect(
        CreateWashRecordSchema.safeParse({
          plateNumber: 'ABC 1',
          washType: 'FREE',
        }).success,
      ).toBe(true);
    });
  });

  describe('a paid wash', () => {
    it('needs a payment type', () => {
      const { paymentType, ...rest } = paidWash;
      void paymentType;
      expect(CreateWashRecordSchema.safeParse(rest).success).toBe(false);
    });

    it('refuses an explicit null payment type', () => {
      expect(
        CreateWashRecordSchema.safeParse({ ...paidWash, paymentType: null })
          .success,
      ).toBe(false);
    });

    it('blames the payment type', () => {
      const result = CreateWashRecordSchema.safeParse({
        ...paidWash,
        paymentType: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['paymentType']);
      }
    });

    it('needs no payment type when the amount is zero', () => {
      expect(
        CreateWashRecordSchema.safeParse({
          plateNumber: 'ABC 1',
          washType: 'FULL',
          amountPaid: 0,
        }).success,
      ).toBe(true);
    });

    it('takes either way of paying', () => {
      for (const paymentType of ['CASH', 'INSTAPAY'] as const) {
        expect(
          CreateWashRecordSchema.safeParse({ ...paidWash, paymentType }).success,
        ).toBe(true);
      }
    });
  });
});

describe('UpdateWashRecordSchema', () => {
  it('accepts an empty patch, which changes nothing', () => {
    expect(UpdateWashRecordSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a single field', () => {
    expect(UpdateWashRecordSchema.safeParse({ tipAmount: 20 }).success).toBe(
      true,
    );
  });

  it('upper-cases a plate it is given', () => {
    const parsed = UpdateWashRecordSchema.parse({ plateNumber: ' abc 1 ' });
    expect(parsed.plateNumber).toBe('ABC 1');
  });

  it('refuses a blank plate rather than storing one', () => {
    expect(UpdateWashRecordSchema.safeParse({ plateNumber: '' }).success).toBe(
      false,
    );
  });

  it('refuses a negative amount here too', () => {
    expect(UpdateWashRecordSchema.safeParse({ amountPaid: -5 }).success).toBe(
      false,
    );
  });

  it('takes an ISO stamp for the entry time', () => {
    expect(
      UpdateWashRecordSchema.safeParse({ entryTime: '2026-01-15T10:00:00Z' })
        .success,
    ).toBe(true);
  });

  it('refuses an entry time that is not a stamp', () => {
    expect(
      UpdateWashRecordSchema.safeParse({ entryTime: '2026-01-15' }).success,
    ).toBe(false);
  });

  it('lets the finish time be cleared', () => {
    expect(
      UpdateWashRecordSchema.safeParse({ finishTime: null }).success,
    ).toBe(true);
  });

  it('does not carry the cross-field rules, a patch being partial', () => {
    // washType alone cannot be checked against an amount that is not here
    expect(UpdateWashRecordSchema.safeParse({ washType: 'FREE' }).success).toBe(
      true,
    );
  });
});

describe('FinishWashRecordSchema', () => {
  it('accepts a bare finish', () => {
    expect(FinishWashRecordSchema.safeParse({}).success).toBe(true);
  });

  it('accepts payment settled at the end', () => {
    expect(
      FinishWashRecordSchema.safeParse({ paymentType: 'CASH', amountPaid: 100 })
        .success,
    ).toBe(true);
  });

  it('refuses a negative amount', () => {
    expect(FinishWashRecordSchema.safeParse({ amountPaid: -1 }).success).toBe(
      false,
    );
  });

  it('refuses a payment type it does not know', () => {
    expect(
      FinishWashRecordSchema.safeParse({ paymentType: 'CHEQUE' }).success,
    ).toBe(false);
  });
});

describe('the worker schemas', () => {
  it('insists on a name', () => {
    expect(CreateWorkerSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('trims the name it stores', () => {
    expect(CreateWorkerSchema.parse({ name: '  Sayed ' }).name).toBe('Sayed');
  });

  it('refuses a missing name', () => {
    expect(CreateWorkerSchema.safeParse({}).success).toBe(false);
  });

  it('lets a worker be renamed', () => {
    expect(UpdateWorkerSchema.safeParse({ name: 'Sayed' }).success).toBe(true);
  });

  it('lets a worker be stood down without renaming them', () => {
    expect(UpdateWorkerSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('refuses a non-boolean for the active flag', () => {
    expect(UpdateWorkerSchema.safeParse({ isActive: 'no' }).success).toBe(false);
  });

  it('accepts an empty patch', () => {
    expect(UpdateWorkerSchema.safeParse({}).success).toBe(true);
  });
});
