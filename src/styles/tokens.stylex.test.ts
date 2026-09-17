import { describe, expect, it } from 'vitest';
import { FG_DARK, FG_LIGHT } from '../color/contrast';
import { parseHex } from '../model/hex';
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
