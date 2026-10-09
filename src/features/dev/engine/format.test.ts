import { describe, expect, it } from 'vitest';
import { sideBySide } from './format';

describe('sideBySide', () => {
  it('prints a measurement and its threshold at the given precision', () => {
    expect(sideBySide(0.0654, 0.12, 3)).toEqual(['0.065', '0.120']);
  });

  // A reading at the threshold is the one a developer opens the panel for, so
  // "0.120 over 0.120" would hide the very thing they came to see.
  it('adds digits until two different numbers print differently', () => {
    expect(sideBySide(0.11996, 0.12, 3)).toEqual(['0.11996', '0.12000']);
    expect(sideBySide(0.1904, 0.19, 2)).toEqual(['0.1904', '0.1900']);
  });

  it('leaves equal numbers equal', () => {
    expect(sideBySide(0.12, 0.12, 3)).toEqual(['0.120', '0.120']);
  });
});
