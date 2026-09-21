import { useSearchParams } from 'react-router';
import { SLOTS, type Slot } from '../../model/types';

/**
 * The slot the user chose, carried in the URL rather than in the session.
 *
 * A search parameter and not a path segment: `src/app/routes.test.tsx`
 * compares the route table with `e2e/routes.ts` by exact path, and a
 * parameterised path has none to compare, which would quietly drop this screen
 * out of the accessibility checks. Carrying it in the URL at all, rather than
 * in the reducer, means a refresh on the picker does not lose the answer to
 * the question the previous screen asked.
 *
 * Validated here because the URL is user input: `SLOTS` is the authority, and
 * anything else is treated as absent so the screen can redirect rather than
 * render against a slot that does not exist.
 */
export function useSlotParam(): Slot | null {
  const [params] = useSearchParams();
  const value = params.get('slot');
  return SLOTS.find((slot) => slot === value) ?? null;
}
