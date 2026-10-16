import { use, useReducer, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { LIGHT_LABELS, type FieldCapture, type Verdict } from '../../../model/field';
import type { Hex } from '../../../model/hex';
import { useSession } from '../../../session/useSession';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { CaptureScreen } from '../../camera/CaptureScreen';
import { CAPTURE_FAILED, MENU_BACK } from '../field/copy';
import { ExportButton } from '../field/ExportButton';
import { FieldStoreContext } from '../field/FieldStoreContext';
import { persistFieldSet } from '../field/persist';
import { readBuild } from '../menu/build';
import {
  POINT_AT_PLAIN,
  READING_TITLE,
  RUN_CAMERA_PANELS,
  UNDO,
  UNDO_FAILED,
  readingHeadline,
} from './copy';
import { CorrectStep, Misses, SlidersStep, VoteStep } from './ReadingSteps';
import { readingRun, shotOf, type ReadingAction, type Shot } from './readingRunState';
import { RunProgress } from './RunProgress';
import { RunSetup } from './RunSetup';
import { RunSummary } from './RunSummary';

const styles = stylex.create({
  header: { display: 'flex', flexDirection: 'column', gap: '8px' },
});

// The run has no hand entry, so `CaptureScreen` is told to hide the link and
// its label is never shown.
const CAMERA_COPY = { panels: RUN_CAMERA_PANELS, handEntry: '' };

/**
 * The reading run: a length and a light, then a plain garment photographed
 * again and again, each time saying whether the color the reader read is its
 * color, and correcting it when it is not. Each answer is a capture in the
 * field set, with `source: 'run'` and the person's verdict.
 *
 * The run's counter lives only here, so leaving and coming back starts a new
 * run while every capture saved so far stays in the set.
 */
export function ReadingRun() {
  const store = use(FieldStoreContext);
  const { dispatch: session } = useSession();
  const [state, dispatch] = useReducer(readingRun, { step: 'setup' });
  // Set while a save or an undo is out. A double tap then stores one answer,
  // and nothing moves the run on until the store has answered.
  const busy = useRef(false);

  const toast = (message: string) => session({ type: 'toastShown', message });
  // A step's own moves wait for the store too: a No tapped while a Yes is
  // saving would open the correction just as the saved Yes moves the run on.
  const move = (action: ReadingAction) => {
    if (!busy.current) dispatch(action);
  };

  if (state.step === 'setup') {
    return (
      <Screen title={READING_TITLE} back={MENU_BACK}>
        <RunSetup
          withLight
          onStart={({ length, light }) => {
            // `withLight` holds Start back until a light is chosen.
            if (light) dispatch({ type: 'start', length, light });
          }}
        />
      </Screen>
    );
  }

  const { length, light, answers } = state;
  const progress = <RunProgress index={answers.length} length={length} light={light} />;

  // `answered` goes out only once the capture is stored, so the run never
  // counts an answer the set does not have.
  async function save(shot: Shot, verdict: Verdict, truth: Hex | null) {
    if (busy.current) return;
    busy.current = true;
    persistFieldSet();
    const capture: FieldCapture = {
      id: crypto.randomUUID(),
      source: 'run',
      garmentId: null,
      settled: truth,
      light,
      lowLight: shot.lowLight,
      width: shot.pixels.width,
      height: shot.pixels.height,
      takenAt: new Date().toISOString(),
      build: readBuild().commit,
      verdict,
    };
    const saved = await store.saveCapture(capture, shot.pixels);
    busy.current = false;
    if (!saved.ok) {
      toast(CAPTURE_FAILED);
      return;
    }
    dispatch({ type: 'answered', answer: { captureId: capture.id, verdict, truth, shot } });
  }

  // Deletes the last answer's capture first, so the set never keeps an
  // answer the run has taken back.
  async function undo() {
    const last = answers.at(-1);
    if (busy.current || !last) return;
    busy.current = true;
    const removed = await store.deleteCapture(last.captureId);
    busy.current = false;
    if (!removed.ok) {
      toast(UNDO_FAILED);
      return;
    }
    dispatch({ type: 'undo' });
  }

  const undoButton = answers.length > 0 && (
    <Button label={UNDO} variant="quiet" onClick={() => void undo()} />
  );

  // Each step is keyed by its place in the run, so its screen mounts afresh
  // and its heading takes focus, the way a navigation would move it.
  const key = `${state.step}-${answers.length}`;

  switch (state.step) {
    case 'capture':
      return (
        <CaptureScreen
          key={key}
          title={POINT_AT_PLAIN}
          back={MENU_BACK}
          guide="garment"
          copy={CAMERA_COPY}
          handEntry={MENU_BACK.to}
          header={
            <div {...stylex.props(styles.header)}>
              {progress}
              {undoButton}
            </div>
          }
          offerPhoto={false}
          offerHandEntry={false}
          onFrame={(frame, lowLight) => {
            // Not while an undo is out, which would land on the new shot.
            move({ type: 'shot', shot: shotOf(frame.pixels, lowLight) });
          }}
        />
      );
    case 'vote':
      return (
        <VoteStep
          key={key}
          shot={state.shot}
          progress={progress}
          onYes={() => {
            move({ type: 'yes' });
            void save(state.shot, 'right', state.shot.shown);
          }}
          onNo={() => move({ type: 'no' })}
        />
      );
    case 'correct':
      return (
        <CorrectStep
          key={key}
          shot={state.shot}
          progress={progress}
          onUse={(hex) => void save(state.shot, 'corrected', hex)}
          onNoneOfThese={() => move({ type: 'noneOfThese' })}
          onSkip={() => void save(state.shot, 'missed', null)}
          onBack={() => move({ type: 'back' })}
        />
      );
    case 'sliders':
      return (
        <SlidersStep
          key={key}
          shot={state.shot}
          progress={progress}
          onUse={(hex) => void save(state.shot, 'corrected', hex)}
          onSkip={() => void save(state.shot, 'missed', null)}
        />
      );
    case 'summary': {
      const right = answers.filter((answer) => answer.verdict === 'right').length;
      return (
        <Screen key={key} title={READING_TITLE} back={MENU_BACK}>
          <RunSummary
            headline={readingHeadline(right, length, LIGHT_LABELS[light])}
            exportControl={<ExportButton />}
            onAgain={() => move({ type: 'again' })}
            onUndo={() => void undo()}
          >
            <Misses answers={answers} />
          </RunSummary>
        </Screen>
      );
    }
  }
}
