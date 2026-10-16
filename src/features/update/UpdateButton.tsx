import { Button } from '../../ui/Button';
import { useUpdateReady } from './useUpdateReady';

/**
 * A quiet way to switch to a new version that is waiting, on the start screen
 * only, where nothing is in progress and a reload loses nothing. Like the
 * install button it renders nothing when there is nothing to do.
 */
export function UpdateButton() {
  const { ready, restart } = useUpdateReady();
  if (!ready) return null;
  return <Button variant="quiet" label="Update huemi" onClick={restart} />;
}
