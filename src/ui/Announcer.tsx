import { createContext, use, useCallback, useState } from 'react';
import type { ReactNode } from 'react';

const AnnounceContext = createContext<((message: string) => void) | null>(null);

/**
 * A polite live region and the function that writes to it.
 *
 * This is NOT how a screen transition is announced. Moving focus to the new
 * screen's heading already makes a screen reader read it, and a live region
 * saying the same words would say them twice. This is for the things that
 * change with no focus move: a toast, or a status line whose content was
 * re-sorted under the user.
 *
 * `assertive` is deliberately not offered. Nothing in this app is urgent
 * enough to interrupt someone mid-sentence.
 */
export function Announcer({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useCallback((next: string) => {
    // Announcing the same words twice in a row has to change the DOM, or a
    // screen reader sees no mutation and stays silent. Alternating a trailing
    // no-break space is the smallest change that is never read aloud. The
    // comparison has to be against the raw current value, not a trimmed one:
    // trimming would make the no-break-space state compare equal to the
    // plain one, so a third identical announcement would collapse back onto
    // the state it already holds and produce no DOM mutation.
    setMessage((current) => (current === next ? `${next}\u00a0` : next));
  }, []);
  return (
    <AnnounceContext value={announce}>
      {children}
      <p role="status" aria-live="polite" style={SR_ONLY}>
        {message}
      </p>
    </AnnounceContext>
  );
}

export function useAnnounce(): (message: string) => void {
  const announce = use(AnnounceContext);
  if (!announce) throw new Error('useAnnounce needs an Announcer above it');
  return announce;
}

// Inline rather than StyleX: a visually hidden region has to keep its
// dimensions and clip exactly, and this is the one place in the app where the
// style is a screen-reader contract rather than a design decision.
const SR_ONLY = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
