import type { Location } from 'react-router';

/** The history state a `Redirect` leaves on the entry it replaces. */
export const REDIRECT_STATE = { redirect: true } as const;

/** Whether this location was reached by a `Redirect` rather than by the user. */
export function isRedirect(location: Location): boolean {
  const state: unknown = location.state;
  return typeof state === 'object' && state !== null && 'redirect' in state;
}
