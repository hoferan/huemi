import { useEffect, useMemo, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colorName } from '../../../color/palette';
import { tokens } from '../../../styles/tokens.stylex';
import type { Pixels } from '../../../model/frame';
import type { DevSlots } from '../../../ui/devSlots';
import type { Region } from '../../../color/read';
import { DevOverlay } from '../DevOverlay';
import { drawRegion } from './drawRegion';
import { fmt, lightText, readout, ruleText, verdictText } from './readout';

// `swatch` is the only dynamic entry, and `stylex.create` compiles it into a
// null-guard around its value that no caller reaches, since a cluster always
// has a color. The ignore brackets the whole object for the reason
// Confirm.tsx gives.
/* v8 ignore start */
const styles = stylex.create({
  // Takes whatever room the lines below leave it, and never less than enough
  // to see the circle.
  photo: {
    flex: '1 0 120px',
    display: 'block',
    width: '100%',
    minHeight: 0,
    objectFit: 'contain',
  },
  line: { margin: 0 },
  verdict: { margin: 0, fontSize: '0.9375rem' },
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '4px' },
  row: { display: 'flex', alignItems: 'center', gap: '8px' },
  // A hairline in the panel's own foreground, so a near-black cluster still
  // has an edge against the panel.
  swatch: (color: string) => ({
    flexShrink: 0,
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    backgroundColor: color,
    boxShadow: `0 0 0 1px ${tokens.darkFg}`,
  }),
});
/* v8 ignore stop */

/** The frame with the sampled circle, drawn when the panel opens. */
function RegionCanvas({ pixels, region }: { pixels: Pixels; region: Region }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { cx, cy, r } = region;
  useEffect(() => {
    if (canvas.current) drawRegion(canvas.current, pixels, { cx, cy, r });
  }, [pixels, cx, cy, r]);
  return (
    <canvas ref={canvas} role="img" aria-label="Sampled region" {...stylex.props(styles.photo)} />
  );
}

/**
 * What the reader saw, over the confirm screen's photo. Fills the
 * `confirm.overlay` slot. Closed, it is a chip that names the verdict; open,
 * it shows the frame with the sampled circle, the verdict and the threshold
 * that settled it, the frame's mean lightness against the low-light line,
 * and every cluster with its share.
 *
 * It works from `readout`, which decides with the function `readColor` uses,
 * so the verdict it explains is the one on the screen.
 */
export function ReaderPanel({ frame, region, lowLight }: DevSlots['confirm.overlay']) {
  const { pixels } = frame;
  const { cx, cy, r } = region;
  const { found, decision, lightness } = useMemo(
    () => readout(pixels, { cx, cy, r }),
    [pixels, cx, cy, r],
  );

  return (
    <DevOverlay label={`Reader · ${decision.reading.kind}`}>
      <RegionCanvas pixels={pixels} region={region} />
      <p data-testid="reader-verdict" {...stylex.props(styles.verdict)}>
        {verdictText(decision.reading)}
      </p>
      <p {...stylex.props(styles.line)}>{ruleText(decision)}</p>
      <p {...stylex.props(styles.line)}>{lightText(lightness, lowLight)}</p>
      <ul aria-label="Clusters" {...stylex.props(styles.list)}>
        {found.map(({ color, share }) => (
          <li key={color} {...stylex.props(styles.row)}>
            <span aria-hidden="true" {...stylex.props(styles.swatch(color))} />
            <span>
              {colorName(color)} {color} {fmt(share)}
            </span>
          </li>
        ))}
      </ul>
    </DevOverlay>
  );
}
