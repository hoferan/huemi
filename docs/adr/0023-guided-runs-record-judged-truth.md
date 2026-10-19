# 0023. Guided runs record judged truth

Status: Accepted, 2026-10-16. Amends ADR 0020 for run captures and pair votes.

## Context

The field recorder (ADR 0020) asks for a garment list, labels, a daylight matching
step and a light chosen per garment. Nobody could tell what to do with it, and no
field set has been recorded with it yet. The two guesses huemi makes, the color the
reader sees and the colors the engine pairs, both need more judged examples than that
tool was getting.

Two guided runs replace the chore with one question per screen. The reading run
photographs a plain garment and asks whether the color the reader read is its color.
The matching run shows two colors and asks whether the person would wear them
together. Each answer is a record the PC-side benchmarks can score against.

ADR 0020 fixes a garment's truth by eye in daylight, before the garment is
photographed in harder light. A run cannot do that. It has the garment in front of
it, in the light it is in.

## Decision

**Run captures are a new kind of capture.** A reading-run capture is a `FieldCapture`
with `source: 'run'`, no garment, and a `verdict` of `right`, `corrected` or `missed`.
`settled` holds the truth: the reading itself after Yes, the color picked after No,
and null for a skip. Run captures sit in the same `huemi-field` set, so there is one
store, one export and one place in the harness. The field list shows them as a count
with one "Delete run captures" action, not under "From normal use", because they need
no linking.

**The truth is judged in the same light, after seeing the reading.** The person
looks at the garment under the lamp and says whether the shown color is its color.
That is weaker than daylight truth in two ways. An eye adjusts to a lamp and the
sensor does not, though what the eye sees is what huemi should report. Showing the
reading first also anchors the answer, and someone unsure tends to say Yes. So the
reports keep the two apart: run captures are truth source `'judged'`, never mixed
into `'kit'`, and the anchoring bias stays out of the daylight numbers. `verdict` is
reported beside the distance from truth as the first-try rate at the capture's
build, which tuning cannot move. The judged table also counts the wrong readings and
the share of them the low-light warning or an unclear reading flagged, but has no
one-or-several column, because a run photographs plain garments.

**`'missed'` captures are kept.** Skip means "I can't say". The garments people skip
are the reader's worst cases, so dropping them would make the reader look better than
it is. A missed capture has no truth to measure against, so the benchmark counts it
as a miss in the first-try figure and does not score it. A No followed by
"Use this color" on a color equal to the rejected reading saves nothing and says
"Pick a closer color, or skip.": a correction equal to the rejected reading tells
nothing.

**Pair votes live in a `votes` store in `huemi-field`, at database version 2.** A
`PairVote` holds the id, time, build, the two colors, whether they were liked, which
block was changed, the replacement, the six swatches offered and whether none
worked. `onupgradeneeded` creates the store only when `oldVersion < 2`, so a version 1
database keeps its stores and gains the new one. A vote has no frame, so it takes a
few hundred bytes. Each record stands alone, so sending votes to a server later
would add a step and leave the record as it is.

**Export format version 2 still reads version 1.** The file gains `source: 'run'`,
the optional `verdict` and a top-level `votes` array. `decodeFieldExport` reads
version 1 files as version 2 with no votes, and `mergeFieldExports` keeps the newest
export of each set and unions votes by id, as it does captures.

**Pairs are drawn stratified by the engine's own rating.** Drawn uniformly, most pairs
would be ones the engine already rates low. Each run takes a third from the top third
of `rate(top, bottom, 'bottom', 'top')`, a third from the middle and a third from the
bottom, excludes identical and near-duplicate colors, and shuffles. The screen never
shows the rating. The votes that matter are the ones where person and engine
disagree, and those only appear if both kinds of pair are shown.

**Replacement options mix engine picks with random ones.** The six swatches are three
of the engine's best for that slot against the block that stays and three random
palette colors, none a near-duplicate of either block, shuffled together. Offering
only the engine's favorites would make every swap look like agreement.

**Undo deletes the last answer.** Every export is a whole-set snapshot, so a wrong
answer left in the store would stay in every file. Undo deletes that capture or vote
and returns to its question. Stopping a run early keeps everything saved so far, and
the run's counter is not kept.

**Both benchmarks use one tie-correct AUC.** `aucByRank` in `src/color/voteScore.ts`
ranks by average rank, so tied scores count half. The vote benchmark and
`engine.benchmark.test.ts` both use it. It moved the Polyvore dress-outfit
compatibility AUC from 0.577 to 0.586. The engine did not change; the measure did.

## Consequences

Run data and kit data answer different questions. Daylight truth measures the reader
against the developer's eye in good light. Judged truth measures it against the
developer's eye in the light the photo was taken in, with the reading in view. Read
the two tables separately, and treat a high judged first-try rate as an upper bound.

The runs add a second kind of record to the set the export has to carry, and the file
grows with votes as well as frames. The database and the format are contracts with
files already on the developer's PC, as ADR 0020 says: the next change needs version
3 and a reader that still accepts versions 1 and 2.

The real IndexedDB paths for votes and run captures are covered by
`e2e/features/runs.feature`, since the adapter is outside unit coverage and the vote
card's colors are StyleX, which emits no CSS under Vitest (ADR 0002).

Locking developer mode leaves runs' data where it is, as it does the rest of the
field set. The two deletes on the field list are the only way to clear it short of
clearing site data.

After the version 2 upgrade, a tab still running an older build gets a `VersionError`
opening the field database at version 1, and the field list shows its error state until
the tab is reloaded.
