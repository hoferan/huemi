import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';

const styles = stylex.create({
  // Shares the start screen's height with the other way in, from the touch
  // target up to 320px, so the choice is the screen's content instead of two
  // bars under an empty page. Text and icon sit at the bottom, near the thumb.
  card: {
    flex: '1 1 0',
    minHeight: tokens.touchTarget,
    maxHeight: '320px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: '4px',
    padding: '16px',
    borderRadius: tokens.radius,
    fontFamily: tokens.fontBody,
    textAlign: 'start',
    cursor: 'pointer',
  },
  primary: {
    backgroundColor: tokens.primary,
    color: tokens.primaryFg,
    borderStyle: 'none',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: tokens.ink,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
  },
  label: { fontFamily: tokens.fontHeading, fontSize: '1.25rem' },
  note: { fontSize: tokens.textBody },
  notePrimary: { color: tokens.primaryFg },
  noteSecondary: { color: tokens.ink2 },
});

/**
 * One of the start screen's two ways into suggestions: a large button with an
 * icon, its name, and a line on when to use it.
 *
 * The line is the button's description rather than part of its name, so
 * speech input and a screen reader still get "Take a photo", and the line is
 * read after it. Labelled by the label alone for that reason: a button's name
 * otherwise comes from all of its text.
 */
export function WayIn({
  icon: Icon,
  label,
  note,
  variant = 'primary',
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  note: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}) {
  const id = useId();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-note`}
      {...stylex.props(styles.card, variant === 'primary' ? styles.primary : styles.secondary)}
    >
      <Icon size={28} aria-hidden="true" />
      <span id={`${id}-label`} {...stylex.props(styles.label)}>
        {label}
      </span>
      <span
        id={`${id}-note`}
        {...stylex.props(
          styles.note,
          variant === 'primary' ? styles.notePrimary : styles.noteSecondary,
        )}
      >
        {note}
      </span>
    </button>
  );
}
