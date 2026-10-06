import { use, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../../color/contrast';
import { colorName } from '../../../color/palette';
import { LIGHT_LABELS, type FieldCapture, type FieldGarment } from '../../../model/field';
import type { Pixels } from '../../../model/frame';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { FramePhoto } from '../../confirm/FramePhoto';
import { formatSavedDate } from '../../saved/formatSavedDate';
import { ShareContext } from '../../share/ShareContext';
import {
  ADD_GARMENT,
  DELETE,
  DELETE_CAPTURE_FAILED,
  EXPORT,
  EXPORTED,
  EXPORT_FAILED,
  FROM_NORMAL_USE,
  LINK_TO_GARMENT,
  LIST_TITLE,
  MENU_BACK,
  NO_GARMENTS,
  PREPARING_EXPORT,
  SHARE_EXPORT,
  STORE_FAILED,
  captureCount,
  exportSize,
} from './copy';
import { buildFieldExport, deliverFieldExport, type ExportOutcome } from './exportFieldSet';
import { FieldStoreContext } from './FieldStoreContext';
import { LinkCapture } from './LinkCapture';

const styles = stylex.create({
  actions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
    backgroundColor: { default: 'transparent', ':hover': tokens.surface },
    color: tokens.ink,
    textDecorationLine: 'none',
  },
  strip: { display: 'flex', gap: '6px', height: '72px' },
  piece: { flexGrow: 1, flexBasis: 0, borderRadius: tokens.radiusMedia },
  fill: (background: string) => ({ backgroundColor: background }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  meta: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '8px' },
  label: { fontSize: '1.05rem', fontWeight: 500 },
  detail: { fontSize: '0.875rem', color: tokens.ink2 },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  heading: { fontFamily: tokens.fontHeading, fontSize: '1.25rem', margin: 0 },
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
  // A capture waiting for its garment, laid out like the garment page's.
  item: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
  },
  thumb: { display: 'flex', flexDirection: 'column', width: '96px', flexShrink: 0 },
  settled: { width: '48px', height: '48px', flexShrink: 0, borderRadius: tokens.radiusMedia },
  waiting: { flexGrow: 1, display: 'flex', flexDirection: 'column', fontSize: tokens.textBody },
});

/** A capture from normal use that no garment has claimed yet. */
const isWaiting = (capture: FieldCapture): boolean =>
  capture.source === 'flow' && capture.garmentId === null;

/** Where an export is: nothing yet, being built, or built and waiting for its tap. */
type Exporting =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'ready'; file: File; garments: FieldGarment[]; captures: FieldCapture[] };

const IDLE: Exporting = { status: 'idle' };

type Loaded =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      garments: FieldGarment[];
      captures: FieldCapture[];
      frames: ReadonlyMap<string, Pixels>;
    };

/**
 * The field recorder's start: every garment as its true colors, how many
 * captures it has, and the captures from normal use still waiting for a
 * garment. Nothing shows until the store answers, since "no garments yet"
 * would be a guess before then.
 */
export function FieldList() {
  const store = use(FieldStoreContext);
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  // Read once per visit, as on the saved screen, so render stays pure.
  const [now] = useState(() => new Date());

  useEffect(() => {
    let current = true;
    void (async () => {
      const [garments, captures] = await Promise.all([store.listGarments(), store.listCaptures()]);
      if (!garments.ok || !captures.ok) {
        if (current) setLoaded({ status: 'error' });
        return;
      }
      // The waiting captures show their frames, which the list leaves out.
      const frames = new Map<string, Pixels>();
      await Promise.all(
        captures.value.filter(isWaiting).map(async ({ id }) => {
          const read = await store.readPixels(id);
          if (read.ok) frames.set(id, read.value);
        }),
      );
      if (current) {
        setLoaded({ status: 'ready', garments: garments.value, captures: captures.value, frames });
      }
    })();
    return () => {
      current = false;
    };
  }, [store]);

  return (
    <Screen title={LIST_TITLE} back={MENU_BACK}>
      {loaded.status === 'error' && <p {...stylex.props(styles.text)}>{STORE_FAILED}</p>}
      {loaded.status === 'ready' && (
        <Ready
          garments={loaded.garments}
          captures={loaded.captures}
          frames={loaded.frames}
          now={now}
          onAdd={() => void navigate('/dev/field/new')}
          onLinked={(id, garmentId) =>
            setLoaded({
              ...loaded,
              captures: loaded.captures.map((capture) =>
                capture.id === id ? { ...capture, garmentId } : capture,
              ),
            })
          }
          // Functional, since the delete awaited the store and `loaded` may
          // have moved on since the tap.
          onDeleted={(id) =>
            setLoaded((current) =>
              current.status === 'ready'
                ? { ...current, captures: current.captures.filter((c) => c.id !== id) }
                : current,
            )
          }
        />
      )}
    </Screen>
  );
}

