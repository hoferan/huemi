import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

const slideUp = stylex.keyframes({
  from: { transform: 'translateY(calc(100% + 16px))' },
  to: { transform: 'none' },
});

const styles = stylex.create({
  toast: {
    position: 'fixed',
    left: '16px',
    right: '16px',
    bottom: '16px',
    zIndex: 10,
    maxWidth: '560px',
    marginInline: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '52px',
    paddingBlock: '4px',
    paddingInlineStart: '16px',
    paddingInlineEnd: '4px',
    borderRadius: tokens.radius,
    backgroundColor: tokens.primary,
    color: tokens.primaryFg,
    fontFamily: tokens.fontBody,
    fontSize: '0.95rem',
    animationName: slideUp,
    // Zero under reduced motion: the token carries the condition.
    animationDuration: tokens.toastSlide,
    animationTimingFunction: 'ease-out',
  },
  message: { margin: 0, flexGrow: 1 },
  action: {
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    paddingInline: '12px',
    borderStyle: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
});

// `:focus-visible` is unsupported in some engines, where the toast just
// treats every focus as not visible and lets the countdown run.
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

/**
 * One message at the bottom of the screen, with at most one action.
 *
 * Presentational: it knows nothing of the session, and `src/app/ToastHost.tsx`
 * decides what it says and what the action does. It is not a live region;
 * the shell's `Announcer` speaks the message, and a second region would say it
 * twice. That is also why this is not Radix Toast, which brings its own.
 *
 * The countdown stops while the pointer is over the toast, or while keyboard
 * focus is inside it, and starts again from the full dwell once both have
 * left, so an Undo cannot run out under someone who is reaching for it. A
 * tap that moves focus here programmatically (`focusAction`, on Delete) does
 * not count: nothing later moves that focus away on touch, so the hold would
 * never end and the toast would sit over whatever is under it. Browsers
 * already draw this distinction as `:focus-visible`, so the toast reads it
 * off the focused element instead of inventing its own rule.
 *
 * `onUnmount`, if given, fires once as this toast leaves, with whether focus
 * was inside it at that instant (any focus, not only `:focus-visible`: a
 * touch tap on Delete lands non-visible focus on Undo, and that toast can
 * still be replaced before anyone moves it). A layout effect's cleanup runs
 * before React detaches the DOM, so it reads focus before the browser's own
 * blur can move it, which a caller such as `ToastHost` uses to send focus
 * somewhere sane instead of leaving it to fall to `<body>`.
 */
export function Toast({
  message,
  action,
  dwellMs,
  onExpire,
  actionRef,
  onUnmount,
}: {
  message: string;
  action?: { label: string; onAction: () => void } | undefined;
  dwellMs: number;
  onExpire: () => void;
  actionRef?: Ref<HTMLButtonElement> | undefined;
  onUnmount?: ((hadFocus: boolean) => void) | undefined;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;
  const containerRef = useRef<HTMLDivElement>(null);

  // Latest callback in a ref, as in useBlockGestures, so a parent passing a
  // new function each render does not restart the countdown.
  const expire = useRef(onExpire);
  useLayoutEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (held) return;
    const timer = setTimeout(() => expire.current(), dwellMs);
    return () => clearTimeout(timer);
  }, [held, dwellMs]);

  // Runs as this instance unmounts, whether by its own dismissal or by a
  // parent swapping in a new toast under a new `key`. See `onUnmount` above
  // for why a layout effect and not a plain one.
  const unmount = useRef(onUnmount);
  useLayoutEffect(() => {
    unmount.current = onUnmount;
  });
  useLayoutEffect(() => {
    // Captured here, not read from the ref in the cleanup: the container
    // never changes across this instance's own re-renders, and reading it now
    // means the check does not depend on whether React has already cleared
    // the ref by the time cleanup runs.
    const container = containerRef.current;
    return () => {
      unmount.current?.(container?.contains(document.activeElement) ?? false);
    };
  }, []);

  return (
    // The pointer handlers only pause the dismiss timer; the element does
    // nothing when used, so it does not need the interaction semantics
    // jsx-a11y checks for here.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={containerRef}
      data-toast=""
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // The action is the only focusable thing inside, so a blur always
      // means focus has left the toast. A focus only holds the countdown
      // when it is `:focus-visible`: keyboard focus, not a tap's programmatic
      // focus, which is how Delete moves focus here without trapping it on
      // touch.
      onFocus={(event) => {
        setFocused(isFocusVisible(event.target));
      }}
      onBlur={() => setFocused(false)}
      {...stylex.props(styles.toast)}
    >
      <p {...stylex.props(styles.message)}>{message}</p>
      {action && (
        <button
          type="button"
          ref={actionRef}
          onClick={action.onAction}
          {...stylex.props(styles.action)}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
