import type { KeyboardEvent, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { blockControl, useBlockGestures } from '../../../ui/useBlockGestures';
import { NO, SWIPE_HINT, YES } from './copy';

const styles = stylex.create({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    // Vertical drags stay the page's: scrolling is not a vote.
    touchAction: 'pan-y',
  },
  question: { fontFamily: tokens.fontHeading, fontSize: tokens.textBody, margin: 0 },
  hint: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody },
  answers: { display: 'flex', gap: '16px' },
  answer: { flex: '1' },
});

/**
 * A yes-or-no question about what is on the card. A swipe right says yes and
 * a swipe left says no, with the arrow keys for the same when the card has
 * focus, and Yes and No buttons that are always there: a swipe is never the
 * only way to answer (A11Y.md).
 *
 * The card is not itself a button, so the click a swipe releases into has
 * nothing to press and needs no suppressing. The card does not move under the
 * finger either, so there is no motion to gate on `prefers-reduced-motion`.
 */
export function VoteCard({
  question,
  children,
  onAnswer,
}: {
  question: string;
  children: ReactNode;
  onAnswer: (yes: boolean) => void;
}) {
  const gestures = useBlockGestures({
    // A leftward drag is delta 1 and a rightward one is -1.
    onSwipe: (delta) => onAnswer(delta === -1),
    onLongPress: () => {},
    enabled: true,
  });

  function key(event: KeyboardEvent<HTMLElement>) {
    // The card's own keys only: an arrow on a focused button is not a vote.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowRight') onAnswer(true);
    else if (event.key === 'ArrowLeft') onAnswer(false);
    else return;
    event.preventDefault();
  }

  return (
    // The card takes focus so the arrow keys can answer. It is a group, not a
    // control: the buttons inside are the real controls, and the keys are the
    // shortcut for them (A11Y.md: a swipe has a control).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="group"
      aria-label={question}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onKeyDown={key}
      {...gestures}
      {...stylex.props(styles.card)}
    >
      <p {...stylex.props(styles.question)}>{question}</p>
      {children}
      {/* A press on either button is the button's, not a swipe's. */}
      <div {...blockControl} {...stylex.props(styles.answers)}>
        <div {...stylex.props(styles.answer)}>
          <Button label={NO} variant="secondary" onClick={() => onAnswer(false)} />
        </div>
        <div {...stylex.props(styles.answer)}>
          <Button label={YES} onClick={() => onAnswer(true)} />
        </div>
      </div>
      <p {...stylex.props(styles.hint)}>{SWIPE_HINT}</p>
    </div>
  );
}
