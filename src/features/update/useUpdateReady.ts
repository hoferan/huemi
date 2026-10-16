import { useSyncExternalStore } from 'react';

// Often enough that an app left in the background for a day finds the new
// version the next time it comes back, rarely enough that switching between
// apps does not fetch sw.js every time.
const RECHECK_MS = 60 * 60 * 1000;

type Worker = Pick<ServiceWorker, 'state' | 'postMessage' | 'addEventListener'>;

/** The parts of a `ServiceWorkerRegistration` this reads. */
export interface Registration extends Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
> {
  readonly active: object | null;
  readonly waiting: Worker | null;
  readonly installing: Worker | null;
  update(): Promise<unknown>;
}

// Module state, like the install offer: the worker is registered once per page
// load, long before the start screen that shows the button may be mounted.
let restart: (() => void) | null = null;
const subscribers = new Set<() => void>();

function setRestart(next: (() => void) | null) {
  restart = next;
  subscribers.forEach((notify) => notify());
}

/**
 * Watches the registration for a new version that has installed and is
 * waiting for the old one to close, and offers a way to switch to it now.
 *
 * The browser checks for a new sw.js on every page load, but a phone usually
 * brings an installed app back from the background without one, so this also
 * asks for a check when the app becomes visible again after an hour.
 *
 * Returns a function that stops watching, for tests.
 */
export function watchForUpdates(
  registration: Registration,
  {
    container = navigator.serviceWorker,
    // jsdom cannot reload a page, so every test passes its own.
    /* v8 ignore start */
    reload = () => window.location.reload(),
    /* v8 ignore stop */
    now = Date.now,
  }: {
    container?: Pick<EventTarget, 'addEventListener'>;
    reload?: () => void;
    now?: () => number;
  } = {},
): () => void {
  const offer = (worker: Worker) =>
    setRestart(() => {
      // Only the window where someone tapped reloads. Listening any earlier
      // would reload this window whenever another one switched versions.
      container.addEventListener('controllerchange', () => reload(), { once: true });
      worker.postMessage({ type: 'skip-waiting' });
    });

  if (registration.waiting) offer(registration.waiting);

  const onUpdateFound = () => {
    const next = registration.installing;
    if (!next) return;
    next.addEventListener('statechange', () => {
      // With no active worker this is the first install, and there is nothing
      // older to update from.
      if (next.state === 'installed' && registration.active) offer(next);
    });
  };
  registration.addEventListener('updatefound', onUpdateFound);

  let checked = now();
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible' || now() - checked < RECHECK_MS) return;
    checked = now();
    // Offline, the check fails. The next one will try again.
    registration.update().catch(() => undefined);
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    registration.removeEventListener('updatefound', onUpdateFound);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    setRestart(null);
  };
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => void subscribers.delete(notify);
}

/**
 * Whether a new version is waiting, and a way to switch to it. `restart` does
 * nothing when none is.
 */
export function useUpdateReady() {
  const current = useSyncExternalStore(subscribe, () => restart);
  return { ready: current !== null, restart: () => current?.() };
}
