import * as stylex from '@stylexjs/stylex';
import { ArrowLeftRight } from 'lucide-react';
import { colorName } from '../../color/palette';
import type { Hex } from '../../model/hex';
import { SLOT_LABELS, type CheckSlot } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { blockText, fieldLayout } from '../../ui/blockText';
import { ColorBlock } from '../../ui/ColorBlock';
import { SWAPPED, swapBlockLabel } from './copy';

const styles = stylex.create({
  // Inset for the reason SuggestionBlock gives: the block clips, so an
  // outset ring would be cut off at its edges.
  field: {
    minHeight: tokens.touchTarget,
    textAlign: 'start',
    font: 'inherit',
    color: 'inherit',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    cursor: 'pointer',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInlineEnd: '14px',
    outlineColor: 'currentColor',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '3px',
    outlineOffset: '-3px',
  },
  text: { display: 'flex', flexDirection: 'column' },
});

/**
 * One worn piece on the check result, as a single button over the whole
 * block: every piece is a swap target, so the block has one action and no
 * rail (#25). Its height comes from the caller, which sizes blocks by how
 * much of the outfit each piece covers.
 */
export function CheckBlock({
  slot,
  hex,
  swapped,
  style,
  onSwap,
}: {
  slot: CheckSlot;
  hex: Hex;
  swapped: boolean;
  style?: stylex.StyleXStyles;
  onSwap: () => void;
}) {
  return (
    <ColorBlock slot={slot} hex={hex} {...(style ? { style } : {})}>
      <button
        type="button"
        onClick={onSwap}
        aria-label={swapBlockLabel(slot, hex, swapped)}
        {...stylex.props(fieldLayout.field, styles.field)}
      >
        <span {...stylex.props(styles.text)}>
          <span {...stylex.props(blockText.slot)}>{SLOT_LABELS[slot]}</span>
          <span {...stylex.props(blockText.name)}>{colorName(hex)}</span>
          {swapped && <span {...stylex.props(blockText.position)}>{SWAPPED}</span>}
        </span>
        <ArrowLeftRight size={18} aria-hidden="true" />
      </button>
    </ColorBlock>
  );
}
