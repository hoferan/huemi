import { Button } from '../../ui/Button';
import { useInstallPrompt } from './useInstallPrompt';

/**
 * A quiet way to install, on the entry screen only. It renders nothing rather
 * than a disabled control when the browser is not offering, so it never asks
 * for something that cannot happen.
 */
export function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return <Button variant="quiet" label="Install huemi" onClick={() => void install()} />;
}
