/**
 * What an oil change costs.
 *
 * The price sheet was written into the oil-service form twice over: once as
 * the OIL_PRICES/LABOR_COSTS lookups the total is worked out from, and once
 * again as literal numbers in the option lists the customer is shown. The
 * two are not connected, so a price rise applied to one of them prints a
 * figure on screen that is not the figure charged.
 *
 * The API took the total on trust as well - whatever the browser posted in
 * `totalAmount` was what went in the till - so the arithmetic lives here,
 * away from React and away from prisma, where the server can repeat it.
 */

/** The oils on offer. CUSTOMER_OWN is the customer bringing their own. */
export type OilType = 'SHELL_4L' | 'SHELL_5L' | 'CUSTOMER_OWN';

/** With or without a new filter. */
export type OilServiceType = 'OIL_ONLY' | 'OIL_AND_FILTER';

/** The oils, in the order the form lists them. */
export const OIL_TYPES: readonly OilType[] = ['SHELL_4L', 'SHELL_5L', 'CUSTOMER_OWN'];

/** The jobs, in the order the form lists them. */
export const OIL_SERVICE_TYPES: readonly OilServiceType[] = ['OIL_ONLY', 'OIL_AND_FILTER'];

/** Price of the oil itself, in EGP. The customer's own oil costs nothing. */
export const OIL_PRICES: Record<OilType, number> = {
  SHELL_4L: 2200,
  SHELL_5L: 2700,
  CUSTOMER_OWN: 0,
};

/** Labour, in EGP. Changing the filter as well is the dearer job. */
export const LABOR_COSTS: Record<OilServiceType, number> = {
  OIL_ONLY: 200,
  OIL_AND_FILTER: 300,
};

/** Filters vary by car, so the price is typed in - within these bounds. */
export const FILTER_PRICE_MIN = 350;
export const FILTER_PRICE_MAX = 500;

/** What the filter box starts at. */
export const DEFAULT_FILTER_PRICE = FILTER_PRICE_MIN;

/** The parts of an oil-service bill, and what they add up to. */
export interface OilServiceCharge {
  oilPrice: number;
  laborCost: number;
  filterPrice: number;
  totalAmount: number;
}

/** Whether a string names one of the oils we stock. */
export function isOilType(value: unknown): value is OilType {
  return typeof value === 'string' && (OIL_TYPES as readonly string[]).includes(value);
}

/** Whether a string names one of the two jobs. */
export function isOilServiceType(value: unknown): value is OilServiceType {
  return typeof value === 'string' && (OIL_SERVICE_TYPES as readonly string[]).includes(value);
}

/**
 * A number from whatever the form or the request body held - the filter box
 * hands over a string, an API caller may hand over anything at all. Blanks,
 * nonsense, infinities and negative money all read as zero rather than
 * poisoning the total with NaN.
 */
export function toAmount(value: unknown): number {
  const amount = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
}

/**
 * Whether a typed filter price is one we will bill. Outside the bounds is a
 * mistake worth stopping at the form, not a cheap or dear filter. An empty
 * box reads as zero and so falls below the lower bound, which is the answer
 * we want anyway.
 */
export function isFilterPriceValid(value: unknown): boolean {
  const amount = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(amount)) return false;
  return amount >= FILTER_PRICE_MIN && amount <= FILTER_PRICE_MAX;
}

/**
 * What to bill for the filter. An oil-only job is never charged for one,
 * however full the filter box was left when the job type was switched.
 */
export function chargedFilterPrice(serviceType: OilServiceType, value: unknown): number {
  return serviceType === 'OIL_AND_FILTER' ? toAmount(value) : 0;
}

/**
 * The whole bill. Unknown oils and unknown jobs price at zero rather than
 * NaN, so a bad request lands as an obviously wrong total instead of a
 * total that cannot be compared with anything.
 */
export function oilServiceCharge(
  oilType: unknown,
  serviceType: unknown,
  filterPriceInput: unknown
): OilServiceCharge {
  const oilPrice = isOilType(oilType) ? OIL_PRICES[oilType] : 0;
  const laborCost = isOilServiceType(serviceType) ? LABOR_COSTS[serviceType] : 0;
  const filterPrice = isOilServiceType(serviceType)
    ? chargedFilterPrice(serviceType, filterPriceInput)
    : 0;

  return {
    oilPrice,
    laborCost,
    filterPrice,
    totalAmount: oilPrice + laborCost + filterPrice,
  };
}
