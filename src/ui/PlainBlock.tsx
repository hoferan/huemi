import type { ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { ColorBlock } from './ColorBlock';
import { blockText, fieldLayout } from './blockText';

/** A block's slot over its color name, as every block in the app sets them. */
export function BlockField({ slot, hex }: { slot: Slot; hex: Hex }): ReactElement {
  return (
    <div {...stylex.props(fieldLayout.field)}>
      <span {...stylex.props(blockText.slot)}>{SLOT_LABELS[slot]}</span>
      <span {...stylex.props(blockText.name)}>{colorName(hex)}</span>
    </div>
  );
}

/**
 * A piece and nothing else, for a screen that shows an outfit someone else
 * chose. Next, Keep and alternatives would mean nothing there, so the block
 * carries no control at all.
 */
export function PlainBlock({
  slot,
  hex,
  style,
}: {
  slot: Slot;
  hex: Hex;
  style?: stylex.StyleXStyles;
}): ReactElement {
  return (
    <ColorBlock slot={slot} hex={hex} style={style}>
      <BlockField slot={slot} hex={hex} />
    </ColorBlock>
  );
}
