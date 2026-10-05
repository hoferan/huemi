import { use, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { ArrowLeft } from 'lucide-react';
import { tokens } from '../styles/tokens.stylex';
import { DevSlot } from './DevSlot';
import { InitialLocationContext } from './InitialLocationContext';
import { TrailLink } from './TrailLink';

const styles = stylex.create({
  main: {
    backgroundColor: tokens.bg,
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    // min-height, never height: content that outgrows the viewport has to be
    // scrollable to, which the 200% text size check in e2e/invariants.spec.ts
    // enforces.
    minHeight: '100dvh',
    // One column in a wide window (`tokens.column`); the page around it is
    // the surface grey, set on the body in index.css.
    width: '100%',
    maxWidth: tokens.column,
    marginInline: 'auto',
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
  // Three columns, the outer two equal, so the wordmark sits on the centre
  // line whatever a screen puts at the end. Apart, the arrow and the home
  // link cannot be mistaken for each other under a thumb.
  //
  // Only the 24px arrow shows; the rest of each 44px target is hit area. The
  // bar lets that area run 10px into the padding above and the gap below, so
  // the arrow sits where the heading used to, the heading sits the usual gap
  // below the arrow, and the bar costs a landscape phone 20px less height,
  // which is what keeps the confirm screen's buttons on screen there
  // (`e2e/features/confirm.feature`).
  bar: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    marginBlock: '-10px',
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    // Pulls the arrow's stroke, not its hit area, onto the content edge.
    marginInlineStart: '-10px',
    borderRadius: tokens.radius,
    color: tokens.ink,
  },
  start: { justifySelf: 'start', display: 'flex', alignItems: 'center' },
  home: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    justifyContent: 'center',
    paddingInline: '8px',
    color: tokens.ink,
    fontFamily: tokens.fontHeading,
    fontSize: tokens.textBody,
    textUnderlineOffset: '3px',
  },
  end: { justifySelf: 'end', display: 'flex', alignItems: 'center' },
});

/** Where a screen's back arrow goes, and the title of the screen it opens. */
export type BackTo = { to: string; title: string };

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
 *
 * `headingNote` becomes part of the heading's accessible name and is never
 * shown, for progress that is drawn rather than written, such as the outfit
 * check's four chips.
 *
 * `back` gives the screen its bar: an arrow to a fixed destination on the
 * left, the wordmark as a link home in the middle, and `header` at the end.
 * The destination is the screen's parent in the flow, never "wherever the
 * user came from", because an installed app opened on a deep link has no
 * history to go back to. `TrailLink` steps back through history when the
 * destination is already behind, so the system back button still makes
 * sense afterwards. The start screen and onboarding pass no `back`.
 */
export function Screen({
  title,
  documentTitle,
  header,
  headingNote,
  back,
  children,
}: {
  title: string;
  documentTitle?: string;
  header?: ReactNode;
  headingNote?: string;
  back?: BackTo;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const isInitialLocation = use(InitialLocationContext);

  useEffect(() => {
    document.title = `${documentTitle ?? title} — huemi`;
  }, [title, documentTitle]);

  // A single-page app keeps the scroll position across a navigation, so a
  // screen reached from a scrolled one would open partway down. Forward
  // navigations start at the top; a pop, including a back arrow that steps
  // back, is left to the browser, which restores where that screen was.
  useEffect(() => {
    if (isInitialLocation) return;
    if (navigationType !== NavigationType.Pop) window.scrollTo(0, 0);
    heading.current?.focus();
  }, [location, isInitialLocation, navigationType]);

  return (
    <main {...stylex.props(styles.main)}>
      {back ? (
        <div {...stylex.props(styles.bar)}>
          <div {...stylex.props(styles.start)}>
            <TrailLink
              to={back.to}
              aria-label={`Back to ${back.title}`}
              {...stylex.props(styles.back)}
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </TrailLink>
            <DevSlot name="screen.badge" context={{}} />
          </div>
          <TrailLink to="/" aria-label="huemi, home" {...stylex.props(styles.home)}>
            huemi
          </TrailLink>
          <div {...stylex.props(styles.end)}>{header}</div>
        </div>
      ) : (
        // No bar, so no developer chip here. Onboarding has neither bar nor
        // header, and someone in developer mode has already been through it.
        header
      )}
      {/* Headings carry no terminal punctuation; a heading that is itself a
          sentence pair, like onboarding's, keeps the stops between them. */}
      <h1
        tabIndex={-1}
        ref={heading}
        // Named directly on the heading instead of put in a hidden span:
        // Chromium adds a space before a comma that opens a block-level
        // child, and jsdom does not, so the accessible name and the
        // rendered text disagreed under test. This still gives a screen
        // reader the same progress a sighted user gets from something
        // drawn; the document title leaves it out.
        aria-label={headingNote ? `${title}, ${headingNote}` : undefined}
        {...stylex.props(styles.heading)}
      >
        {title}
      </h1>
      {children}
    </main>
  );
}
