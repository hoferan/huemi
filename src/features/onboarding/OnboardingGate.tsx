import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { localPreferences } from '../../storage/localPreferences';

/**
 * Three states, not two. The store is async, so "onboarded" and "not
 * onboarded" are joined by "not known yet", and collapsing that third state
 * into either of the others picks a screen before the answer exists: assume
 * onboarded and a first-time visitor sees the entry screen flash past;
 * assume not and everyone else gets a flash of onboarding they finished
 * months ago.
 *
 * Rendering nothing while unknown is honest about that. It lasts one
 * microtask today because the store is `localStorage` behind a promise. A
 * store that genuinely waited would need a visible loading state here, and
 * the missing one would be obvious rather than silent.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    void localPreferences.hasOnboarded().then((value) => {
      if (live) setOnboarded(value);
    });
    return () => {
      live = false;
    };
  }, []);

  if (onboarded === null) return null;
  if (!onboarded) return <Navigate to="/welcome" replace />;
  return children;
}
