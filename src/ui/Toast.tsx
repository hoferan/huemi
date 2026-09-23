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

/**
 * One message at the bottom of the screen, with at most one action.
 *
 * Presentational: it knows nothing of the session, and `src/app/ToastHost.tsx`
 * decides what it says and what the action does. It is not a live region;
 * the shell's `Announcer` speaks the message, and a second region would say it
 * twice. That is also why this is not Radix Toast, which brings its own.
 *
 * The countdown stops while the pointer is over the toast or focus is inside
 * it, and starts again from the full dwell once both have left, so an Undo
 * cannot run out under someone who is reaching for it.
 */
export function Toast({
  message,
  action,
  dwellMs,
  onExpire,
  actionRef,
}: {
  message: string;
  action?: { label: string; onAction: () => void } | undefined;
  dwellMs: number;
  onExpire: () => void;
  actionRef?: Ref<HTMLButtonElement> | undefined;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;

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

  return (
    // The pointer handlers only pause the dismiss timer; the element does
    // nothing when used, so it does not need the interaction semantics
    // jsx-a11y checks for here.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-toast=""
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // The action is the only focusable thing inside, so a blur always
      // means focus has left the toast.
      onFocus={() => setFocused(true)}
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
