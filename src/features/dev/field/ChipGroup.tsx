import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../../styles/tokens.stylex';

const styles = stylex.create({
  group: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    paddingInline: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
    backgroundColor: 'transparent',
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    cursor: 'pointer',
  },
  pressed: { backgroundColor: tokens.ink, borderColor: tokens.ink, color: tokens.bg },
});

/**
 * One choice from a short list, as a row of chips. Neutral chrome, since the
 * only color on the field screens belongs to the garment's truth and the
 * frames. The light and the length of a run both use it, so they look alike.
 */
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} {...stylex.props(styles.group)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          {...stylex.props(styles.chip, value === option.value && styles.pressed)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
