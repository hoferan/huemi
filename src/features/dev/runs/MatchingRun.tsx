import { use, useReducer, useRef, useState } from 'react';
import type { PairVote } from '../../../model/field';
import type { Hex } from '../../../model/hex';
import { useSession } from '../../../session/useSession';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { MENU_BACK } from '../field/copy';
import { ExportButton } from '../field/ExportButton';
import { FieldStoreContext } from '../field/FieldStoreContext';
import { persistFieldSet } from '../field/persist';
import { readBuild } from '../menu/build';
import { MATCHING_TITLE, UNDO, UNDO_FAILED, VOTE_FAILED, matchingHeadline } from './copy';
import { matchingRun, type MatchingAction } from './matchingRunState';
import { PairVoteStep, ReplaceStep, WhichStep } from './MatchingSteps';
import { drawPairs, replacementOptions, type Pair } from './pairs';
import { RunProgress } from './RunProgress';
import { RunSetup } from './RunSetup';
import { RunSummary } from './RunSummary';

/** What a vote says about the change, as each way of answering fills it in. */
type Answer = Pick<PairVote, 'liked' | 'changed' | 'replacement' | 'offered' | 'noneWorks'>;

const LIKED: Answer = {
  liked: true,
  changed: null,
  replacement: null,
  offered: [],
  noneWorks: false,
};

/**
 * The matching run: a length, then top and bottom colors shown together, each
 * with the question whether the person would wear them. After No they tap
 * the block they would change and pick a better color for it from six. Each
 * answer is a vote in the field set. There is no camera, so there is no light
 * to ask for.
 *
 * `random` is what the run draws its pairs and its swatches with, so a test
 * can know them. The run's counter lives only here, so leaving and coming
 * back starts a new run while every vote saved so far stays in the set.
 */
export function MatchingRun({ random = Math.random }: { random?: () => number }) {
  const store = use(FieldStoreContext);
  const { dispatch: session } = useSession();
  const [state, dispatch] = useReducer(matchingRun, { step: 'setup' });
  // Set while a save or an undo is out. A double tap then stores one vote,
  // and nothing moves the run on until the store has answered.
  const busy = useRef(false);
  // True while the summary's export is building its file, which reads the set
  // and would fail if an undo changed it then.
  const [exporting, setExporting] = useState(false);

  const toast = (message: string) => session({ type: 'toastShown', message });
  // A step's own moves wait for the store too: a No tapped while a Yes is
  // saving would open the question of which block just as the Yes moves on.
  const move = (action: MatchingAction) => {
    if (!busy.current) dispatch(action);
  };

  if (state.step === 'setup') {
    return (
      <Screen title={MATCHING_TITLE} back={MENU_BACK}>
        <RunSetup
          withLight={false}
          onStart={({ length }) => dispatch({ type: 'start', pairs: drawPairs(length, random) })}
        />
      </Screen>
    );
  }

  const { pairs, votes } = state;
  const pair = pairs[votes.length];
  const progress = <RunProgress index={votes.length} length={pairs.length} light={null} />;

  // `voted` goes out only once the vote is stored, so the run never counts an
  // answer the set does not have.
  async function save(asked: Pair, answer: Answer) {
    if (busy.current) return;
    busy.current = true;
    persistFieldSet();
    const vote: PairVote = {
      id: crypto.randomUUID(),
      takenAt: new Date().toISOString(),
      build: readBuild().commit,
      top: asked.top,
      bottom: asked.bottom,
      ...answer,
    };
    const saved = await store.saveVote(vote);
    busy.current = false;
    if (!saved.ok) {
      toast(VOTE_FAILED);
      return;
    }
    dispatch({ type: 'voted', vote });
  }

  // Deletes the last vote first, so the set never keeps an answer the run has
  // taken back.
  async function undo() {
    const last = votes.at(-1);
    if (busy.current || !last) return;
    busy.current = true;
    const removed = await store.deleteVote(last.id);
    busy.current = false;
    if (!removed.ok) {
      toast(UNDO_FAILED);
      return;
    }
    dispatch({ type: 'undo' });
  }

  // Each step is keyed by its place in the run, so its screen mounts afresh
  // and its heading takes focus, the way a navigation would move it.
  const key = `${state.step}-${votes.length}`;

  switch (state.step) {
    case 'vote':
      return (
        <PairVoteStep
          key={key}
          pair={pair!}
          progress={progress}
          undo={
            votes.length > 0 && <Button label={UNDO} variant="quiet" onClick={() => void undo()} />
          }
          onAnswer={(yes) => {
            if (yes) void save(pair!, LIKED);
            else move({ type: 'no' });
          }}
        />
      );
    case 'which':
      return (
        <WhichStep
          key={key}
          pair={pair!}
          progress={progress}
          onPick={(changed) => {
            // The block that stays decides what the swatches suit, and the
            // one that goes is kept out of them.
            const keptSlot = changed === 'top' ? 'bottom' : 'top';
            move({
              type: 'pick',
              changed,
              offered: replacementOptions(pair![keptSlot], keptSlot, pair![changed], random),
            });
          }}
        />
      );
    case 'replace': {
      const { changed, offered } = state;
      const no = { liked: false, changed, offered };
      return (
        <ReplaceStep
          key={key}
          pair={pair!}
          changed={changed}
          offered={offered}
          progress={progress}
          onReplace={(hex: Hex) => void save(pair!, { ...no, replacement: hex, noneWorks: false })}
          onNoneWorks={() => void save(pair!, { ...no, replacement: null, noneWorks: true })}
          onSkip={() => void save(pair!, { ...no, replacement: null, noneWorks: false })}
        />
      );
    }
    case 'summary': {
      const liked = votes.filter((vote) => vote.liked).length;
      return (
        <Screen key={key} title={MATCHING_TITLE} back={MENU_BACK}>
          <RunSummary
            headline={matchingHeadline(liked, pairs.length)}
            exportControl={<ExportButton onPreparing={setExporting} />}
            onAgain={() => move({ type: 'again' })}
            onUndo={() => void undo()}
            held={exporting}
          />
        </Screen>
      );
    }
  }
}
