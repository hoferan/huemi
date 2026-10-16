import { use, useReducer } from 'react';
import * as stylex from '@stylexjs/stylex';
import { LIGHT_LABELS, type FieldCapture, type Verdict } from '../../../model/field';
import type { Hex } from '../../../model/hex';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { CaptureScreen } from '../../camera/CaptureScreen';
import { CAPTURE_FAILED, MENU_BACK } from '../field/copy';
import { ExportButton } from '../field/ExportButton';
import { FieldStoreContext } from '../field/FieldStoreContext';
import { persistFieldSet } from '../field/persist';
import { readBuild } from '../menu/build';
import { POINT_AT_PLAIN, READING_TITLE, RUN_CAMERA_PANELS, UNDO, readingHeadline } from './copy';
import { CorrectStep, Misses, SlidersStep, VoteStep } from './ReadingSteps';
import { readingRun, shotOf, type Shot } from './readingRunState';
import { RunProgress } from './RunProgress';
import { RunSetup } from './RunSetup';
import { RunSummary } from './RunSummary';
import { useRunGuard } from './useRunGuard';

const styles = stylex.create({
  header: { display: 'flex', flexDirection: 'column', gap: '8px' },
});

// The run has no hand entry, so the camera's words are its panels alone.
const CAMERA_COPY = { panels: RUN_CAMERA_PANELS };

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
  const [state, dispatch] = useReducer(readingRun, { step: 'setup' });
  // The guard that keeps one save or undo out at a time, and the export flag.
  // The export reads the captures one at a time, so an undo landing then would
  // fail it, as a delete does on the field list.
  const { move, save: attempt, undo: attemptUndo, exporting, setExporting } = useRunGuard(dispatch);

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
  function save(shot: Shot, verdict: Verdict, truth: Hex | null) {
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
    return attempt(
      () => {
        persistFieldSet();
        return store.saveCapture(capture, shot.pixels);
      },
      () => dispatch({ type: 'answered', answer: { captureId: capture.id, verdict, truth, shot } }),
      CAPTURE_FAILED,
    );
  }

  function undo() {
    const last = answers.at(-1);
    if (!last) return;
    return attemptUndo(
      () => store.deleteCapture(last.captureId),
      () => dispatch({ type: 'undo' }),
    );
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
          onBack={() => move({ type: 'back' })}
        />
      );
    case 'summary': {
      const right = answers.filter((answer) => answer.verdict === 'right').length;
      return (
        <Screen key={key} title={READING_TITLE} back={MENU_BACK}>
          <RunSummary
            headline={readingHeadline(right, length, LIGHT_LABELS[light])}
            exportControl={<ExportButton onPreparing={setExporting} />}
            onAgain={() => move({ type: 'again' })}
            onUndo={() => void undo()}
            held={exporting}
          >
            <Misses answers={answers} />
          </RunSummary>
        </Screen>
      );
    }
  }
}
