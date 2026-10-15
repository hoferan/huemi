import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FULL_SHAPE } from '../model/shape';
import { PIECES_KEY, localPieces } from './localPieces';

describe('localPieces', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wears everything when nothing is stored', () => {
    expect(localPieces.read()).toEqual(FULL_SHAPE);
  });

  it('reads the pieces left out', () => {
    localStorage.setItem(PIECES_KEY, '{"outerwear":false,"accessory":true}');
    expect(localPieces.read()).toEqual({ outerwear: false, accessory: true, dress: false });
  });

  it('wears everything when the stored value is not JSON', () => {
    localStorage.setItem(PIECES_KEY, 'not json');
    expect(localPieces.read()).toEqual(FULL_SHAPE);
  });

  it('leaves a piece out only for a literal false', () => {
    localStorage.setItem(PIECES_KEY, '{"outerwear":"no"}');
    expect(localPieces.read()).toEqual(FULL_SHAPE);
  });

  it('wears everything when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(localPieces.read()).toEqual(FULL_SHAPE);
  });

  it('wears a dress only for a literal true', () => {
    localStorage.setItem(PIECES_KEY, '{"dress":true}');
    expect(localPieces.read()).toEqual({ ...FULL_SHAPE, dress: true });
    localStorage.setItem(PIECES_KEY, '{"dress":"yes"}');
    expect(localPieces.read()).toEqual(FULL_SHAPE);
  });

  it('writes the three choices and nothing else', () => {
    localPieces.write({ outerwear: false, accessory: true, dress: true });
    expect(localStorage.getItem(PIECES_KEY)).toBe(
      '{"outerwear":false,"accessory":true,"dress":true}',
    );
  });

  it('drops a write that storage refuses', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() =>
      localPieces.write({ outerwear: false, accessory: false, dress: false }),
    ).not.toThrow();
  });
});
