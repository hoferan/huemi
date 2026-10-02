import { use } from 'react';
import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { LinkProps } from 'react-router';
import { stepsBackTo } from './trail';
import { HistoryTrailContext } from './HistoryTrailContext';

/**
 * A link to a fixed destination that steps back through history when the
 * destination is already behind the current entry, and opens it otherwise.
 *
 * Still a real `<Link>`, so the href, the role and a modified click (a new
 * tab, say) behave as any link's do; only a plain click is taken over. `to`
 * is a string written the way the app navigates to it, path then search,
 * because that is what the trail records and compares against.
 */
export function TrailLink({ to, onClick, ...rest }: Omit<LinkProps, 'to'> & { to: string }) {
  const trail = use(HistoryTrailContext);
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    const plain =
      event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
    const steps = trail && stepsBackTo(trail, to);
    if (event.defaultPrevented || !plain || steps === null) return;
    event.preventDefault();
    void navigate(steps);
  }

  return <Link to={to} onClick={handleClick} {...rest} />;
}
