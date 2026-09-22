import * as stylex from '@stylexjs/stylex';

/**
 * Durations a timer has to agree with, not only a transition.
 *
 * `defineConsts` inlines its values at compile time, so the same literal
 * reaches `tokens.shuffle` below and the `setTimeout` in
 * `src/features/suggest/Suggestions.tsx`. Neither can be edited without the
 * other now, which is the point: the flag that triggers the crossfade and the
 * crossfade itself have to last the same time. A plain `export const` cannot
 * live in a `.stylex` file, and a value imported from elsewhere is not
 * statically evaluable inside `defineVars`, so this is the one way to share it.
 */
export const durations = stylex.defineConsts({
  shuffle: '200ms',
});

export const tokens = stylex.defineVars({
  // Surface
  bg: '#d8d5cf',
  surface: '#cbc7c0',
  line: 'rgba(0, 0, 0, 0.2)',

  // Text
  ink: '#151413',
  ink2: '#4a4845',

  // Inverse
  dark: '#1c1b1a',
  darkFg: '#f3f1ee',

  // Action — same values as dark/darkFg today, but distinct roles.
  primary: '#1c1b1a',
  primaryFg: '#f3f1ee',
  destructive: '#a3231f',

  // Foreground pair. This is a contrast contract, not two literals:
  // total 4.5:1 coverage, worst case 4.58:1 at luminance 0.179.
  fgDark: '#000000',
  fgLight: '#ffffff',

  // Overlay
  scrim: 'rgba(32, 30, 29, 0.45)',
  shadowSheet: '0 12px 32px rgba(0, 0, 0, 0.25)',

  // Shape
  radius: '14px',
  radiusMedia: '10px',
  frameRadius: '44px',
  touchTarget: '44px',

  // Type — two roles, identical in the Studio prototype but genuinely
  // different families in Flow. Keep them separate.
  fontHeading: '"Outfit Variable", system-ui, sans-serif',
  fontBody: '"Outfit Variable", system-ui, sans-serif',

  // Type scale. rem, never px: a px scale does not respond to the browser's
  // text size setting, which would make the 200% reachability check in
  // e2e/invariants.spec.ts pass over a screen no one could actually read.
  textHeading: '1.5rem',
  textBody: '1rem',

  // Motion. Conditional values rather than one media block elsewhere: the
  // condition travels with the token, so a transition that reaches for
  // `colorFade` cannot forget to opt out of it.
  //
  // Only animation durations gate. `hold` is an input timing — the long-press
  // threshold — and zeroing it would fire the press on touch. The dwell times
  // are how long a message stays on screen; zeroing those would take the
  // message away before it could be read.
  colorFade: { default: '150ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
  hold: '450ms',
  shuffle: { default: durations.shuffle, '@media (prefers-reduced-motion: reduce)': '0ms' },
  sheet: { default: '320ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
  toastSlide: { default: '200ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
  toastDwell: '2500ms',
  toastDwellAction: '5000ms',
});
