import { use, useRef } from 'react';
import { useSearchParams } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { LIGHTS, LIGHT_LABELS, type FieldCapture, type Light } from '../../../model/field';
import type { Frame } from '../../../model/frame';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import { Redirect } from '../../../ui/Redirect';
import { Screen } from '../../../ui/Screen';
import { GARMENT_CAPTURE } from '../../camera/copy';
import { CaptureScreen } from '../../camera/CaptureScreen';
import { readBuild } from '../menu/build';
import {
  BACK_TO_GARMENT,
  CAPTURE_FAILED,
  LIST_BACK,
  LIST_TITLE,
  STORE_FAILED,
  captureTitle,
  captured,
  garmentPath,
} from './copy';
import { FieldStoreContext } from './FieldStoreContext';
import { persistFieldSet } from './persist';
import { useGarment } from './useGarment';

const styles = stylex.create({
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
});

const COPY = { panels: GARMENT_CAPTURE.panels, handEntry: BACK_TO_GARMENT };

const isLight = (value: string | null): value is Light => LIGHTS.some((light) => light === value);

/**
 * Shooting a garment in one light. Every shutter press saves a capture and
 * the screen stays, ready for the next, so a sitting in one light is a run of
 * taps. A link with no garment or no known light lands on the list.
 */
export function CaptureGarment() {
  const store = use(FieldStoreContext);
  const { dispatch } = useSession();
  const [params] = useSearchParams();
  const id = params.get('id');
  const light = params.get('light');
  const state = useGarment(id);
  // Set while a save is out, so a double tap on the shutter stores one frame.
  const saving = useRef(false);

  if (!isLight(light) || state.status === 'missing') return <Redirect to="/dev/field" />;
  if (state.status === 'error') {
    return (
      <Screen title={LIST_TITLE} back={LIST_BACK}>
        <p {...stylex.props(styles.text)}>{STORE_FAILED}</p>
      </Screen>
    );
  }
  if (state.status === 'loading')
    return (
      <Screen title={LIST_TITLE} back={LIST_BACK}>
        {null}
      </Screen>
    );

  const { garment } = state;
  const back = { to: garmentPath(garment.id), title: garment.label };

  async function onFrame({ pixels }: Frame, lowLight: boolean | null) {
    if (saving.current || !isLight(light)) return;
    saving.current = true;
    persistFieldSet();
    const capture: FieldCapture = {
      id: crypto.randomUUID(),
      source: 'kit',
      garmentId: garment.id,
      settled: null,
      light,
      lowLight,
      width: pixels.width,
      height: pixels.height,
      takenAt: new Date().toISOString(),
      build: readBuild().commit,
    };
    const saved = await store.saveCapture(capture, pixels);
    saving.current = false;
    dispatch({
      type: 'toastShown',
      message: saved.ok ? captured(LIGHT_LABELS[light]) : CAPTURE_FAILED,
    });
  }

  return (
    <CaptureScreen
      title={captureTitle(garment.label)}
      back={back}
      guide="garment"
      copy={COPY}
      handEntry={back.to}
      onFrame={(frame, lowLight) => void onFrame(frame, lowLight)}
    />
  );
}
