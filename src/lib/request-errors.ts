/**
 * What we tell a caller whose request we will not act on.
 *
 * Three handlers now parse their body against a schema and answer 400
 * when it does not fit, and all three had the same six lines for working
 * out what to say. The message matters: "Invalid mechanic record" tells
 * whoever is at the desk nothing, while "A service name is required" is
 * the sentence the schema was written to produce.
 */

import { ZodError } from 'zod';

/**
 * The first complaint a validation error carries, or `fallback` if the
 * failure was not a validation error at all - a body that was not JSON,
 * say, which reaches the same catch.
 */
export function validationMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ZodError)) return fallback;
  const message = error.errors[0]?.message;
  return message && message.trim() ? message : fallback;
}
