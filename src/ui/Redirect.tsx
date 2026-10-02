import { Navigate } from 'react-router';
import { REDIRECT_STATE } from './redirectState';

/**
 * Sends a screen that cannot render here somewhere it can, replacing the
 * entry rather than adding one.
 *
 * Marked in the history state, because a redirect takes nobody anywhere: on a
 * first load it is still the page the user arrived on, and `InitialLocation`
 * has to know that, or `Screen` takes focus from a page nobody has touched.
 * `eslint.config.js` keeps `Navigate` to this file, so no redirect goes
 * unmarked.
 */
export function Redirect({ to }: { to: string }) {
  return <Navigate to={to} replace state={REDIRECT_STATE} />;
}
