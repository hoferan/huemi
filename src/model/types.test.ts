import { describe, expect, it } from 'vitest';
import { CHECK_SLOTS } from './types';

describe('CHECK_SLOTS', () => {
  // Head to toe, because it is the order the tap screen asks in and the
  // order the list shows. Accessory is out: rating uses four slots (#23).
  it('lists the four rated slots head to toe', () => {
    expect(CHECK_SLOTS).toEqual(['outerwear', 'top', 'bottom', 'shoes']);
  });
});
