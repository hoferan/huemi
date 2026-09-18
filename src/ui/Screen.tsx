import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

const styles = stylex.create({
  main: {
    backgroundColor: tokens.bg,
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    // min-height, never height: content that outgrows the viewport has to be
    // scrollable to, which the 200% text size check in e2e/invariants.spec.ts
    // enforces.
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  heading: {
    fontFamily: tokens.fontHeading,
    // rem, so the browser's text size setting reaches it. A px type scale
    // would make the 200% check vacuous.
    fontSize: '1.5rem',
    lineHeight: 1.1,
    margin: 0,
    // The heading takes focus programmatically. Removing the ring would hide
    // where focus went, which is the whole point of moving it.
    outlineOffset: '2px',
  },
});

/**
 * The screen-transition contract, on the receiving end of a navigation rather
 * than the sending end.
 *
 * The prototype swaps branches inside one component, so focus lands nowhere
 * and a screen reader announces nothing. The obvious repair is a navigate
 * wrapper that moves focus, but any plain `<Link>` bypasses it. Putting the
 * move here means a screen cannot be reached without it.
 *
 * Focus moves only after a client-side navigation. React Router gives the
 * first entry the location key `default`, and stealing focus on first load
 * would drag a keyboard user past the browser chrome they had not left yet.
 *
 * Focusing the heading is also the announcement: a screen reader reads a
 * focused element, so routing this through the live region as well would say
 * the screen name twice.
 */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { key } = useLocation();

  useEffect(() => {
    document.title = `${title} — huemi`;
  }, [title]);

  useEffect(() => {
    if (key === 'default') return;
    heading.current?.focus();
  }, [key]);

  return (
    <main {...stylex.props(styles.main)}>
      <h1 tabIndex={-1} ref={heading} {...stylex.props(styles.heading)}>
        {title}
      </h1>
      {children}
    </main>
  );
}
