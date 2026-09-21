import type { ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Lock } from 'lucide-react';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { ColorBlock } from './ColorBlock';
import { blockText, fieldLayout } from './blockText';

const styles = stylex.create({
  mark: {
    alignSelf: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginInlineEnd: '14px',
    fontSize: '0.7rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
});

/**
 * The garment the user started from.
 *
 * It carries no controls: it is the one colour on the screen the app did not
 * choose, and offering "next" for it would suggest the app could improve on
 * the shirt the user owns. The padlock is not the only channel — "Base" is
 * there in words, because an icon alone says nothing to a screen reader and
 * little to anyone meeting it for the first time.
 */
export function BaseBlock({ slot, hex }: { slot: Slot; hex: Hex }): ReactElement {
  return (
    <ColorBlock slot={slot} hex={hex}>
      <div {...stylex.props(fieldLayout.field)}>
        <span {...stylex.props(blockText.slot)}>{SLOT_LABELS[slot]}</span>
        <span {...stylex.props(blockText.name)}>{colorName(hex)}</span>
      </div>
      <span {...stylex.props(styles.mark)}>
        <Lock size={16} aria-hidden="true" />
        Base
      </span>
    </ColorBlock>
  );
}
