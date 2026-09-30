import { useCallback, useEffect, useState } from 'react';

// Not in lib.dom: Chromium's event for "this app could be installed now".
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Whether the browser is offering to install the app, and a way to say yes.
 *
 * `preventDefault` holds back the browser's own mini bar. The app decides where
 * the offer shows, which is a quiet button on the entry screen, and two prompts
 * would race each other. Safari fires no such event, so nothing shows there.
 *
 * An installed app opens standalone and is never offered itself again.
 */
export function useInstallPrompt() {
  const [offer, setOffer] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;
    const onOffer = (event: Event) => {
      event.preventDefault();
      setOffer(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setOffer(null);
    window.addEventListener('beforeinstallprompt', onOffer);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onOffer);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!offer) return;
    await offer.prompt();
    await offer.userChoice;
    // An offer can be used once, whichever way the person answered.
    setOffer(null);
  }, [offer]);

  return { canInstall: offer !== null, install };
}
