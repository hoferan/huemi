import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';
import { RadioGroup } from 'radix-ui';
import { SLOT_LABELS } from '../../model/types';
import { tokens } from '../../styles/tokens.stylex';
import { BODY_CHOICE, TOP_AND_BOTTOM } from './copy';

const styles = stylex.create({
  // The Pieces sheet's row, so the two radios sit in its list as rows of it.
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    minHeight: tokens.touchTarget,
    paddingBlock: '6px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.line,
  },
  label: { flexGrow: 1, fontSize: '1rem', color: tokens.ink, cursor: 'pointer' },
  // The radios follow the sheet's switch: the root is the whole 44px target,
  // and the ring is ink2 so an unchosen radio keeps the 3:1 its edge needs.
  radio: {
    position: 'relative',
    flexShrink: 0,
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    padding: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outlineColor: tokens.ink,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '2px',
    outlineOffset: '2px',
    borderRadius: '50%',
  },
  ring: {
    position: 'absolute',
    inset: '10px',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
  },
  ringOn: { borderColor: tokens.ink },
  ringOff: { borderColor: tokens.ink2 },
  dot: {
    position: 'absolute',
    inset: '16px',
    borderRadius: '50%',
    backgroundColor: tokens.ink,
  },
});

/** The two answers, top and bottom first as huemi starts. */
const ANSWERS: readonly { value: 'separates' | 'dress'; label: string }[] = [
  { value: 'separates', label: TOP_AND_BOTTOM },
  { value: 'dress', label: SLOT_LABELS.dress },
];

/**
 * Top and bottom, or a dress (#136): two radios, one row each. The Pieces
 * sheet asks it of an outfit being built, and the check's list of an outfit
 * being worn (#137).
 */
export function BodyChoice({
  dress,
  onChange,
}: {
  dress: boolean;
  onChange: (dress: boolean) => void;
}) {
  const id = useId();
  const chosen = dress ? 'dress' : 'separates';
  return (
    <RadioGroup.Root
      aria-label={BODY_CHOICE}
      value={chosen}
      onValueChange={(value) => onChange(value === 'dress')}
    >
      {ANSWERS.map(({ value, label }) => (
        <div key={value} {...stylex.props(styles.row)}>
          <label htmlFor={`${id}-${value}`} {...stylex.props(styles.label)}>
            {label}
          </label>
          <RadioGroup.Item id={`${id}-${value}`} value={value} {...stylex.props(styles.radio)}>
            <span
              aria-hidden="true"
              {...stylex.props(styles.ring, value === chosen ? styles.ringOn : styles.ringOff)}
            />
            <RadioGroup.Indicator {...stylex.props(styles.dot)} />
          </RadioGroup.Item>
        </div>
      ))}
    </RadioGroup.Root>
  );
}
