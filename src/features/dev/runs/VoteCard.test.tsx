import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SWIPE_THRESHOLD_PX } from '../../../ui/useBlockGestures';
import { VoteCard } from './VoteCard';

function setup() {
  const onAnswer = vi.fn();
  render(
    <VoteCard question="Would you wear these together?" onAnswer={onAnswer}>
      <p>The pair</p>
    </VoteCard>,
  );
  return onAnswer;
}

// A press that starts on the card's free area, which is what a swipe is.
function drag(dx: number, dy = 0) {
  const card = screen.getByRole('group', { name: 'Would you wear these together?' });
  const init = { pointerId: 1, bubbles: true };
  fireEvent(card, new PointerEvent('pointerdown', { ...init, clientX: 200, clientY: 100 }));
  fireEvent(
    window,
    new PointerEvent('pointermove', { ...init, clientX: 200 + dx, clientY: 100 + dy }),
  );
  fireEvent(
    window,
    new PointerEvent('pointerup', { ...init, clientX: 200 + dx, clientY: 100 + dy }),
  );
  fireEvent.click(card);
}

describe('VoteCard', () => {
  it('shows the question and what it was given', () => {
    setup();
    expect(screen.getByText('Would you wear these together?')).toBeInTheDocument();
    expect(screen.getByText('The pair')).toBeInTheDocument();
  });

  it('answers yes on a swipe to the right, once', () => {
    const onAnswer = setup();
    drag(SWIPE_THRESHOLD_PX + 1);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('answers no on a swipe to the left, once', () => {
    const onAnswer = setup();
    drag(-(SWIPE_THRESHOLD_PX + 1));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('ignores a mostly vertical drag', () => {
    const onAnswer = setup();
    drag(SWIPE_THRESHOLD_PX + 1, 200);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('answers from the Yes and No buttons', async () => {
    const user = userEvent.setup();
    const onAnswer = setup();
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(onAnswer.mock.calls).toEqual([[true], [false]]);
  });

  it('answers from the arrow keys when the card has focus', async () => {
    const user = userEvent.setup();
    const onAnswer = setup();
    screen.getByRole('group', { name: 'Would you wear these together?' }).focus();
    await user.keyboard('{ArrowRight}{ArrowLeft}');
    expect(onAnswer.mock.calls).toEqual([[true], [false]]);
  });
});
