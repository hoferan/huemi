import { describe, expect, it } from 'vitest';
import { formatSavedDate } from './formatSavedDate';

// Local times, built with the Date constructor, so the day boundaries hold in
// whatever time zone the suite runs in.
const NOW = new Date(2026, 8, 23, 9, 0);

describe('formatSavedDate', () => {
  it('says Today for the current local day', () => {
    expect(formatSavedDate(new Date(2026, 8, 23, 0, 1).toISOString(), NOW)).toBe('Today');
  });

  it('does not call late yesterday Today', () => {
    expect(formatSavedDate(new Date(2026, 8, 22, 23, 59).toISOString(), NOW)).toBe('Tue, Sep 22');
  });

  it('gives weekday, month and day within the year', () => {
    expect(formatSavedDate(new Date(2026, 8, 21, 12).toISOString(), NOW)).toBe('Mon, Sep 21');
  });

  it('adds the year when it is not this one', () => {
    expect(formatSavedDate(new Date(2025, 11, 30, 12).toISOString(), NOW)).toBe(
      'Tue, Dec 30, 2025',
    );
  });
});
