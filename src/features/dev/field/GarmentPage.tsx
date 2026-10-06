import { use, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../../color/contrast';
import { colorName } from '../../../color/palette';
import {
  LIGHT_LABELS,
  type FieldCapture,
  type FieldGarment,
  type Light,
} from '../../../model/field';
import type { Pixels } from '../../../model/frame';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { Redirect } from '../../../ui/Redirect';
import { Screen } from '../../../ui/Screen';
import { Sheet } from '../../../ui/Sheet';
import { clearOfToasts } from '../../../ui/toastClearance';
import { FramePhoto } from '../../confirm/FramePhoto';
import { formatSavedDate } from '../../saved/formatSavedDate';
import {
  CAPTURE,
  DELETE,
  DELETE_CAPTURE_FAILED,
  DELETE_GARMENT,
  DELETE_GARMENT_FAILED,
  KEEP_IT,
  LIST_BACK,
  LIST_TITLE,
  STORE_FAILED,
  deleteGarmentTitle,
} from './copy';
import { FieldStoreContext } from './FieldStoreContext';
import { LightChips } from './LightChips';
import { useGarment } from './useGarment';

const styles = stylex.create({
  // The truth strip, as on the list's cards.
  strip: { display: 'flex', gap: '6px', height: '96px' },
  piece: { flexGrow: 1, flexBasis: 0, borderRadius: tokens.radiusMedia },
  fill: (background: string) => ({ backgroundColor: background }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  names: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  actions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
  },
  thumb: { display: 'flex', flexDirection: 'column', width: '96px', flexShrink: 0 },
  meta: { flexGrow: 1, display: 'flex', flexDirection: 'column', fontSize: tokens.textBody },
  detail: { color: tokens.ink2, fontSize: '0.875rem' },
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
});

type Shot = { capture: FieldCapture; pixels: Pixels | null };

/**
 * One garment: its true colors, the lights to shoot it in, and what has been
 * captured so far, newest first. A stale or missing id lands on the list.
 */
export function GarmentPage() {
  const [params] = useSearchParams();
  const state = useGarment(params.get('id'));

  if (state.status === 'missing') return <Redirect to="/dev/field" />;
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
  return <Loaded garment={state.garment} />;
}

function Loaded({ garment }: { garment: FieldGarment }) {
  const store = use(FieldStoreContext);
  const { dispatch } = useSession();
  const navigate = useNavigate();
  const [light, setLight] = useState<Light | null>(null);
  const [shots, setShots] = useState<Shot[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Read once per visit, so render stays pure.
  const [now] = useState(() => new Date());
  // Set while a delete is out, so a second tap cannot run it twice.
  const busy = useRef(false);

  useEffect(() => {
    let current = true;
    void (async () => {
      const listed = await store.listCaptures();
      const mine = listed.ok ? listed.value.filter((c) => c.garmentId === garment.id) : [];
      // The thumbnails need the frames, which the list leaves out.
      const loaded = await Promise.all(
        mine.map(async (capture) => {
          const read = await store.readPixels(capture.id);
          return { capture, pixels: read.ok ? read.value : null };
        }),
      );
      if (current) setShots(loaded);
    })();
    return () => {
      current = false;
    };
  }, [store, garment.id]);

  async function removeCapture(id: string) {
    if (busy.current) return;
    busy.current = true;
    const removed = await store.deleteCapture(id);
    busy.current = false;
    if (!removed.ok) {
      dispatch({ type: 'toastShown', message: DELETE_CAPTURE_FAILED });
      return;
    }
    setShots((all) => all?.filter((shot) => shot.capture.id !== id) ?? null);
  }

  async function removeGarment() {
    if (busy.current) return;
    busy.current = true;
    const removed = await store.deleteGarment(garment.id);
    busy.current = false;
    if (!removed.ok) {
      setConfirming(false);
      dispatch({ type: 'toastShown', message: DELETE_GARMENT_FAILED });
      return;
    }
    void navigate('/dev/field', { replace: true });
  }

  return (
    <Screen title={garment.label} back={LIST_BACK}>
      <span aria-hidden="true" {...stylex.props(styles.strip)}>
        {garment.truth.map((hex, i) => (
          <span
            key={i}
            {...stylex.props(styles.piece, styles.fill(hex), needsBorder(hex) && styles.hairline)}
          />
        ))}
      </span>
      <p {...stylex.props(styles.names)}>{garment.truth.map(colorName).join(', ')}</p>

      <section {...stylex.props(styles.section)}>
        <LightChips value={light} onChange={setLight} />
        <Button
          label={CAPTURE}
          disabled={light === null}
          onClick={() =>
            void navigate(
              `/dev/field/capture?id=${encodeURIComponent(garment.id)}&light=${light ?? ''}`,
            )
          }
        />
      </section>

      {shots !== null && shots.length > 0 && (
        <ul {...stylex.props(styles.list)}>
          {shots.map(({ capture, pixels }) => (
            <li key={capture.id} {...stylex.props(styles.item)}>
              <span {...stylex.props(styles.thumb)}>
                {pixels && <FramePhoto pixels={pixels} fit="cover" />}
              </span>
              <span {...stylex.props(styles.meta)}>
                <span>{LIGHT_LABELS[capture.light]}</span>
                <span {...stylex.props(styles.detail)}>
                  {formatSavedDate(capture.takenAt, now)}
                </span>
              </span>
              <Button
                label={DELETE}
                variant="secondary"
                onClick={() => void removeCapture(capture.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div {...stylex.props(styles.actions)} {...clearOfToasts}>
        <Button
          label={DELETE_GARMENT}
          variant="quiet"
          disabled={shots === null}
          onClick={() => setConfirming(true)}
        />
      </div>
      {confirming && shots !== null && (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(false);
          }}
          title={deleteGarmentTitle(garment.label, shots.length)}
        >
          <Button label={DELETE} onClick={() => void removeGarment()} />
          <Button label={KEEP_IT} variant="secondary" onClick={() => setConfirming(false)} />
        </Sheet>
      )}
    </Screen>
  );
}
