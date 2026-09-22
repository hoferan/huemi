import type { ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Lock } from 'lucide-react';
import { colorName } from '../color/palette';
import type { Hex } from '../model/hex';
import { SLOT_LABELS, type Slot } from '../model/types';
import { tokens } from '../styles/tokens.stylex';
import { ColorBlock } from './ColorBlock';
import { blockText, fieldLayout } from './blockText';

/**
 * The garment the user started from.
 *
 * It carries no controls: it is the one colour on the screen the app did not
 * choose, and offering "next" for it would suggest the app could improve on
 * the shirt the user owns. The padlock is not the only channel — "Base" is
 * there in words, because an icon alone says nothing to a screen reader and
 * little to anyone meeting it for the first time.
 */
export function BaseBlock({
  slot,
  hex,
  style,
  fade = tokens.colorFade,
}: {
  slot: Slot;
  hex: Hex;
  style?: stylex.StyleXStyles;
  fade?: string;
}): ReactElement {
  return (
    <ColorBlock slot={slot} hex={hex} style={style} fade={fade}>
      <div {...stylex.props(fieldLayout.field)}>
        <span {...stylex.props(blockText.slot)}>{SLOT_LABELS[slot]}</span>
        <span {...stylex.props(blockText.name)}>{colorName(hex)}</span>
      </div>
      <span {...stylex.props(blockText.mark)}>
        <Lock size={16} aria-hidden="true" />
        Base
      </span>
    </ColorBlock>
  );
}
