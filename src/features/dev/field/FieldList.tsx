import { use, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../../color/contrast';
import { colorName } from '../../../color/palette';
import { LIGHT_LABELS, type FieldCapture, type FieldGarment } from '../../../model/field';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { formatSavedDate } from '../../saved/formatSavedDate';
import {
  ADD_GARMENT,
  EXPORT,
  FROM_NORMAL_USE,
  LIST_TITLE,
  MENU_BACK,
  NO_GARMENTS,
  STORE_FAILED,
  captureCount,
} from './copy';
import { FieldStoreContext } from './FieldStoreContext';

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
});

type Loaded =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; garments: FieldGarment[]; captures: FieldCapture[] };

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
    void Promise.all([store.listGarments(), store.listCaptures()]).then(([garments, captures]) => {
      if (!current) return;
      setLoaded(
        garments.ok && captures.ok
          ? { status: 'ready', garments: garments.value, captures: captures.value }
          : { status: 'error' },
      );
    });
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
          now={now}
          onAdd={() => void navigate('/dev/field/new')}
        />
      )}
    </Screen>
  );
}

function Ready({
  garments,
  captures,
  now,
  onAdd,
}: {
  garments: FieldGarment[];
  captures: FieldCapture[];
  now: Date;
  onAdd: () => void;
}) {
  const unlinked = captures.filter(
    (capture) => capture.source === 'flow' && capture.garmentId === null,
  );
  const counts = new Map<string, number>();
  for (const { garmentId } of captures) {
    if (garmentId !== null) counts.set(garmentId, (counts.get(garmentId) ?? 0) + 1);
  }

  return (
    <>
      <div {...stylex.props(styles.actions)}>
        <Button label={ADD_GARMENT} onClick={onAdd} />
        <Button label={EXPORT} variant="secondary" disabled />
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
            {unlinked.map((capture) => (
              <li key={capture.id} {...stylex.props(styles.text)}>
                {`${LIGHT_LABELS[capture.light]}, ${formatSavedDate(capture.takenAt, now)}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
