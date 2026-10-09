import { useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { DevSlots } from '../../../ui/devSlots';
import { DevOverlay } from '../DevOverlay';
import { suggestReadout } from './suggestReadout';

const styles = stylex.create({
  line: { margin: 0 },
  heading: { margin: 0, marginTop: '6px', fontSize: '0.9375rem' },
  list: { margin: 0, paddingInlineStart: '16px' },
});

/**
 * The engine's numbers behind the outfit on the suggestions screen. Fills the
 * `suggest.overlay` slot. Open, it shows the outfit's chroma against the
 * budget, then each suggested piece's rank, score and terms, and what keeps
 * each higher-ranked color out of this outfit.
 */
export function SuggestEnginePanel({ baseSlot, pieces }: DevSlots['suggest.overlay']) {
  const { total, slots } = useMemo(() => suggestReadout(baseSlot, pieces), [baseSlot, pieces]);
  return (
    <DevOverlay label="Engine" place="center">
      <p {...stylex.props(styles.line)}>{total}</p>
      {slots.map(({ slot, heading, terms, note, above }) => (
        <div key={slot}>
          <p {...stylex.props(styles.heading)}>{heading}</p>
          <p {...stylex.props(styles.line)}>{terms}</p>
          {note && <p {...stylex.props(styles.line)}>{note}</p>}
          {above.length > 0 && (
            <>
              <p {...stylex.props(styles.line)}>Above it:</p>
              <ul {...stylex.props(styles.list)}>
                {above.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </DevOverlay>
  );
}
