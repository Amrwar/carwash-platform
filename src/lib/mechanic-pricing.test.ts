/**
 * The oil-service price sheet.
 *
 * This is money the customer is quoted on screen and then billed, so the
 * cases worth pinning are the ones where the two could part company: an
 * oil the customer brought themselves, a filter price left in the box
 * after the job was switched to oil-only, and the bounds the filter price
 * has to sit inside. The filter box hands over a string, and an API caller
 * can hand over anything at all, so the sums are checked against both.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FILTER_PRICE,
  FILTER_PRICE_MAX,
  FILTER_PRICE_MIN,
  LABOR_COSTS,
  OIL_PRICES,
  OIL_SERVICE_TYPES,
  OIL_TYPES,
  chargedFilterPrice,
  isFilterPriceValid,
  isOilServiceType,
  isOilType,
  oilServiceCharge,
  toAmount,
} from './mechanic-pricing';

describe('the price sheet', () => {
  it('prices every oil it lists', () => {
    for (const oil of OIL_TYPES) {
      expect(OIL_PRICES[oil]).toBeTypeOf('number');
      expect(OIL_PRICES[oil]).toBeGreaterThanOrEqual(0);
    }
  });

  it('prices every job it lists', () => {
    for (const job of OIL_SERVICE_TYPES) {
      expect(LABOR_COSTS[job]).toBeGreaterThan(0);
    }
  });

  it('charges nothing for oil the customer brought', () => {
    expect(OIL_PRICES.CUSTOMER_OWN).toBe(0);
  });

  it('charges more labour for changing the filter as well', () => {
    expect(LABOR_COSTS.OIL_AND_FILTER).toBeGreaterThan(LABOR_COSTS.OIL_ONLY);
  });

  it('starts the filter box at a price it will accept', () => {
    expect(isFilterPriceValid(DEFAULT_FILTER_PRICE)).toBe(true);
  });

  it('leaves room between the filter bounds', () => {
    expect(FILTER_PRICE_MIN).toBeLessThan(FILTER_PRICE_MAX);
  });
});

describe('isOilType', () => {
  it('accepts each oil on the sheet', () => {
    for (const oil of OIL_TYPES) expect(isOilType(oil)).toBe(true);
  });

  it('rejects an oil we do not stock', () => {
    expect(isOilType('MOBIL_5L')).toBe(false);
  });

  it('rejects a different case of the same name', () => {
    expect(isOilType('shell_4l')).toBe(false);
  });

  it('rejects things that are not strings', () => {
    expect(isOilType(undefined)).toBe(false);
    expect(isOilType(null)).toBe(false);
    expect(isOilType(4)).toBe(false);
    expect(isOilType({ oilType: 'SHELL_4L' })).toBe(false);
  });
});

describe('isOilServiceType', () => {
  it('accepts each job on the sheet', () => {
    for (const job of OIL_SERVICE_TYPES) expect(isOilServiceType(job)).toBe(true);
  });

  it('rejects a job it does not know', () => {
    expect(isOilServiceType('FILTER_ONLY')).toBe(false);
    expect(isOilServiceType('')).toBe(false);
    expect(isOilServiceType(null)).toBe(false);
  });
});

describe('toAmount', () => {
  it('reads a number straight through', () => {
    expect(toAmount(420)).toBe(420);
  });

  it('reads the string an input box hands over', () => {
    expect(toAmount('420')).toBe(420);
  });

  it('reads a decimal price', () => {
    expect(toAmount('412.5')).toBe(412.5);
  });

  it('ignores padding around a typed number', () => {
    expect(toAmount('  420  ')).toBe(420);
  });

  it('reads an empty box as nothing rather than as zero-ish nonsense', () => {
    expect(toAmount('')).toBe(0);
    expect(toAmount('   ')).toBe(0);
  });

  it('reads what is not a number at all as nothing', () => {
    expect(toAmount('abc')).toBe(0);
    expect(toAmount('420 EGP')).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount(null)).toBe(0);
    expect(toAmount({})).toBe(0);
  });

  it('refuses negative money', () => {
    expect(toAmount(-50)).toBe(0);
    expect(toAmount('-50')).toBe(0);
  });

  it('refuses infinities, which would poison a total', () => {
    expect(toAmount(Infinity)).toBe(0);
    expect(toAmount('Infinity')).toBe(0);
    expect(toAmount(NaN)).toBe(0);
  });

  it('keeps a free line at zero', () => {
    expect(toAmount(0)).toBe(0);
    expect(toAmount('0')).toBe(0);
  });
});

describe('isFilterPriceValid', () => {
  it('accepts a price inside the bounds', () => {
    expect(isFilterPriceValid(400)).toBe(true);
    expect(isFilterPriceValid('400')).toBe(true);
  });

  it('accepts both bounds themselves', () => {
    expect(isFilterPriceValid(FILTER_PRICE_MIN)).toBe(true);
    expect(isFilterPriceValid(FILTER_PRICE_MAX)).toBe(true);
  });

  it('rejects a price just outside either bound', () => {
    expect(isFilterPriceValid(FILTER_PRICE_MIN - 1)).toBe(false);
    expect(isFilterPriceValid(FILTER_PRICE_MAX + 1)).toBe(false);
  });

  it('rejects an empty box rather than reading it as zero', () => {
    expect(isFilterPriceValid('')).toBe(false);
    expect(isFilterPriceValid('   ')).toBe(false);
  });

  it('rejects what is not a number', () => {
    expect(isFilterPriceValid('abc')).toBe(false);
    expect(isFilterPriceValid(undefined)).toBe(false);
    expect(isFilterPriceValid(null)).toBe(false);
  });
});

describe('chargedFilterPrice', () => {
  it('bills the typed filter price on a filter job', () => {
    expect(chargedFilterPrice('OIL_AND_FILTER', '380')).toBe(380);
  });

  it('bills nothing for a filter on an oil-only job', () => {
    expect(chargedFilterPrice('OIL_ONLY', '380')).toBe(0);
  });

  it('bills nothing when the box was left full and the job switched', () => {
    expect(chargedFilterPrice('OIL_ONLY', 500)).toBe(0);
  });

  it('bills nothing for an unreadable filter price', () => {
    expect(chargedFilterPrice('OIL_AND_FILTER', 'abc')).toBe(0);
  });
});

describe('oilServiceCharge', () => {
  it('adds oil, labour and filter into the total', () => {
    const charge = oilServiceCharge('SHELL_4L', 'OIL_AND_FILTER', '350');
    expect(charge).toEqual({
      oilPrice: 2200,
      laborCost: 300,
      filterPrice: 350,
      totalAmount: 2850,
    });
  });

  it('leaves the filter out of an oil-only bill', () => {
    const charge = oilServiceCharge('SHELL_5L', 'OIL_ONLY', '350');
    expect(charge.filterPrice).toBe(0);
    expect(charge.totalAmount).toBe(OIL_PRICES.SHELL_5L + LABOR_COSTS.OIL_ONLY);
  });

  it('still bills labour when the customer brought their own oil', () => {
    const charge = oilServiceCharge('CUSTOMER_OWN', 'OIL_ONLY', '');
    expect(charge.oilPrice).toBe(0);
    expect(charge.totalAmount).toBe(LABOR_COSTS.OIL_ONLY);
  });

  it('always totals its own three parts', () => {
    for (const oil of OIL_TYPES) {
      for (const job of OIL_SERVICE_TYPES) {
        const charge = oilServiceCharge(oil, job, 375);
        expect(charge.totalAmount).toBe(
          charge.oilPrice + charge.laborCost + charge.filterPrice
        );
      }
    }
  });

  it('quotes the sheet price for every oil', () => {
    for (const oil of OIL_TYPES) {
      expect(oilServiceCharge(oil, 'OIL_ONLY', 0).oilPrice).toBe(OIL_PRICES[oil]);
    }
  });

  it('prices an unknown oil at nothing rather than at NaN', () => {
    const charge = oilServiceCharge('MOBIL_5L', 'OIL_ONLY', 0);
    expect(charge.oilPrice).toBe(0);
    expect(charge.totalAmount).toBe(LABOR_COSTS.OIL_ONLY);
    expect(Number.isNaN(charge.totalAmount)).toBe(false);
  });

  it('prices an unknown job at nothing rather than at NaN', () => {
    const charge = oilServiceCharge('SHELL_4L', 'FILTER_ONLY', 400);
    expect(charge.laborCost).toBe(0);
    expect(charge.filterPrice).toBe(0);
    expect(charge.totalAmount).toBe(OIL_PRICES.SHELL_4L);
  });

  it('prices a request with nothing in it at zero', () => {
    expect(oilServiceCharge(undefined, undefined, undefined)).toEqual({
      oilPrice: 0,
      laborCost: 0,
      filterPrice: 0,
      totalAmount: 0,
    });
  });

  it('reads a decimal filter price into the total', () => {
    const charge = oilServiceCharge('CUSTOMER_OWN', 'OIL_AND_FILTER', '350.5');
    expect(charge.totalAmount).toBe(LABOR_COSTS.OIL_AND_FILTER + 350.5);
  });
});
