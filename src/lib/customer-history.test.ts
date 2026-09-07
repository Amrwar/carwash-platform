/**
 * The customer card the plate search answers with.
 *
 * The card is shown to whoever is standing at the desk taking the car in,
 * and it names a phone number and a spending history, so putting the
 * wrong plate's history on it is worse than showing nothing. The cases
 * that matter are the ones where more than one plate matched: an exact
 * match in either spelling has to win, and only that plate's visits may
 * be counted.
 */

import { describe, expect, it } from 'vitest';

import {
  RECENT_VISIT_COUNT,
  VIP_VISIT_THRESHOLD,
  favoriteWashType,
  groupByPlate,
  isSearchablePlateQuery,
  pickMatchingPlate,
  summarizeCustomerHistory,
} from './customer-history';

let clock = Date.UTC(2026, 0, 15, 9, 0, 0);

/**
 * A visit. Each one made is a minute older than the last, so a list built
 * top to bottom reads newest first, the order the query returns.
 */
function visit(
  overrides: {
    plateNumber?: string;
    carType?: string | null;
    phoneNumber?: string | null;
    washType?: string;
    amountPaid?: number;
    entryTime?: Date;
  } = {}
) {
  clock -= 60_000;
  return {
    plateNumber: 'ABC 123',
    carType: 'Corolla',
    phoneNumber: '01000000000',
    washType: 'FULL',
    amountPaid: 100,
    entryTime: new Date(clock),
    ...overrides,
  };
}

describe('isSearchablePlateQuery', () => {
  it('waits for two characters', () => {
    expect(isSearchablePlateQuery('A')).toBe(false);
    expect(isSearchablePlateQuery('AB')).toBe(true);
  });

  it('counts Arabic-Indic digits as characters', () => {
    expect(isSearchablePlateQuery('١٢')).toBe(true);
    expect(isSearchablePlateQuery('١')).toBe(false);
  });

  it('does not count padding as characters', () => {
    expect(isSearchablePlateQuery('  A  ')).toBe(false);
  });

  it('refuses nothing at all', () => {
    expect(isSearchablePlateQuery('')).toBe(false);
    expect(isSearchablePlateQuery(null)).toBe(false);
    expect(isSearchablePlateQuery(undefined)).toBe(false);
  });
});

describe('groupByPlate', () => {
  it('gathers the visits of each plate', () => {
    const groups = groupByPlate([
      visit({ plateNumber: 'ABC 123' }),
      visit({ plateNumber: 'XYZ 999' }),
      visit({ plateNumber: 'ABC 123' }),
    ]);
    expect(Object.keys(groups)).toEqual(['ABC 123', 'XYZ 999']);
    expect(groups['ABC 123']).toHaveLength(2);
    expect(groups['XYZ 999']).toHaveLength(1);
  });

  it('keeps the visits of a plate in the order they arrived', () => {
    const newer = visit({ plateNumber: 'ABC 123', amountPaid: 200 });
    const older = visit({ plateNumber: 'ABC 123', amountPaid: 100 });
    expect(groupByPlate([newer, older])['ABC 123']).toEqual([newer, older]);
  });

  it('gives nothing for no visits', () => {
    expect(groupByPlate([])).toEqual({});
  });

  it('keeps two spellings of the same number apart, as the column does', () => {
    const groups = groupByPlate([
      visit({ plateNumber: 'ABC 123' }),
      visit({ plateNumber: 'ABC ١٢٣' }),
    ]);
    expect(Object.keys(groups)).toHaveLength(2);
  });
});

describe('pickMatchingPlate', () => {
  it('prefers the plate that is exactly what was typed', () => {
    expect(pickMatchingPlate(['ABC 1234', 'ABC 123'], 'ABC 123')).toBe('ABC 123');
  });

  it('recognises an exact match written in Arabic-Indic digits', () => {
    expect(pickMatchingPlate(['ABC 1234', 'ABC ١٢٣'], 'ABC 123')).toBe('ABC ١٢٣');
  });

  it('recognises an exact match when the search itself was typed in Arabic', () => {
    expect(pickMatchingPlate(['ABC 1234', 'ABC 123'], 'ABC ١٢٣')).toBe('ABC 123');
  });

  it('ignores case and padding around the search', () => {
    expect(pickMatchingPlate(['ABC 123'], '  abc 123 ')).toBe('ABC 123');
  });

  it('falls back to the most recent plate when nothing matches exactly', () => {
    expect(pickMatchingPlate(['ABC 1234', 'ABC 12345'], 'ABC 123')).toBe('ABC 1234');
  });

  it('has nothing to pick from an empty list', () => {
    expect(pickMatchingPlate([], 'ABC 123')).toBeNull();
  });
});

describe('favoriteWashType', () => {
  it('names the wash asked for most often', () => {
    const washes = favoriteWashType([
      visit({ washType: 'INNER' }),
      visit({ washType: 'FULL' }),
      visit({ washType: 'FULL' }),
    ]);
    expect(washes).toBe('FULL');
  });

  it('breaks a tie towards the most recent wash', () => {
    expect(
      favoriteWashType([
        visit({ washType: 'OUTER' }),
        visit({ washType: 'FULL' }),
      ])
    ).toBe('OUTER');
  });

  it('names the only wash there is', () => {
    expect(favoriteWashType([visit({ washType: 'FREE' })])).toBe('FREE');
  });

  it('names nothing when there are no visits', () => {
    expect(favoriteWashType([])).toBeNull();
  });
});

