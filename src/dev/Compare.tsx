import { useCallback, useEffect, useMemo, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import type { Hex } from '../model/hex';
import { SLOT_LABELS } from '../model/types';
import { readableForeground } from '../color/contrast';
import { buildComparisons, type Answer, type Verdict } from './comparisons';

const styles = stylex.create({
  wrap: { maxWidth: '760px', margin: '0 auto' },
  progress: {
    fontSize: '13px',
    color: tokens.ink2,
    fontVariantNumeric: 'tabular-nums',
    marginBottom: '8px',
  },
  question: { fontFamily: tokens.fontHeading, fontSize: '17px', margin: '0 0 12px' },
  options: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  option: {
    borderRadius: tokens.radius,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 0,
    padding: 0,
    cursor: 'pointer',
  },
  block: (background: string, color: string) => ({
    backgroundColor: background,
    color,
    minHeight: '132px',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '8px 10px',
    fontSize: '12px',
  }),
  actions: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
  button: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    backgroundColor: 'transparent',
    color: tokens.ink,
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  hint: { fontSize: '12px', color: tokens.ink2, marginTop: '12px' },
  done: { fontFamily: tokens.fontHeading, fontSize: '17px', margin: '0 0 8px' },
  output: {
    width: '100%',
    minHeight: '240px',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '8px',
    borderRadius: tokens.radius,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
  },
});

/**
 * The forced-choice pass that authors the corpus (#11).
 *
 * Nothing about the engine's opinion is on screen: no score, no rank, no color
 * name. The blocks carry their slot label and nothing else, because an answer
 * anchored on a number beside the color is not the judgement being asked for
 * (ADR 0006).
 */
export default function Compare() {
  const comparisons = useMemo(() => buildComparisons(), []);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const at = answers.length;
  const current = comparisons[at];

  const answer = useCallback(
    (verdict: Verdict) => {
      setAnswers((prev) => {
        const next = comparisons[prev.length];
        return next ? [...prev, { ...next, verdict }] : prev;
      });
    },
    [comparisons],
  );

  const back = useCallback(() => setAnswers((prev) => prev.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') answer('left');
      else if (event.key === 'ArrowRight') answer('right');
      else if (event.key === 'ArrowDown' || event.key === ' ') answer('none');
      else if (event.key === 'Backspace') back();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, back]);

  if (!current) {
    const payload = JSON.stringify({ version: 1, answers }, null, 2);
    return (
      <div {...stylex.props(styles.wrap)}>
        <h2 {...stylex.props(styles.done)}>All {answers.length} answered. Paste this back.</h2>
        <textarea {...stylex.props(styles.output)} readOnly value={payload} />
        <div {...stylex.props(styles.actions)}>
          <button type="button" onClick={back} {...stylex.props(styles.button)}>
            Back to the last one
          </button>
          <button type="button" onClick={() => setAnswers([])} {...stylex.props(styles.button)}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  const baseFg = readableForeground(current.base).color;

  const side = (hex: Hex, label: string, verdict: Verdict) => (
    <button
      type="button"
      onClick={() => answer(verdict)}
      aria-label={`Choose the ${label} outfit`}
      {...stylex.props(styles.option)}
    >
      <span {...stylex.props(styles.block(current.base, baseFg))}>
        {SLOT_LABELS[current.baseSlot]}
      </span>
      <span {...stylex.props(styles.block(hex, readableForeground(hex).color))}>
        {SLOT_LABELS[current.slot]}
      </span>
    </button>
  );

  return (
    <div {...stylex.props(styles.wrap)}>
      <p {...stylex.props(styles.progress)}>
        {at + 1} of {comparisons.length}
      </p>
      <h2 {...stylex.props(styles.question)}>Which would you rather wear?</h2>

      <div {...stylex.props(styles.options)}>
        {side(current.left, 'left', 'left')}
        {side(current.right, 'right', 'right')}
      </div>

      <div {...stylex.props(styles.actions)}>
        <button type="button" onClick={() => answer('left')} {...stylex.props(styles.button)}>
          Left
        </button>
        <button type="button" onClick={() => answer('none')} {...stylex.props(styles.button)}>
          No preference
        </button>
        <button type="button" onClick={() => answer('right')} {...stylex.props(styles.button)}>
          Right
        </button>
        {at > 0 && (
          <button type="button" onClick={back} {...stylex.props(styles.button)}>
            Back
          </button>
        )}
      </div>

      <p {...stylex.props(styles.hint)}>
        Arrow keys answer: left, right, down for no preference. Backspace goes back. Answer on
        instinct; there is no right answer, and a long think is worse data than a quick one.
      </p>
    </div>
  );
}
