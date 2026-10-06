import { use, useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { LIGHTS, type FieldCapture, type Light } from '../../../model/field';
import type { Hex } from '../../../model/hex';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import type { DevSlots } from '../../../ui/devSlots';
import { clearOfToasts } from '../../../ui/toastClearance';
import { readBuild } from '../menu/build';
import { CAPTURE_FAILED, CAPTURE_RECORDED, CHOOSE_LIGHT, RECORD } from './copy';
import { FieldStoreContext } from './FieldStoreContext';
import { LightChips } from './LightChips';
import { persistFieldSet } from './persist';

const ON_KEY = 'huemi.field.recording';
const LIGHT_KEY = 'huemi.field.recording.light';

// Read and written straight from here rather than through a storage port:
// it is a developer's switch, and losing it costs a tap. Anything that cannot
// be read back starts off, or with no light.

// In localStorage, so Record stays on from one visit to the next.
function loadOn(): boolean {
  try {
    const raw = localStorage.getItem(ON_KEY);
    return raw !== null && (JSON.parse(raw) as { on?: unknown }).on === true;
  } catch {
    return false;
  }
}

// In sessionStorage: a new session is likely somewhere else, under another
// light, so it is asked for again rather than carried over.
function loadLight(): Light | null {
  try {
    const raw = sessionStorage.getItem(LIGHT_KEY);
    return LIGHTS.find((known) => known === raw) ?? null;
  } catch {
    return null;
  }
}

function keep(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
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
  prompt: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
});

/**
 * Records what the camera saw each time the user settles on a color in
 * normal use. Fills the confirm screen's `confirm.actions` slot. The capture
 * has no garment yet; the field recorder's list offers to link it to one.
 * Nothing is recorded until a light is chosen, since a guessed one would
 * mislabel every capture until someone noticed.
 *
 * The save is not awaited: the confirm screen has moved on to suggestions by
 * the time it lands, and the toast finds the user there.
 */
export function RecordControl({ frame, lowLight, onSettle }: DevSlots['confirm.actions']) {
  const store = use(FieldStoreContext);
  const { dispatch } = useSession();
  const [on, setOn] = useState(loadOn);
  const [light, setLight] = useState(loadLight);

  function toggle() {
    setOn(!on);
    keep(() => localStorage, ON_KEY, JSON.stringify({ on: !on }));
  }

  function choose(next: Light) {
    setLight(next);
    keep(() => sessionStorage, LIGHT_KEY, next);
  }

  useEffect(() => {
    if (!on || light === null) return;
    const chosen: Light = light;
    async function record(settled: Hex) {
      const { pixels } = frame;
      let saved = false;
      try {
        persistFieldSet();
        const capture: FieldCapture = {
          id: crypto.randomUUID(),
          source: 'flow',
          garmentId: null,
          settled,
          light: chosen,
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
        onClick={toggle}
        {...stylex.props(styles.toggle, on && styles.pressed)}
      >
        {RECORD}
      </button>
      {on && <LightChips value={light} onChange={choose} />}
      {on && light === null && <p {...stylex.props(styles.prompt)}>{CHOOSE_LIGHT}</p>}
    </div>
  );
}
