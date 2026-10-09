import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import type { Hex } from '../model/hex';
import { LIGHT_LABELS } from '../model/field';
import { WRONG_AT, type CaptureScore } from '../color/fieldScore';
import { defaultRegion } from '../color/read';
import { colorName } from '../color/palette';
import { readableForeground } from '../color/contrast';
import { drawRegion } from '../features/dev/reader/drawRegion';
import { verdictText } from '../features/dev/reader/readout';

type Captures = { files: number; skipped: number; scores: CaptureScore[] };

const styles = stylex.create({
  wrap: { maxWidth: '960px', margin: '0 auto', display: 'grid', gap: '16px' },
  note: { fontSize: '13px', color: tokens.ink2, margin: 0 },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(160px, 240px) 1fr',
    gap: '12px',
    alignItems: 'start',
    paddingBottom: '16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.line,
  },
  canvas: { width: '100%', borderRadius: tokens.radiusMedia },
  details: { display: 'grid', gap: '8px' },
  heading: { fontFamily: tokens.fontHeading, fontSize: '15px', margin: 0 },
  numbers: { fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: tokens.ink2 },
  wrong: { fontWeight: 700, color: tokens.ink },
  label: { fontSize: '12px', color: tokens.ink2, width: '40px' },
  blocks: { display: 'flex', gap: '6px', alignItems: 'stretch' },
  block: (background: string, color: string) => ({
    backgroundColor: background,
    color,
    flex: '1 1 0',
    minHeight: '56px',
    borderRadius: tokens.radius,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '6px 8px',
    fontSize: '12px',
  }),
});

// Worst first. A capture with no distance had nothing to read at all, which
// is worse than any distance.
const worstFirst = (a: CaptureScore, b: CaptureScore) =>
  (b.distance ?? Infinity) - (a.distance ?? Infinity);

function Blocks({ label, colors }: { label: string; colors: readonly Hex[] }) {
  return (
    <div {...stylex.props(styles.blocks)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      {colors.map((color) => (
        <div key={color} {...stylex.props(styles.block(color, readableForeground(color).color))}>
          <span>{colorName(color)}</span>
          <span>{color}</span>
        </div>
      ))}
    </div>
  );
}

function Row({ score }: { score: CaptureScore }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    void fetch(`/__field/frame/${encodeURIComponent(score.id)}`)
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        if (!live || !canvas.current) return;
        const pixels = {
          width: score.width,
          height: score.height,
          data: new Uint8ClampedArray(buffer),
        };
        drawRegion(canvas.current, pixels, defaultRegion(pixels));
      });
    return () => {
      live = false;
    };
  }, [score]);

  const wrong = score.distance === null || score.distance > WRONG_AT;
  const viewfinder =
    score.lowLight === null ? 'uploaded photo' : score.lowLight ? 'low light warned' : 'no warning';
  return (
    <div {...stylex.props(styles.row)}>
      <canvas ref={canvas} {...stylex.props(styles.canvas)} />
      <div {...stylex.props(styles.details)}>
        <p {...stylex.props(styles.heading)}>
          {score.label ?? 'Unlinked, against the color settled in use'}
        </p>
        <p {...stylex.props(styles.numbers)}>
          <span {...stylex.props(wrong && styles.wrong)}>
            distance {score.distance === null ? '–' : score.distance.toFixed(3)}
          </span>{' '}
          · {verdictText(score.reading)} · verdict {score.verdictRight ? 'right' : 'wrong'} ·{' '}
          {LIGHT_LABELS[score.light]} · {viewfinder}
        </p>
        <Blocks label="True" colors={score.truth} />
        <Blocks label="Read" colors={score.scored} />
      </div>
    </div>
  );
}

export default function Field() {
  const [captures, setCaptures] = useState<Captures | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/__field/captures')
      .then((response) => {
        if (!response.ok) throw new Error(`The dev server answered ${response.status}`);
        return response.json() as Promise<Captures>;
      })
      .then(setCaptures, (e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p {...stylex.props(styles.note)}>{error}</p>;
  if (!captures) return <p {...stylex.props(styles.note)}>Loading tmp/field/…</p>;
  if (captures.files === 0) {
    return (
      <p {...stylex.props(styles.note)}>
        No exports in tmp/field/. Export from /dev/field and move the file there.
      </p>
    );
  }
  return (
    <div {...stylex.props(styles.wrap)}>
      <p {...stylex.props(styles.note)}>
        {captures.scores.length} captures from {captures.files} export
        {captures.files === 1 ? '' : 's'}, worst first. Wrong above {WRONG_AT}.
        {captures.skipped > 0 && ` ${captures.skipped} with nothing to score against left out.`}
      </p>
      {[...captures.scores].sort(worstFirst).map((score) => (
        <Row key={score.id} score={score} />
      ))}
    </div>
  );
}
