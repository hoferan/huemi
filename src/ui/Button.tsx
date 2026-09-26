import type { Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

const styles = stylex.create({
  button: {
    backgroundColor: tokens.primary,
    color: tokens.primaryFg,
    borderStyle: 'none',
    borderRadius: tokens.radius,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    // The token, never a repeated literal: A11Y.md carries this as an
    // invariant, and a literal is how it stops being one.
    minHeight: tokens.touchTarget,
    paddingBlock: '12px',
    paddingInline: '20px',
    width: '100%',
    cursor: 'pointer',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: tokens.ink,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
  },
  // For a way in that is not the screen's main job: no fill and no border, so
  // it reads as secondary to the buttons above it, with the same touch target.
  quiet: {
    backgroundColor: 'transparent',
    color: tokens.ink,
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px',
  },
});

/**
 * A call to action. A screen has one primary, and may have secondaries beside
 * it: the confirm screen's "Not quite", the entry screen's "Pick a color". A
 * quiet one is a way in that is not the screen's main job, like the entry
 * screen's link to the outfit check.
 *
 * `type="button"` explicitly: the default inside a form is `submit`, and a
 * screen that later grows a form would start navigating on Enter with no
 * change to this file.
 */
export function Button({
  label,
  onClick,
  variant = 'primary',
  expanded,
  controls,
  ref,
}: {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  expanded?: boolean;
  controls?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      {...stylex.props(
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'quiet' && styles.quiet,
      )}
    >
      {label}
    </button>
  );
}
