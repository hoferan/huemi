import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import type { ShareImageInput } from './layout';
import { parseShareLink, shareLink } from './link';

const NAVY = parseHex('#1f2a44');
const MUSTARD = parseHex('#c39a3a');
const ORIGIN = 'https://huemi.app';

const read = (query: string) => parseShareLink(new URLSearchParams(query));

describe('shareLink', () => {
  it('writes the pieces head to toe as bare hexes, then the base', () => {
    expect(shareLink(ORIGIN, { pieces: { bottom: NAVY, top: MUSTARD }, baseSlot: 'bottom' })).toBe(
      'https://huemi.app/shared?top=c39a3a&bottom=1f2a44&base=bottom',
    );
  });

  it('leaves the base out when there is none', () => {
    expect(shareLink(ORIGIN, { pieces: { top: MUSTARD }, baseSlot: null })).toBe(
      'https://huemi.app/shared?top=c39a3a',
    );
  });
});

describe('parseShareLink', () => {
  it('reads back what it wrote', () => {
    const outfits: ShareImageInput[] = [
      {
        pieces: {
          outerwear: parseHex('#b88a5c'),
          top: MUSTARD,
          bottom: NAVY,
          shoes: parseHex('#c9a57e'),
          accessory: parseHex('#6e1f2c'),
        },
        baseSlot: 'bottom',
      },
      { pieces: { top: MUSTARD, shoes: NAVY }, baseSlot: null },
      { pieces: { top: MUSTARD }, baseSlot: 'top' },
    ];
    for (const outfit of outfits) {
      expect(parseShareLink(new URL(shareLink(ORIGIN, outfit)).searchParams)).toEqual(outfit);
    }
  });

  it('ignores what it does not know', () => {
    expect(read('top=c39a3a&fbclid=x&utm_source=y')).toEqual({
      pieces: { top: MUSTARD },
      baseSlot: null,
    });
  });

  it('accepts a hex with a # or in capitals', () => {
    expect(read('top=%23C39A3A')).toEqual({ pieces: { top: MUSTARD }, baseSlot: null });
    expect(read('top=C39A3A')).toEqual({ pieces: { top: MUSTARD }, baseSlot: null });
  });

  // shareLink writes six digits. Three is a link cut inside its last hex, and
  // parseHex would read 1f2 as a quite different #11ff22.
  it('rejects a hex cut short', () => {
    expect(read('top=c39a3a&bottom=1f2')).toBeNull();
    expect(read('top=fff')).toBeNull();
  });

  it('rejects a link with a piece it cannot read', () => {
    expect(read('top=c39a3a&bottom=zzzzzz')).toBeNull();
    expect(read('top=c39a3')).toBeNull();
  });

  it('rejects a link with no pieces', () => {
    expect(read('')).toBeNull();
    expect(read('base=top')).toBeNull();
  });

  it('rejects a base with no piece in its slot', () => {
    expect(read('top=c39a3a&base=shoes')).toBeNull();
    expect(read('top=c39a3a&base=hat')).toBeNull();
  });
});
