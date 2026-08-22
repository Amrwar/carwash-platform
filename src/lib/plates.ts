/**
 * Plate numbers, which arrive in two alphabets.
 *
 * Egyptian plates are written with Arabic-Indic digits (٠١٢٣…) on the car
 * and Latin digits (0123…) by most people typing them in. The same plate
 * therefore reaches us spelled two ways, and a search for one has to find
 * the other. Both API routes that search and the one that stores had their
 * own copy of this; they now share it.
 */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Arabic-Indic digits rewritten as Latin ones; everything else is left. */
export function normalizeDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Latin digits rewritten as Arabic-Indic ones. */
export function toArabicDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)]);
}

/**
 * A plate in the form we store and compare: Latin digits, upper case, and
 * no padding around it. Letters are left alone - Arabic letters have no
 * case, and Latin ones are upper-cased.
 */
export function normalizePlate(plate: string): string {
  return normalizeDigits(plate.trim()).toUpperCase();
}

/**
 * Both spellings of a plate, for a search that must match either. The pair
 * is de-duplicated: a plate with no digits at all spells the same way twice.
 */
export function plateSpellings(plate: string): string[] {
  const latin = normalizePlate(plate);
  const arabic = toArabicDigits(latin);
  return latin === arabic ? [latin] : [latin, arabic];
}
