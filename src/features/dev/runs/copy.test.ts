import { describe, expect, it } from 'vitest';
import { matchingHeadline, readCaption, readingHeadline, trueCaption } from './copy';

describe('reading run copy', () => {
  it('heads the summary with the right answers and the light', () => {
    expect(readingHeadline(17, 20, 'Lamp')).toBe('17 of 20 right under Lamp');
  });

  it('heads the matching summary with the pairs liked', () => {
    expect(matchingHeadline(12, 20)).toBe('You liked 12 of 20');
  });

  it('says what the reader made of a miss', () => {
    expect(readCaption('single', 'Navy')).toBe('Read Navy');
    expect(readCaption('several', 'Navy')).toBe('Read several, mostly Navy');
    expect(readCaption('unclear', 'Navy')).toBe('Unclear, mostly Navy');
    expect(trueCaption('Blue')).toBe('True Blue');
  });
});