function Ready({
  garments,
  captures,
  frames,
  now,
  onAdd,
  onLinked,
  onDeleted,
}: {
  garments: FieldGarment[];
  captures: FieldCapture[];
  frames: ReadonlyMap<string, Pixels>;
  now: Date;
  onAdd: () => void;
  onLinked: (id: string, garmentId: string) => void;
  onDeleted: (id: string) => void;
}) {
  const store = use(FieldStoreContext);
  const share = use(ShareContext);
  const { dispatch } = useSession();
  // The capture whose link sheet is open.
  const [linking, setLinking] = useState<string | null>(null);
  const [exporting, setExporting] = useState<Exporting>(IDLE);
  // Set while the share sheet is up: Chrome rejects a second share then, and
  // the person would read that as a failure.
  const sharing = useRef(false);
  const shareButton = useRef<HTMLButtonElement>(null);
  // Set while a delete is out, so a second tap cannot run it twice.
  const deleting = useRef(false);
  // The build reads the captures one at a time, so a delete or link landing
  // mid-build fails it or leaves a file of the old set that is then dropped.
  const preparing = exporting.status === 'preparing';
  const unlinked = captures.filter(isWaiting);
  const counts = new Map<string, number>();
  for (const { garmentId } of captures) {
    if (garmentId !== null) counts.set(garmentId, (counts.get(garmentId) ?? 0) + 1);
  }

  // The frames as stored, before base64 and gzip change the size either way.
  const bytes = captures.reduce((sum, { width, height }) => sum + width * height * 4, 0);

  // A file built before a link, or before the lists were read again, holds
  // the old set, so it is dropped and never shared.
  const prepared =
    exporting.status === 'ready' &&
    exporting.garments === garments &&
    exporting.captures === captures
      ? exporting.file
      : null;

  // The sheet's button appears after Export went disabled, which dropped focus.
  useEffect(() => {
    if (prepared) shareButton.current?.focus();
  }, [prepared]);

  const toast = (message: string) => dispatch({ type: 'toastShown', message });

  // The first tap builds the file. With a share sheet the second tap shares
  // it, since the build's awaits use up the tap's user activation. Without
  // one, a download needs no activation, so it happens straight away.
  async function prepare() {
    const set = { garments, captures };
    setExporting({ status: 'preparing' });
    let next: Exporting = IDLE;
    try {
      const file = await buildFieldExport({ store });
      if (file === 'failed') {
        toast(EXPORT_FAILED);
      } else if (share.canShareFiles([file])) {
        next = { status: 'ready', file, ...set };
      } else {
        await deliverFieldExport(share, file);
        toast(EXPORTED);
      }
    } catch {
      toast(EXPORT_FAILED);
    } finally {
      setExporting(next);
    }
  }

  // No confirmation, the same as a capture's Delete on the garment page.
  async function remove(id: string) {
    if (deleting.current) return;
    deleting.current = true;
    const removed = await store.deleteCapture(id);
    deleting.current = false;
    if (removed.ok) onDeleted(id);
    else toast(DELETE_CAPTURE_FAILED);
  }

  // Synchronous up to the share, which must start inside the click.
  function send(file: File) {
    if (sharing.current) return;
    sharing.current = true;
    void deliverFieldExport(share, file)
      .catch((): ExportOutcome => 'failed')
      .then((outcome) => {
        sharing.current = false;
        // A closed sheet keeps the file, so the person can try again.
        if (outcome === 'failed') {
          toast(EXPORT_FAILED);
        } else if (outcome !== 'dismissed') {
          toast(EXPORTED);
          setExporting(IDLE);
        }
      });
  }

  return (
    <>
      <div {...stylex.props(styles.actions)}>
        <Button label={ADD_GARMENT} onClick={onAdd} />
        <Button
          label={preparing ? PREPARING_EXPORT : EXPORT}
          variant="secondary"
          disabled={captures.length === 0 || preparing}
          onClick={() => void prepare()}
        />
        {prepared && (
          <Button ref={shareButton} label={SHARE_EXPORT} onClick={() => send(prepared)} />
        )}
        <p {...stylex.props(styles.text)}>{exportSize(captures.length, bytes)}</p>
      </div>
      {garments.length === 0 ? (
        <p {...stylex.props(styles.text)}>{NO_GARMENTS}</p>
      ) : (
        <ul {...stylex.props(styles.list)}>
          {garments.map((garment) => (
            <li key={garment.id}>
              <Link
                to={`/dev/field/garment?id=${encodeURIComponent(garment.id)}`}
                {...stylex.props(styles.card)}
              >
                {/* The colors again as names below, for anyone who cannot see
                    or tell apart the blocks. */}
                <span aria-hidden="true" {...stylex.props(styles.strip)}>
                  {garment.truth.map((hex, i) => (
                    <span
                      key={i}
                      {...stylex.props(
                        styles.piece,
                        styles.fill(hex),
                        needsBorder(hex) && styles.hairline,
                      )}
                    />
                  ))}
                </span>
                <span {...stylex.props(styles.meta)}>
                  <span {...stylex.props(styles.label)}>{garment.label}</span>
                  <span {...stylex.props(styles.detail)}>
                    {garment.truth.map(colorName).join(', ')}
                  </span>
                  <span {...stylex.props(styles.detail)}>
                    {captureCount(counts.get(garment.id) ?? 0)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {unlinked.length > 0 && (
        <section {...stylex.props(styles.section)}>
          <h2 {...stylex.props(styles.heading)}>{FROM_NORMAL_USE}</h2>
          <ul {...stylex.props(styles.list)}>
            {unlinked.map((capture) => {
              const pixels = frames.get(capture.id);
              const { settled } = capture;
              return (
                <li key={capture.id} {...stylex.props(styles.item)}>
                  <span {...stylex.props(styles.thumb)}>
                    {pixels && <FramePhoto pixels={pixels} fit="cover" />}
                  </span>
                  {settled && (
                    // Named in the text beside it.
                    <span
                      aria-hidden="true"
                      {...stylex.props(
                        styles.settled,
                        styles.fill(settled),
                        needsBorder(settled) && styles.hairline,
                      )}
                    />
                  )}
                  <span {...stylex.props(styles.waiting)}>
                    {settled && <span>{colorName(settled)}</span>}
                    <span {...stylex.props(styles.detail)}>
                      {`${LIGHT_LABELS[capture.light]}, ${formatSavedDate(capture.takenAt, now)}`}
                    </span>
                  </span>
                  <Button
                    label={LINK_TO_GARMENT}
                    variant="secondary"
                    disabled={preparing}
                    onClick={() => setLinking(capture.id)}
                  />
                  <Button
                    label={DELETE}
                    variant="secondary"
                    disabled={preparing}
                    onClick={() => void remove(capture.id)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {linking !== null && (
        <LinkCapture
          captureId={linking}
          garments={garments}
          onLinked={(garmentId) => onLinked(linking, garmentId)}
          onClose={() => setLinking(null)}
        />
      )}
    </>
  );
}
