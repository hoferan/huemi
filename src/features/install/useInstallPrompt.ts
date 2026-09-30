import { useSyncExternalStore } from 'react';

// Not in lib.dom: Chromium's event for "this app could be installed now".
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// The offer lives here, not in a component. Chrome fires the event once per page
// load, wherever the person happens to be by then: on the welcome screen, or
// already off on the color picker. A component that only listened while mounted
// would miss it, and the browser's own bar has been held back by then.
let offer: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function setOffer(next: BeforeInstallPromptEvent | null) {
  offer = next;
  subscribers.forEach((notify) => notify());
}

/** Forgets the offer. It can be used once, whichever way the person answered. */
export function clearInstallOffer() {
  setOffer(null);
}

if (typeof window !== 'undefined') {
  // An installed app opens standalone and is never offered itself again.
  window.addEventListener('beforeinstallprompt', (event) => {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;
    // The app decides where the offer shows, a quiet button on the entry
    // screen, so the browser's own mini bar is held back rather than racing it.
    event.preventDefault();
    setOffer(event as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', clearInstallOffer);
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => void subscribers.delete(notify);
}

async function install() {
  const current = offer;
  if (!current) return;
  await current.prompt();
  await current.userChoice;
  clearInstallOffer();
}

/**
 * Whether the browser is offering to install the app, and a way to say yes.
 * Safari fires no such event, so nothing shows there.
 */
export function useInstallPrompt() {
  const current = useSyncExternalStore(subscribe, () => offer);
  return { canInstall: current !== null, install };
}