describe('summarizeCustomerHistory', () => {
  it('has nothing to say about a plate that never came in', () => {
    expect(summarizeCustomerHistory([], 'ABC 123')).toBeNull();
  });

  it('counts the visits and the money of the matching plate', () => {
    const card = summarizeCustomerHistory(
      [
        visit({ plateNumber: 'ABC 123', amountPaid: 120 }),
        visit({ plateNumber: 'ABC 123', amountPaid: 80 }),
      ],
      'ABC 123'
    );
    expect(card?.totalVisits).toBe(2);
    expect(card?.totalSpent).toBe(200);
  });

  it('counts only the matching plate, not everything the search turned up', () => {
    const card = summarizeCustomerHistory(
      [
        visit({ plateNumber: 'ABC 1234', amountPaid: 500 }),
        visit({ plateNumber: 'ABC 123', amountPaid: 120 }),
        visit({ plateNumber: 'ABC 123', amountPaid: 80 }),
      ],
      'ABC 123'
    );
    expect(card?.plateNumber).toBe('ABC 123');
    expect(card?.totalVisits).toBe(2);
    expect(card?.totalSpent).toBe(200);
  });

  it('is about the Arabic-spelled plate when that is the exact match', () => {
    const card = summarizeCustomerHistory(
      [
        visit({ plateNumber: 'ABC 1234', phoneNumber: '01111111111' }),
        visit({ plateNumber: 'ABC ١٢٣', phoneNumber: '01000000000' }),
      ],
      'ABC 123'
    );
    expect(card?.plateNumber).toBe('ABC ١٢٣');
    expect(card?.phoneNumber).toBe('01000000000');
  });

  it('takes the car and the phone number from the most recent visit', () => {
    const card = summarizeCustomerHistory(
      [
        visit({ carType: 'Elantra', phoneNumber: '01222222222' }),
        visit({ carType: 'Corolla', phoneNumber: '01000000000' }),
      ],
      'ABC 123'
    );
    expect(card?.carType).toBe('Elantra');
    expect(card?.phoneNumber).toBe('01222222222');
  });

  it('reports the most recent visit as the last one', () => {
    const newest = visit({ amountPaid: 10 });
    const card = summarizeCustomerHistory([newest, visit()], 'ABC 123');
    expect(card?.lastVisit).toBe(newest.entryTime);
  });

  it('keeps a missing car type and phone number missing', () => {
    const card = summarizeCustomerHistory(
      [visit({ carType: null, phoneNumber: null })],
      'ABC 123'
    );
    expect(card?.carType).toBeNull();
    expect(card?.phoneNumber).toBeNull();
  });

  it('names the usual wash', () => {
    const card = summarizeCustomerHistory(
      [visit({ washType: 'INNER' }), visit({ washType: 'FULL' }), visit({ washType: 'FULL' })],
      'ABC 123'
    );
    expect(card?.favoriteWashType).toBe('FULL');
  });

  it('calls a customer a regular at the threshold and not before', () => {
    const visits = Array.from({ length: VIP_VISIT_THRESHOLD - 1 }, () => visit());
    expect(summarizeCustomerHistory(visits, 'ABC 123')?.isVIP).toBe(false);
    expect(summarizeCustomerHistory([...visits, visit()], 'ABC 123')?.isVIP).toBe(true);
  });

  it('does not make a regular out of somebody else\'s visits', () => {
    const others = Array.from({ length: VIP_VISIT_THRESHOLD }, () =>
      visit({ plateNumber: 'ABC 1234' })
    );
    const card = summarizeCustomerHistory([...others, visit({ plateNumber: 'ABC 123' })], 'ABC 123');
    expect(card?.plateNumber).toBe('ABC 123');
    expect(card?.isVIP).toBe(false);
  });

  it('lists at most a handful of recent visits', () => {
    const visits = Array.from({ length: RECENT_VISIT_COUNT + 3 }, () => visit());
    const card = summarizeCustomerHistory(visits, 'ABC 123');
    expect(card?.recentVisits).toHaveLength(RECENT_VISIT_COUNT);
    expect(card?.recentVisits[0]).toBe(visits[0]);
    expect(card?.totalVisits).toBe(RECENT_VISIT_COUNT + 3);
  });

  it('lists the visits it has when there are fewer than a handful', () => {
    const card = summarizeCustomerHistory([visit(), visit()], 'ABC 123');
    expect(card?.recentVisits).toHaveLength(2);
  });

  it('counts a free wash as a visit worth nothing', () => {
    const card = summarizeCustomerHistory(
      [visit({ washType: 'FREE', amountPaid: 0 }), visit({ amountPaid: 100 })],
      'ABC 123'
    );
    expect(card?.totalVisits).toBe(2);
    expect(card?.totalSpent).toBe(100);
  });
});
