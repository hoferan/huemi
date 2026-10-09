import { describe, expect, it } from 'vitest';
import { loadFieldDir } from './fieldFiles';
import { fieldReport, scoreFieldSet } from './fieldScore';

/**
 * The color reader measured against real garments in real light (#114).
 *
 * The frames come from the field recorder in developer mode, at `/dev/field`:
 * garments whose true colors were picked by eye in daylight, then
 * photographed in whatever light came along. They are one person's
 * recordings and stay in the gitignored `tmp/field/`, so this test skips
 * without them and CI never runs it.
 *
 * To run: export from `/dev/field` on the phone, move the `.json.gz` files
 * into `tmp/field/`, then `npx vitest run src/color/read.benchmark.test.ts`.
 * Several exports are merged by id, the newest winning, so exporting again
 * after more captures is safe.
 *
 * It prints and asserts nothing about the numbers. M10 decides which of them
 * to hold. Run it before and after changing `READ_TUNING`, and see the
 * harness's Field mode for the captures behind them.
 */
const { data } = loadFieldDir();

describe.skipIf(!data)('the color reader against the field set', () => {
  it('reads every capture with a truth', () => {
    expect(data!.captures.length).toBeGreaterThan(0);
    const { scores, skipped } = scoreFieldSet(data!);
    console.log(`\n${fieldReport(scores, skipped)}\n`);
  });
});
