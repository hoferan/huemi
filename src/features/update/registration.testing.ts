import { vi } from 'vitest';

// A service worker as the page sees it: a state that changes, a statechange
// event when it does, and postMessage.
export function fakeWorker(state: ServiceWorkerState) {
  const worker = Object.assign(new EventTarget(), {
    state,
    postMessage: vi.fn(),
    become(next: ServiceWorkerState) {
      worker.state = next;
      worker.dispatchEvent(new Event('statechange'));
    },
  });
  return worker;
}

type FakeWorker = ReturnType<typeof fakeWorker>;

// The page's registration: the worker in each slot, update(), and find() to do
// what the browser does when it fetches a changed sw.js.
export function fakeRegistration({
  active = null,
  waiting = null,
}: {
  active?: FakeWorker | null;
  waiting?: FakeWorker | null;
}) {
  const registration = Object.assign(new EventTarget(), {
    active,
    waiting,
    installing: null as FakeWorker | null,
    // Typed as a plain function so a test can swap in one that rejects: a
    // vi.fn() handles its own promises, which would hide a missing catch.
    update: vi.fn().mockResolvedValue(undefined) as () => Promise<void>,
    find(next: FakeWorker) {
      registration.installing = next;
      registration.dispatchEvent(new Event('updatefound'));
    },
  });
  return registration;
}
