/**
 * The row a mechanic job is written down as.
 *
 * The bug this replaced dropped three fields on the floor, so the cases
 * that matter most are the ones that prove each category keeps its own
 * columns: an other-service that keeps its name and price, an oil change
 * that keeps its oil and its labour, and neither of them leaking the
 * other's fields into the row. The total is worked out here rather than
 * taken from the request, so a request that names its own total is
 * checked too.
 */

import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { LABOR_COSTS, OIL_PRICES } from './mechanic-pricing';
import { buildMechanicRecordInput } from './mechanic-record';

const oilJob = {
  plateNumber: 'ABC 123',
  category: 'OIL_SERVICE',
  oilType: 'SHELL_4L',
  serviceType: 'OIL_AND_FILTER',
  filterPrice: 380,
  paymentType: 'CASH',
};

const otherJob = {
  plateNumber: 'ABC 123',
  category: 'OTHER_SERVICE',
  serviceName: 'Brake pads',
  servicePrice: 900,
  paymentType: 'CASH',
};

describe('buildMechanicRecordInput, an oil service', () => {
  it('keeps the oil and the job', () => {
    const record = buildMechanicRecordInput(oilJob);
    expect(record.category).toBe('OIL_SERVICE');
    expect(record.oilType).toBe('SHELL_4L');
    expect(record.serviceType).toBe('OIL_AND_FILTER');
  });

  it('prices it from the sheet rather than from the request', () => {
    const record = buildMechanicRecordInput({ ...oilJob, totalAmount: 5 });
    expect(record.oilPrice).toBe(OIL_PRICES.SHELL_4L);
    expect(record.laborCost).toBe(LABOR_COSTS.OIL_AND_FILTER);
    expect(record.filterPrice).toBe(380);
    expect(record.totalAmount).toBe(OIL_PRICES.SHELL_4L + LABOR_COSTS.OIL_AND_FILTER + 380);
  });

  it('ignores a total a caller tried to set for itself', () => {
    const cheap = buildMechanicRecordInput({ ...oilJob, totalAmount: 1 });
    const honest = buildMechanicRecordInput(oilJob);
    expect(cheap.totalAmount).toBe(honest.totalAmount);
  });

  it('ignores line prices a caller tried to set for itself', () => {
    const record = buildMechanicRecordInput({ ...oilJob, oilPrice: 1, laborCost: 2 });
    expect(record.oilPrice).toBe(OIL_PRICES.SHELL_4L);
    expect(record.laborCost).toBe(LABOR_COSTS.OIL_AND_FILTER);
  });

  it('does not charge a filter on an oil-only job', () => {
    const record = buildMechanicRecordInput({
      ...oilJob,
      serviceType: 'OIL_ONLY',
      filterPrice: 380,
    });
    expect(record.filterPrice).toBe(0);
    expect(record.totalAmount).toBe(OIL_PRICES.SHELL_4L + LABOR_COSTS.OIL_ONLY);
  });

  it('reads the filter price the form sends as a string', () => {
    const record = buildMechanicRecordInput({ ...oilJob, filterPrice: '380' });
    expect(record.filterPrice).toBe(380);
  });

  it('leaves the other-service columns empty', () => {
    const record = buildMechanicRecordInput({ ...oilJob, serviceName: 'Brake pads' });
    expect(record.serviceName).toBeNull();
    expect(record.servicePrice).toBe(0);
  });

  it('still bills labour when the customer brought their own oil', () => {
    const record = buildMechanicRecordInput({
      ...oilJob,
      oilType: 'CUSTOMER_OWN',
      serviceType: 'OIL_ONLY',
    });
    expect(record.oilPrice).toBe(0);
    expect(record.totalAmount).toBe(LABOR_COSTS.OIL_ONLY);
  });
});

describe('buildMechanicRecordInput, another service', () => {
  it('keeps the name and the price the form sent', () => {
    const record = buildMechanicRecordInput(otherJob);
    expect(record.category).toBe('OTHER_SERVICE');
    expect(record.serviceName).toBe('Brake pads');
    expect(record.servicePrice).toBe(900);
  });

  it('bills the service price as the whole total', () => {
    expect(buildMechanicRecordInput(otherJob).totalAmount).toBe(900);
  });

  it('reads the price the form sends as a string', () => {
    const record = buildMechanicRecordInput({ ...otherJob, servicePrice: '900' });
    expect(record.servicePrice).toBe(900);
    expect(record.totalAmount).toBe(900);
  });

  it('trims the service name', () => {
    const record = buildMechanicRecordInput({ ...otherJob, serviceName: '  Brake pads  ' });
    expect(record.serviceName).toBe('Brake pads');
  });

  it('leaves the oil columns empty even if the request filled them', () => {
    const record = buildMechanicRecordInput({
      ...otherJob,
      oilType: 'SHELL_5L',
      serviceType: 'OIL_AND_FILTER',
      filterPrice: 400,
    });
    expect(record.oilType).toBeNull();
    expect(record.oilPrice).toBe(0);
    expect(record.serviceType).toBeNull();
    expect(record.laborCost).toBe(0);
    expect(record.filterPrice).toBe(0);
    expect(record.totalAmount).toBe(900);
  });
});

