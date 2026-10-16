import { describe, expect, it } from 'vitest';
import { loadFieldDir } from './fieldFiles';
import { voteReport } from './voteScore';

/**
 * The matching engine measured against yes/no votes on color pairs.
 *
 * The votes come from the guided matching run in developer mode, at
 * `/dev/runs/matching`: pairs of colors shown as a top and a bottom, each
 * liked or not, with the color the voter swapped in when they changed one.
 * They are one person's taste and stay in the gitignored `tmp/field/`, so
 * this test skips without them and CI never runs it.
 *
 * To run: export from `/dev/field` on the phone, move the `.json.gz` files
 * into `tmp/field/`, then `npx vitest run src/color/vote.benchmark.test.ts`.
 * Several exports are merged by id, so exporting again after more votes is
 * safe.
 *
 * It prints and asserts nothing about the numbers. Run it before and after
 * changing `TUNING`.
 */
const { data } = loadFieldDir();

describe.skipIf(!data || !data.votes.length)('the engine against pair votes', () => {
  it('scores every vote', () => {
    expect(data!.votes.length).toBeGreaterThan(0);
    console.log(`\n${voteReport(data!.votes)}\n`);
  });
});
