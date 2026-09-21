import { use, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import { InitialLocationContext } from './InitialLocationContext';

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
    fontSize: tokens.textHeading,
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
 * Focus moves only after a client-side navigation, because stealing it on
 * first load would drag a keyboard user past the browser chrome they had not
 * left yet. `InitialLocation` is what says which load is the first one; the
 * location key cannot, since the first history entry reports the key
 * `default` again when the user comes back to it.
 *
 * Focusing the heading is also the announcement: a screen reader reads a
 * focused element, so routing this through the live region as well would say
 * the screen name twice.
 *
 * `header` is a slot rather than chrome in the shell, because onboarding
 * shows no app chrome at all and later screens need different chrome. It
 * renders inside the landmark and above the heading, so the heading stays
 * the first thing focus lands on.
 */
export function Screen({
  title,
  documentTitle,
  header,
  children,
}: {
  title: string;
  documentTitle?: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const isInitialLocation = use(InitialLocationContext);

  useEffect(() => {
    document.title = `${documentTitle ?? title} — huemi`;
  }, [title, documentTitle]);

  useEffect(() => {
    if (isInitialLocation) return;
    heading.current?.focus();
  }, [location, isInitialLocation]);

  return (
    <main {...stylex.props(styles.main)}>
      {header}
      {/* Headings carry no terminal punctuation; a heading that is itself a
          sentence pair, like onboarding's, keeps the stops between them. */}
      <h1 tabIndex={-1} ref={heading} {...stylex.props(styles.heading)}>
        {title}
      </h1>
      {children}
    </main>
  );
}
