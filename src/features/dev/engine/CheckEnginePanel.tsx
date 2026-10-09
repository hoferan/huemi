import { useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { DevSlots } from '../../../ui/devSlots';
import { DevOverlay } from '../DevOverlay';
import { checkReadout } from './checkReadout';

const styles = stylex.create({
  line: { margin: 0 },
  heading: { margin: 0, marginTop: '6px', fontSize: '0.9375rem' },
});

/**
 * The measurements behind the check result's sentences. Fills the
 * `check.overlay` slot. Open, it shows each sentence's measurement and the
 * threshold it was read against, then each piece's lightness, chroma and
 * warmth.
 *
 * ADR 0014 still holds. The check shows a user no number, because the engine's
 * total has no calibrated scale and a flag would point at good outfits as often
 * as bad ones. These are measurements for the developer reading the engine,
 * shown only in developer mode, and none of them is a verdict.
 */
export function CheckEnginePanel({ pieces, observations }: DevSlots['check.overlay']) {
  const readout = useMemo(() => checkReadout(pieces, observations), [pieces, observations]);
  return (
    <DevOverlay label="Engine" place="center">
      <p {...stylex.props(styles.heading)}>Sentences</p>
      {readout.observations.map((line) => (
        <p key={line} {...stylex.props(styles.line)}>
          {line}
        </p>
      ))}
      <p {...stylex.props(styles.heading)}>Pieces</p>
      {readout.pieces.map((line) => (
        <p key={line} {...stylex.props(styles.line)}>
          {line}
        </p>
      ))}
    </DevOverlay>
  );
}
