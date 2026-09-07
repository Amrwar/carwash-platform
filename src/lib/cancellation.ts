/**
 * What a cancelled wash is written down as.
 *
 * A car can be cancelled after money has already changed hands - the
 * driver pays, then takes the car away before it is washed - so the
 * cancel handler decides three things at once: how much was taken,
 * through which method, and whether the shop is holding it.
 *
 * It decided them off an unchecked body. A negative amount went straight
 * into the takings and pulled the day's revenue down with it; a payment
 * method it did not recognise reached the database and came back as a
 * 500; and money taken with no method named left `paymentType` undefined,
 * which prisma reads as "leave it alone", so the record kept whatever
 * method it had been carrying before.
 */

import { CancelWashRecordSchema } from '@/lib/validations';

/** The columns a cancellation writes. */
export interface CancellationUpdate {
  status: 'CANCELLED';
  finishTime: Date;
  amountPaid: number;
  paymentType: 'CASH' | 'INSTAPAY' | null;
  paymentReceived: boolean;
  notes: string | null;
}

/**
 * The update a cancellation makes. Throws a ZodError for a body we cannot
 * act on - negative money, an unknown payment method, money taken with no
 * method named.
 *
 * Money taken is money held: a cancellation is the end of the job, so
 * there is no later moment at which the payment would be marked received.
 * Nothing taken clears the method rather than leaving the old one behind.
 */
export function buildCancellationUpdate(
  body: unknown,
  finishTime: Date = new Date()
): CancellationUpdate {
  const input = CancelWashRecordSchema.parse(body ?? {});
  const amountPaid = input.amountPaid ?? 0;
  const paid = amountPaid > 0;

  return {
    status: 'CANCELLED',
    finishTime,
    amountPaid,
    paymentType: paid ? input.paymentType ?? null : null,
    paymentReceived: paid,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };
}
