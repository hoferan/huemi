import * as stylex from '@stylexjs/stylex';
import { LIGHT_LABELS, type Light } from '../../../model/field';
import { tokens } from '../../../styles/tokens.stylex';
import { RUN_PROGRESS, progressText } from './copy';

const styles = stylex.create({
  progress: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', justifyContent: 'space-between', gap: '16px' },
  text: { color: tokens.ink2, fontSize: tokens.textBody },
  track: { height: '4px', borderRadius: '2px', backgroundColor: tokens.line },
  fill: { height: '100%', borderRadius: '2px', backgroundColor: tokens.ink },
});

/** Where a run stands: the question's number and the light it is taken in. */
export function RunProgress({
  index,
  length,
  light,
}: {
  index: number;
  length: number;
  light: Light | null;
}) {
  return (
    <div {...stylex.props(styles.progress)}>
      <div {...stylex.props(styles.row)}>
        <span {...stylex.props(styles.text)}>{progressText(index, length)}</span>
        {light && <span {...stylex.props(styles.text)}>{LIGHT_LABELS[light]}</span>}
      </div>
      <div
        role="progressbar"
        aria-label={RUN_PROGRESS}
        aria-valuemin={1}
        aria-valuemax={length}
        aria-valuenow={index + 1}
        {...stylex.props(styles.track)}
      >
        {/* The bar steps without a transition, so reduced motion has nothing to gate. */}
        <div {...stylex.props(styles.fill)} style={{ width: `${((index + 1) / length) * 100}%` }} />
      </div>
    </div>
  );
}
