import { describe, expect, it } from 'vitest';
import { FG_DARK, FG_LIGHT } from '../color/contrast';
import { parseHex } from '../model/hex';
import { durations } from './tokens.stylex';
// Raw text, not the compiled module: StyleX's Vite plugin turns
// `defineVars` values into CSS custom-property references
// (`var(--x11iydtm)`), even under Vitest, so importing `tokens` normally
// never yields the literal hex. `?raw` sidesteps the transform and reads
// the source file as written, which is how the test below gets at the
// literal.
//
// This file lives here rather than in contrast.test.ts because
// `import-x/no-restricted-paths` forbids `src/color` from importing
// anything under `src/styles`, in test files too: color depends only on
// model, by design. Placing the coupling test beside the tokens instead
// keeps that boundary intact.
import tokensSource from './tokens.stylex.ts?raw';

describe('fgDark/fgLight vs contrast.ts', () => {
  // ADR 0004 holds the foreground pair's contrast contract as these tokens,
  // but readableForeground (src/color/contrast.ts) reads its own
  // FG_DARK/FG_LIGHT constants, not tokens.fgDark/fgLight, and nothing else
  // ties the two together. The 3,168-sample sweep in contrast.test.ts only
  // exercises those constants, so it would keep passing even if fgDark
  // drifted to a value ADR 0004 rejects, such as `#141414`.
  it('keeps the fgDark/fgLight token literals equal to the constants contrast.ts verifies against', () => {
    const fgDark = /fgDark:\s*'(#[0-9a-fA-F]{6})'/.exec(tokensSource)?.[1];
    const fgLight = /fgLight:\s*'(#[0-9a-fA-F]{6})'/.exec(tokensSource)?.[1];
    expect(fgDark && parseHex(fgDark)).toBe(FG_DARK);
    expect(fgLight && parseHex(fgLight)).toBe(FG_LIGHT);
  });
});

describe('durations', () => {
  // Unlike defineVars, defineConsts inlines its literal, so this reads the
  // real value rather than a var() reference. Suggestions.tsx parses it into
  // the shuffle timer's milliseconds, which only works while it is written in
  // whole milliseconds: '0.2s' would parse to 0 and end the crossfade flag on
  // the next tick.
  it('writes every duration in whole milliseconds', () => {
    for (const value of Object.values(durations)) {
      expect(value).toMatch(/^\d+ms$/);
    }
  });

  // The handoff notes' dwell times. They are constants because a timer reads
  // them, and a constant cannot carry a reduced-motion condition at all, which
  // is what keeps the toast readable under that preference.
  it('holds the toast dwell times from the handoff notes', () => {
    expect(durations.toastDwell).toBe('2500ms');
    expect(durations.toastDwellAction).toBe('5000ms');
  });
});

describe('motion tokens under prefers-reduced-motion', () => {
  // Animation durations go to zero. Read from the source text rather than the
  // compiled module for the same reason the test above does: StyleX rewrites
  // defineVars values into var() references even under Vitest.
  const CONDITIONAL = ['colorFade', 'shuffle', 'sheet', 'toastSlide'];

  // These must NOT gate. `hold` is the long-press threshold: zeroing it fires
  // the press instantly. The dwell times are how long a message stays
  // readable: zeroing them makes toasts vanish before they can be read, which
  // is an accessibility regression wearing an accessibility feature's clothes.
  const UNCONDITIONAL = ['hold'];

  it.each(CONDITIONAL)('zeroes %s under reduced motion', (name) => {
    const block = new RegExp(`${name}:\\s*\\{([^}]*)\\}`).exec(tokensSource)?.[1];
    expect(block, `${name} should be a conditional value`).toBeDefined();
    expect(block).toContain('prefers-reduced-motion: reduce');
    expect(block).toMatch(/'0ms'/);
  });

  it.each(UNCONDITIONAL)('leaves %s alone under reduced motion', (name) => {
    // The whole line, and the value asserted for the shape it must have. An
    // earlier version captured up to the first comma and asked only that the
    // capture not mention the media query, which the regression it guards
    // walks straight through: `toastDwell: { default: '2500ms', '@media ...' }`
    // captures `{ default: '2500ms'` and passes both ways.
    const value = new RegExp(`^\\s*${name}:\\s*(.*)$`, 'm').exec(tokensSource)?.[1];
    expect(value, `${name} should be present in the token source`).toBeDefined();
    expect(value?.trim()).toMatch(/^'\d+ms',?$/);
  });
});
