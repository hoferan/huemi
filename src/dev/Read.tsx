import { useEffect, useRef, useState, type MouseEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import type { Frame } from '../model/frame';
import { browserCamera } from '../features/camera/browserCamera';
import { FRAME_MAX_SIDE } from '../features/camera/port';
import { drawRegion } from '../features/dev/reader/drawRegion';
import { fmt, lightText, readout, ruleText, verdictText } from '../features/dev/reader/readout';
import { defaultRegion, tapRegion, type Region } from '../color/read';
import { colorName } from '../color/palette';
import { readableForeground } from '../color/contrast';

const styles = stylex.create({
  wrap: { maxWidth: '760px', margin: '0 auto', display: 'grid', gap: '12px' },
  canvas: { maxWidth: '100%', borderRadius: tokens.radiusMedia, cursor: 'crosshair' },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  verdict: { fontFamily: tokens.fontHeading, fontSize: '17px', margin: 0 },
  numbers: { fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: tokens.ink2 },
  groups: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '8px',
  },
  block: (background: string, color: string) => ({
    backgroundColor: background,
    color,
    minHeight: '84px',
    borderRadius: tokens.radius,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '6px 8px',
    fontSize: '12px',
  }),
  dropped: { opacity: 0.45 },
});

export default function Read() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canvas.current && frame && region) drawRegion(canvas.current, frame.pixels, region);
  }, [frame, region]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const result = await browserCamera.readPhoto(file, FRAME_MAX_SIDE);
    if (!result.ok) {
      setError(`Could not decode ${file.name}`);
      return;
    }
    setError(null);
    setFrame(result.frame);
    setRegion(defaultRegion(result.frame.pixels));
  };

  const tap = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!frame) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * frame.pixels.width;
    const y = ((event.clientY - box.top) / box.height) * frame.pixels.height;
    setRegion(tapRegion(frame.pixels, x, y));
  };

  // The confirm screen's reader panel works from the same readout, so the
  // two agree on every photo.
  const read = frame && region ? readout(frame.pixels, region) : null;
  const found = read?.found ?? [];
  const reading = read?.decision.reading ?? { kind: 'unclear' };
  const offered = new Set(
    reading.kind === 'several'
      ? reading.colors.map((c) => c.color)
      : reading.kind === 'single'
        ? [reading.color]
        : [],
  );

  return (
    <div {...stylex.props(styles.wrap)}>
      <div {...stylex.props(styles.row)}>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        {frame && (
          <button type="button" onClick={() => setRegion(defaultRegion(frame.pixels))}>
            Back to the default circle
          </button>
        )}
      </div>
      {error && <p>{error}</p>}
      {read && (
        <>
          <canvas ref={canvas} onClick={tap} {...stylex.props(styles.canvas)} />
          <p {...stylex.props(styles.verdict)}>{verdictText(reading)}</p>
          <p {...stylex.props(styles.numbers)}>
            {ruleText(read.decision)} · {lightText(read.lightness, null)}
          </p>
          <div {...stylex.props(styles.groups)}>
            {found.map(({ color, share }) => {
              const fg = readableForeground(color);
              return (
                <div
                  key={color}
                  {...stylex.props(
                    styles.block(color, fg.color),
                    !offered.has(color) && styles.dropped,
                  )}
                >
                  <span>{colorName(color)}</span>
                  <span>
                    {color} · {fmt(share)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
