import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { needsBorder, readableForeground } from '../../../color/contrast';
import { colorName } from '../../../color/palette';
import { SLOT_LABELS } from '../../../model/types';
import type { Hex } from '../../../model/hex';
import { tokens } from '../../../styles/tokens.stylex';
import { blockText } from '../../../ui/blockText';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Swatch } from '../../../ui/Swatch';
import { swatchGrid } from '../../../ui/swatchGrid';
import { MENU_BACK } from '../field/copy';
import {
  BETTER_COLORS,
  KEEPING,
  MATCHING_TITLE,
  NOTHING_WORKS,
  PICK_BETTER,
  QUESTION_PAIR,
  REPLACING,
  SKIP,
  WHICH_BLOCK,
} from './copy';
import type { Pair } from './pairs';
import { VoteCard } from './VoteCard';

const styles = stylex.create({
  stack: { display: 'flex', flexDirection: 'column', gap: '8px' },
  block: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: '2px',
    minHeight: '120px',
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px',
    borderStyle: 'none',
    borderRadius: tokens.radius,
    font: 'inherit',
    textAlign: 'start',
  },
  press: { cursor: 'pointer' },
  // Dynamic: the color is a runtime value (ADR 0002).
  fill: (background: string, foreground: string) => ({
    backgroundColor: background,
    color: foreground,
  }),
  // White, Cream and Light grey have no edge against the page without it.
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  actions: { display: 'flex', flexDirection: 'column', gap: '12px' },
});

/**
 * One half of the pair, as a block with its name on it. With `onPress` it is
 * a button whose name is the color's, so the which step's two choices are
 * named for what they look like. Without it the block is plain, and `label`
 * says which piece it is.
 */
function Block({ hex, label, onPress }: { hex: Hex; label?: string; onPress?: () => void }) {
  const look = stylex.props(
    styles.block,
    styles.fill(hex, readableForeground(hex).color),
    needsBorder(hex) && styles.hairline,
    onPress && styles.press,
  );
  const text = (
    <>
      {label && <span {...stylex.props(blockText.slot)}>{label}</span>}
      <span {...stylex.props(blockText.name)}>{colorName(hex)}</span>
    </>
  );
  if (!onPress) return <div {...look}>{text}</div>;
  return (
    <button type="button" aria-label={colorName(hex)} onClick={onPress} {...look}>
      {text}
    </button>
  );
}

/** Would they wear the top and the bottom together? A swipe or Yes and No answer. */
export function PairVoteStep({
  pair,
  progress,
  undo,
  onAnswer,
}: {
  pair: Pair;
  progress: ReactNode;
  undo: ReactNode;
  onAnswer: (yes: boolean) => void;
}) {
  return (
    <Screen title={MATCHING_TITLE} back={MENU_BACK}>
      {progress}
      {undo}
      <VoteCard question={QUESTION_PAIR} onAnswer={onAnswer}>
        <div {...stylex.props(styles.stack)}>
          <Block hex={pair.top} label={SLOT_LABELS.top} />
          <Block hex={pair.bottom} label={SLOT_LABELS.bottom} />
        </div>
      </VoteCard>
    </Screen>
  );
}

/** After No: tap the block they would change. */
export function WhichStep({
  pair,
  progress,
  onPick,
}: {
  pair: Pair;
  progress: ReactNode;
  onPick: (changed: 'top' | 'bottom') => void;
}) {
  return (
    <Screen title={WHICH_BLOCK} back={MENU_BACK}>
      {progress}
      <div {...stylex.props(styles.stack)}>
        <Block hex={pair.top} onPress={() => onPick('top')} />
        <Block hex={pair.bottom} onPress={() => onPick('bottom')} />
      </div>
    </Screen>
  );
}

/**
 * The block they chose to change, beside the one that stays, and six colors
 * to swap it for. A swatch ends the question, and so do "Nothing works with
 * it" and Skip, which record why no color was chosen.
 */
export function ReplaceStep({
  pair,
  changed,
  offered,
  progress,
  onReplace,
  onNoneWorks,
  onSkip,
}: {
  pair: Pair;
  changed: 'top' | 'bottom';
  offered: readonly Hex[];
  progress: ReactNode;
  onReplace: (hex: Hex) => void;
  onNoneWorks: () => void;
  onSkip: () => void;
}) {
  const label = (slot: 'top' | 'bottom') => (slot === changed ? REPLACING : KEEPING);
  return (
    <Screen title={PICK_BETTER} back={MENU_BACK}>
      {progress}
      <div {...stylex.props(styles.stack)}>
        <Block hex={pair.top} label={label('top')} />
        <Block hex={pair.bottom} label={label('bottom')} />
      </div>
      <div role="group" aria-label={BETTER_COLORS} {...stylex.props(swatchGrid.three)}>
        {offered.map((hex) => (
          <Swatch key={hex} hex={hex} onSelect={onReplace} />
        ))}
      </div>
      <div {...stylex.props(styles.actions)}>
        <Button label={NOTHING_WORKS} variant="secondary" onClick={onNoneWorks} />
        <Button label={SKIP} variant="quiet" onClick={onSkip} />
      </div>
    </Screen>
  );
}
