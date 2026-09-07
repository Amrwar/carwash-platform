/**
 * What we tell a caller whose request we will not act on.
 *
 * The point of this is that the schema's own sentence reaches the screen
 * instead of a generic one, so the cases pinned are a validation error
 * with something to say, a failure that is not a validation error at all,
 * and the odd shapes in between.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validationMessage } from './request-errors';

const Schema = z.object({
  name: z.string().min(1, 'A service name is required'),
  price: z.number().min(0, 'Price must be 0 or positive'),
});

function errorFrom(input: unknown): unknown {
  try {
    Schema.parse(input);
    throw new Error('the schema was supposed to refuse this');
  } catch (error) {
    return error;
  }
}

describe('validationMessage', () => {
  it('passes the schema its own sentence through', () => {
    expect(validationMessage(errorFrom({ name: '', price: 1 }), 'Invalid')).toBe(
      'A service name is required'
    );
  });

  it('reports the first complaint when there is more than one', () => {
    expect(validationMessage(errorFrom({ name: '', price: -1 }), 'Invalid')).toBe(
      'A service name is required'
    );
  });

  it('still says something when a field is simply missing', () => {
    expect(validationMessage(errorFrom({}), 'Invalid')).toBeTruthy();
  });

  it('falls back for a failure that is not about validation', () => {
    expect(validationMessage(new Error('Unexpected token < in JSON'), 'Invalid')).toBe(
      'Invalid'
    );
    expect(validationMessage(new TypeError('boom'), 'Invalid')).toBe('Invalid');
  });

  it('falls back for something that is not an error at all', () => {
    expect(validationMessage(null, 'Invalid')).toBe('Invalid');
    expect(validationMessage(undefined, 'Invalid')).toBe('Invalid');
    expect(validationMessage('A service name is required', 'Invalid')).toBe('Invalid');
  });

  it('falls back rather than answering with a blank message', () => {
    const blank = new z.ZodError([
      { code: 'custom', path: ['name'], message: '   ' },
    ]);
    expect(validationMessage(blank, 'Invalid')).toBe('Invalid');
  });

  it('falls back for a validation error carrying no complaints', () => {
    expect(validationMessage(new z.ZodError([]), 'Invalid')).toBe('Invalid');
  });
});
