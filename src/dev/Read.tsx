import { useEffect, useRef, useState, type MouseEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import type { Frame } from '../model/frame';
import { browserCamera } from '../features/camera/browserCamera';
import { FRAME_MAX_SIDE } from '../features/camera/port';
import { LOW_LIGHT, meanLightness } from '../features/camera/lightness';
import {
  colorsIn,
  decide,
  defaultRegion,
  tapRegion,
  READ_TUNING,
  type Region,
} from '../color/read';
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

const fmt = (n: number) => n.toFixed(3);

// The circle is drawn over the frame, at frame resolution, so what is marked
// is exactly what readColor samples.
function draw(canvas: HTMLCanvasElement, frame: Frame, region: Region) {
  const { width, height, data } = frame.pixels;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  context.lineWidth = 2;
  context.strokeStyle = '#ffffff';
  context.beginPath();
  context.arc(region.cx, region.cy, region.r, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = '#000000';
  context.beginPath();
  context.arc(region.cx, region.cy, region.r + 2, 0, Math.PI * 2);
  context.stroke();
}

export default function Read() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canvas.current && frame && region) draw(canvas.current, frame, region);
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

  const found = frame && region ? colorsIn(frame.pixels, region) : [];
  const reading = decide(found);
  const offered = new Set(
    reading.kind === 'several'
      ? reading.colors.map((c) => c.color)
      : reading.kind === 'single'
        ? [reading.color]
        : [],
  );
  const lightness = frame ? meanLightness(frame.pixels) : null;

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
      {frame && (
        <>
          <canvas ref={canvas} onClick={tap} {...stylex.props(styles.canvas)} />
          <p {...stylex.props(styles.verdict)}>
            {reading.kind}
            {reading.kind === 'single' && ` · ${colorName(reading.color)}`}
          </p>
          <p {...stylex.props(styles.numbers)}>
            mean lightness {lightness === null ? '–' : fmt(lightness)} (dark below{' '}
            {LOW_LIGHT.darkBelow}) · single ≥ {READ_TUNING.singleMin} · part ≥ {READ_TUNING.partMin}{' '}
            · covered ≥ {READ_TUNING.coveredMin}
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
