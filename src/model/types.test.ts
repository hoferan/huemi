import { describe, expect, it } from 'vitest';
import { CHECK_SLOTS, SLOTS, SLOT_LABELS } from './types';

describe('SLOTS', () => {
  // Head to toe. The dress sits where the top and the bottom do, since it
  // takes their place (#136).
  it('lists every slot head to toe', () => {
    expect(SLOTS).toEqual(['outerwear', 'top', 'bottom', 'dress', 'shoes', 'accessory']);
  });

  it('labels the dress', () => {
    expect(SLOT_LABELS.dress).toBe('Dress');
  });
});

describe('CHECK_SLOTS', () => {
  // Head to toe, because it is the order the tap screen asks in and the
  // order the list shows. Accessory is out: rating uses four slots (#23).
  // The dress is out until the check learns it (#137).
  it('lists the four rated slots head to toe', () => {
    expect(CHECK_SLOTS).toEqual(['outerwear', 'top', 'bottom', 'shoes']);
  });
});
