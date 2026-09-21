import * as stylex from '@stylexjs/stylex';

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

  // Motion. Tokens so one prefers-reduced-motion block can zero them all,
  // instead of chasing inline transition literals across five milestones.
  colorFade: '150ms',
  hold: '450ms',
  shuffle: '200ms',
  sheet: '320ms',
  toastSlide: '200ms',
  toastDwell: '2500ms',
  toastDwellAction: '5000ms',
});
