import { act, createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Toast', () => {
  it('shows its message and expires after its dwell', () => {
    const onExpire = vi.fn();
    render(<Toast message="Saved" dwellMs={2500} onExpire={onExpire} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('has no button without an action', () => {
    render(<Toast message="Saved" dwellMs={2500} onExpire={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('runs its action', () => {
    const onAction = vi.fn();
    render(
      <Toast
        message="Deleted Navy bottom"
        action={{ label: 'Undo', onAction }}
        dwellMs={5000}
        onExpire={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('hands its action button to the caller', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Toast
        message="m"
        action={{ label: 'Undo', onAction: vi.fn() }}
        dwellMs={5000}
        onExpire={vi.fn()}
        actionRef={ref}
      />,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Undo' }));
  });

  // WCAG 2.2.1: a message with an action must not run out while someone is
  // reaching for it. The countdown restarts in full when they leave.
  it('holds while the pointer is over it', () => {
    const onExpire = vi.fn();
    render(<Toast message="Saved" dwellMs={2500} onExpire={onExpire} />);
    fireEvent.pointerEnter(screen.getByText('Saved'));
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onExpire).not.toHaveBeenCalled();
    fireEvent.pointerLeave(screen.getByText('Saved'));
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  // jsdom does not track real focus-visible heuristics, so keyboard focus is
  // simulated by stubbing `matches` for that one selector.
  function stubFocusVisible(visible: boolean) {
    // Detached on purpose: called below with `.call(this, …)`, against
    // whatever element the mock is invoked on, not against the prototype.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const real = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ':focus-visible' ? visible : real.call(this, selector);
    });
  }

  it('holds while keyboard focus is inside it', () => {
    stubFocusVisible(true);
    const onExpire = vi.fn();
    render(
      <>
        <Toast
          message="m"
          action={{ label: 'Undo', onAction: vi.fn() }}
          dwellMs={5000}
          onExpire={onExpire}
        />
        <button type="button">elsewhere</button>
      </>,
    );
    act(() => screen.getByRole('button', { name: 'Undo' }).focus());
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => screen.getByRole('button', { name: 'elsewhere' }).focus());
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  // A browser that cannot parse the selector throws from `matches`. The toast
  // then treats the focus as not keyboard-visible and lets the dwell run.
  it('does not hold when the browser cannot evaluate :focus-visible', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const real = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      if (selector === ':focus-visible') throw new SyntaxError('unsupported selector');
      return real.call(this, selector);
    });
    const onExpire = vi.fn();
    render(
      <Toast
        message="m"
        action={{ label: 'Undo', onAction: vi.fn() }}
        dwellMs={5000}
        onExpire={onExpire}
      />,
    );
    act(() => {
      screen.getByRole('button', { name: 'Undo' }).focus();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  // A tap moves focus to Undo in code (`focusAction`), and that is not
  // `:focus-visible`, so a touch user must not be stuck with the toast
  // forever because nothing moves focus away afterwards.
  it('does not hold on focus that is not keyboard-visible', () => {
    stubFocusVisible(false);
    const onExpire = vi.fn();
    render(
      <Toast
        message="m"
        action={{ label: 'Undo', onAction: vi.fn() }}
        dwellMs={5000}
        onExpire={onExpire}
      />,
    );
    act(() => screen.getByRole('button', { name: 'Undo' }).focus());
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  // The shell's Announcer speaks the message. A role here would make a
  // second live region and a screen reader would hear the toast twice.
  it('is not a live region of its own', () => {
    render(<Toast message="Saved" dwellMs={2500} onExpire={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
