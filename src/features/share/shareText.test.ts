import { describe, expect, it } from 'vitest';
import { colorName } from '../../color/palette';
import { parseHex } from '../../model/hex';
import { shareText } from './shareText';

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const lower = (hex: string) => colorName(parseHex(hex)).toLowerCase();

describe('shareText', () => {
  it('names every piece head to toe', () => {
    expect(
      shareText({
        shoes: parseHex('#c9a57e'),
        top: parseHex('#ffffff'),
        bottom: parseHex('#1f2a44'),
      }),
    ).toBe(`${cap(lower('#ffffff'))} top, ${lower('#1f2a44')} bottom, ${lower('#c9a57e')} shoes.`);
  });

  it('reads as a sentence with a single piece', () => {
    expect(shareText({ top: parseHex('#1f2a44') })).toBe('Navy top.');
  });
});
