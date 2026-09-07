/**
 * What actually gets written down when the mechanic takes a job in.
 *
 * The POST handler built the row field by field and lost three of them on
 * the way: `category`, `serviceName` and `servicePrice` were never copied
 * across. The column has a default of OIL_SERVICE, so every job booked
 * through the other-services form was filed as an oil change with no
 * service name and no price against it - it showed up in the oil table
 * with a dash for the oil, and the other-services table was always empty.
 *
 * It also took `totalAmount` from the browser on trust. The bill is worked
 * out here now, from the price sheet, so the till and the form cannot
 * disagree and a hand-written request cannot set its own price.
 */

import { normalizePlate } from '@/lib/plates';
import {
  OilServiceType,
  OilType,
  oilServiceCharge,
  toAmount,
} from '@/lib/mechanic-pricing';
import { CreateMechanicRecordSchema } from '@/lib/validations';

/** Which of the two forms a job came in through. */
export type ServiceCategory = 'OIL_SERVICE' | 'OTHER_SERVICE';

/** A mechanic row, in the shape the database takes it. */
export interface MechanicRecordInput {
  plateNumber: string;
  carType: string | null;
  phoneNumber: string | null;
  category: ServiceCategory;
  oilType: OilType | null;
  oilPrice: number;
  serviceType: OilServiceType | null;
  laborCost: number;
  filterPrice: number;
  serviceName: string | null;
  servicePrice: number;
  totalAmount: number;
  paymentType: 'CASH' | 'INSTAPAY' | null;
  paymentReceived: boolean;
  notes: string | null;
}

/** A trimmed string, or null where there was nothing worth keeping. */
function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/**
 * The row a request body describes. Throws a ZodError if the body is not
 * one we can write down - a job with no plate, an oil change with no oil,
 * an other-service with no name.
 *
 * The two categories fill in different columns, and each leaves the
 * other's at zero rather than at whatever the browser happened to send.
 */
export function buildMechanicRecordInput(body: unknown): MechanicRecordInput {
  const input = CreateMechanicRecordSchema.parse(body);

  const common = {
    plateNumber: normalizePlate(input.plateNumber),
    carType: optionalText(input.carType),
    phoneNumber: optionalText(input.phoneNumber),
    category: input.category,
    paymentType: input.paymentType ?? null,
    paymentReceived: input.paymentReceived,
    notes: optionalText(input.notes),
  };

  if (input.category === 'OTHER_SERVICE') {
    const servicePrice = toAmount(input.servicePrice);
    return {
      ...common,
      oilType: null,
      oilPrice: 0,
      serviceType: null,
      laborCost: 0,
      filterPrice: 0,
      serviceName: optionalText(input.serviceName),
      servicePrice,
      totalAmount: servicePrice,
    };
  }

  const charge = oilServiceCharge(input.oilType, input.serviceType, input.filterPrice);
  return {
    ...common,
    oilType: input.oilType ?? null,
    oilPrice: charge.oilPrice,
    serviceType: input.serviceType ?? null,
    laborCost: charge.laborCost,
    filterPrice: charge.filterPrice,
    serviceName: null,
    servicePrice: 0,
    totalAmount: charge.totalAmount,
  };
}