describe('buildMechanicRecordInput, the fields both categories share', () => {
  it('stores the plate in the spelling we compare against', () => {
    const record = buildMechanicRecordInput({ ...oilJob, plateNumber: '  ه ب ج ١٢٣  ' });
    expect(record.plateNumber).toBe('ه ب ج 123');
  });

  it('upper-cases a latin plate', () => {
    expect(buildMechanicRecordInput({ ...oilJob, plateNumber: 'abc 123' }).plateNumber).toBe(
      'ABC 123'
    );
  });

  it('keeps a car type and a phone number', () => {
    const record = buildMechanicRecordInput({
      ...oilJob,
      carType: ' Corolla ',
      phoneNumber: ' 01000000000 ',
    });
    expect(record.carType).toBe('Corolla');
    expect(record.phoneNumber).toBe('01000000000');
  });

  it('reads blank optional text as nothing at all', () => {
    const record = buildMechanicRecordInput({
      ...oilJob,
      carType: '   ',
      phoneNumber: '',
      notes: '   ',
    });
    expect(record.carType).toBeNull();
    expect(record.phoneNumber).toBeNull();
    expect(record.notes).toBeNull();
  });

  it('takes a job in as unpaid unless told otherwise', () => {
    expect(buildMechanicRecordInput(oilJob).paymentReceived).toBe(false);
    expect(
      buildMechanicRecordInput({ ...oilJob, paymentReceived: true }).paymentReceived
    ).toBe(true);
  });

  it('keeps the payment method, and allows none', () => {
    expect(buildMechanicRecordInput({ ...oilJob, paymentType: 'INSTAPAY' }).paymentType).toBe(
      'INSTAPAY'
    );
    const unpaid = buildMechanicRecordInput({ ...oilJob, paymentType: undefined });
    expect(unpaid.paymentType).toBeNull();
  });

  it('files a job with no category named as an oil service', () => {
    const record = buildMechanicRecordInput({
      plateNumber: 'ABC 123',
      oilType: 'SHELL_4L',
      serviceType: 'OIL_ONLY',
    });
    expect(record.category).toBe('OIL_SERVICE');
  });
});

describe('buildMechanicRecordInput, bodies it will not write down', () => {
  it('refuses a job with no plate', () => {
    expect(() => buildMechanicRecordInput({ ...oilJob, plateNumber: '' })).toThrow(ZodError);
    expect(() => buildMechanicRecordInput({ ...oilJob, plateNumber: '   ' })).toThrow(ZodError);
    expect(() => buildMechanicRecordInput({ ...oilJob, plateNumber: undefined })).toThrow(
      ZodError
    );
  });

  it('refuses an oil change with no oil or no job named', () => {
    expect(() => buildMechanicRecordInput({ ...oilJob, oilType: undefined })).toThrow(ZodError);
    expect(() => buildMechanicRecordInput({ ...oilJob, serviceType: undefined })).toThrow(
      ZodError
    );
  });

  it('refuses an oil we do not stock', () => {
    expect(() => buildMechanicRecordInput({ ...oilJob, oilType: 'MOBIL_5L' })).toThrow(ZodError);
  });

  it('refuses a category it does not know', () => {
    expect(() => buildMechanicRecordInput({ ...oilJob, category: 'TYRE_SERVICE' })).toThrow(
      ZodError
    );
  });

  it('refuses another service with no name', () => {
    expect(() => buildMechanicRecordInput({ ...otherJob, serviceName: '' })).toThrow(ZodError);
    expect(() => buildMechanicRecordInput({ ...otherJob, serviceName: '  ' })).toThrow(ZodError);
  });

  it('refuses a payment method it does not know', () => {
    expect(() => buildMechanicRecordInput({ ...oilJob, paymentType: 'CHEQUE' })).toThrow(
      ZodError
    );
  });

  it('refuses a body that is not an object at all', () => {
    expect(() => buildMechanicRecordInput(null)).toThrow(ZodError);
    expect(() => buildMechanicRecordInput('ABC 123')).toThrow(ZodError);
  });

  it('says which field it objected to', () => {
    try {
      buildMechanicRecordInput({ ...otherJob, serviceName: '' });
      expect.unreachable('a nameless service should not be written down');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).errors[0].path).toEqual(['serviceName']);
    }
  });
});
