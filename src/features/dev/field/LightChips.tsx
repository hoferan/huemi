import * as stylex from '@stylexjs/stylex';
import { LIGHTS, LIGHT_LABELS, type Light } from '../../../model/field';
import { tokens } from '../../../styles/tokens.stylex';
import { LIGHT_GROUP } from './copy';

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
 * The light a capture is taken in, chosen by hand. Neutral chrome, since the
 * only color on these screens belongs to the garment's truth and the frames.
 */
export function LightChips({
  value,
  onChange,
}: {
  value: Light | null;
  onChange: (light: Light) => void;
}) {
  return (
    <div role="group" aria-label={LIGHT_GROUP} {...stylex.props(styles.group)}>
      {LIGHTS.map((light) => (
        <button
          key={light}
          type="button"
          aria-pressed={value === light}
          onClick={() => onChange(light)}
          {...stylex.props(styles.chip, value === light && styles.pressed)}
        >
          {LIGHT_LABELS[light]}
        </button>
      ))}
    </div>
  );
}
