import { use, useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { LIGHTS, type FieldCapture, type Light } from '../../../model/field';
import type { Hex } from '../../../model/hex';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import type { DevSlots } from '../../../ui/devSlots';
import { clearOfToasts } from '../../../ui/toastClearance';
import { readBuild } from '../menu/build';
import { CAPTURE_FAILED, CAPTURE_RECORDED, RECORD } from './copy';
import { FieldStoreContext } from './FieldStoreContext';
import { LightChips } from './LightChips';

const KEY = 'huemi.field.recording';

type Recording = { on: boolean; light: Light };

const OFF: Recording = { on: false, light: 'other' };

// Read and written straight from here rather than through a storage port:
// it is a developer's switch, and losing it costs one tap. Anything that
// cannot be read back starts off.
function load(): Recording {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return OFF;
    const value = JSON.parse(raw) as Partial<Recording>;
    const light = LIGHTS.find((known) => known === value.light) ?? OFF.light;
    return { on: value.on === true, light };
  } catch {
    return OFF;
  }
}

function keep(recording: Recording) {
  try {
    localStorage.setItem(KEY, JSON.stringify(recording));
  } catch {
    // Private mode, say. The switch still works until the page goes.
  }
}

const styles = stylex.create({
  control: { display: 'flex', flexDirection: 'column', gap: '12px' },
  // LightChips' chip, so the toggle reads as part of the same kit.
  toggle: {
    alignSelf: 'flex-start',
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    paddingInline: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
    backgroundColor: 'transparent',
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    cursor: 'pointer',
  },
  pressed: { backgroundColor: tokens.ink, borderColor: tokens.ink, color: tokens.bg },
});

/**
 * Records what the camera saw each time the user settles on a color in
 * normal use. Fills the confirm screen's `confirm.actions` slot. The capture
 * has no garment yet; the field recorder's list offers to link it to one.
 *
 * The save is not awaited: the confirm screen has moved on to suggestions by
 * the time it lands, and the toast finds the user there.
 */
export function RecordControl({ frame, lowLight, onSettle }: DevSlots['confirm.actions']) {
  const store = use(FieldStoreContext);
  const { dispatch } = useSession();
  const [recording, setRecording] = useState(load);
  const { on, light } = recording;

  function change(next: Recording) {
    setRecording(next);
    keep(next);
  }

  useEffect(() => {
    if (!on) return;
    async function record(settled: Hex) {
      const { pixels } = frame;
      let saved = false;
      try {
        const capture: FieldCapture = {
          id: crypto.randomUUID(),
          source: 'flow',
          garmentId: null,
          settled,
          light,
          lowLight,
          width: pixels.width,
          height: pixels.height,
          takenAt: new Date().toISOString(),
          build: readBuild().commit,
        };
        saved = (await store.saveCapture(capture, pixels)).ok;
      } catch {
        // Counted as a failed save. Nothing may reach the confirm screen's
        // click handler, which runs this.
      }
      dispatch({ type: 'toastShown', message: saved ? CAPTURE_RECORDED : CAPTURE_FAILED });
    }
    return onSettle((hex) => void record(hex));
  }, [on, light, frame, lowLight, onSettle, store, dispatch]);

  return (
    <div {...clearOfToasts} {...stylex.props(styles.control)}>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => change({ on: !on, light })}
        {...stylex.props(styles.toggle, on && styles.pressed)}
      >
        {RECORD}
      </button>
      {on && <LightChips value={light} onChange={(next) => change({ on, light: next })} />}
    </div>
  );
}
