import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

// The worker is plain JavaScript that reads `self`, `caches` and `fetch` as
// globals. It runs here in a vm context with fakes for those three, after the
// same header the build writes, so the tests exercise the text that ships.
const WORKER = readFileSync(resolve(import.meta.dirname, 'worker.js'), 'utf8');

interface FakeResponse {
  body: string;
}

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}

type Listener = (event: unknown) => void;

export interface FakeScope {
  install(): Promise<void>;
  activate(): Promise<void>;
  /** The response the worker gave, or null when it did not call `respondWith`. */
  fetchEvent(input: string | Partial<FakeRequest>): Promise<FakeResponse | null>;
  cacheNames(): string[];
  cachedUrls(name: string): string[];
  seedCache(name: string): void;
  fetched: string[];
  skipWaitingCalled: boolean;
  claimCalled: boolean;
}

export function loadWorker({
  precache = ['/', '/index.html', '/assets/a.js'],
  cache = 'huemi-test',
  origin = 'https://app.test',
}: { precache?: string[]; cache?: string; origin?: string } = {}): FakeScope {
  const stores = new Map<string, Map<string, FakeResponse>>();
  const listeners = new Map<string, Listener>();
  const scope: FakeScope = {
    fetched: [],
    skipWaitingCalled: false,
    claimCalled: false,
    cacheNames: () => [...stores.keys()],
    cachedUrls: (name) => [...(stores.get(name)?.keys() ?? [])],
    seedCache: (name) => void stores.set(name, new Map()),
    install: () => dispatch('install'),
    activate: () => dispatch('activate'),
    async fetchEvent(input) {
      const request: FakeRequest =
        typeof input === 'string'
          ? { url: origin + input, method: 'GET', mode: 'no-cors' }
          : { url: origin + '/', method: 'GET', mode: 'no-cors', ...input };
      const result: { response?: Promise<FakeResponse> } = {};
      listeners.get('fetch')?.({
        request,
        respondWith: (response: Promise<FakeResponse>) => {
          result.response = response;
        },
      });
      return result.response ? await result.response : null;
    },
  };

  async function dispatch(type: 'install' | 'activate'): Promise<void> {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)?.({ waitUntil: (work: Promise<unknown>) => pending.push(work) });
    await Promise.all(pending);
  }

  const keyOf = (input: string | FakeRequest) => {
    const url = new URL(typeof input === 'string' ? input : input.url, origin);
    return url.pathname + url.search;
  };

  const caches = {
    open(name: string) {
      const store = stores.get(name) ?? new Map<string, FakeResponse>();
      stores.set(name, store);
      return Promise.resolve({
        addAll(urls: string[]) {
          for (const url of urls) store.set(url, { body: url });
          return Promise.resolve();
        },
      });
    },
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
    match(input: string | FakeRequest) {
      const key = keyOf(input);
      for (const store of stores.values()) {
        const hit = store.get(key);
        if (hit) return Promise.resolve(hit);
      }
      return Promise.resolve(undefined);
    },
  };

  const self = {
    location: { origin },
    addEventListener: (type: string, listener: Listener) => void listeners.set(type, listener),
    skipWaiting: () => {
      scope.skipWaitingCalled = true;
      return Promise.resolve();
    },
    clients: {
      claim: () => {
        scope.claimCalled = true;
        return Promise.resolve();
      },
    },
  };

  const header = `const CACHE = ${JSON.stringify(cache)};\nconst PRECACHE = ${JSON.stringify(precache)};\n`;
  runInNewContext(header + WORKER, {
    self,
    caches,
    URL,
    fetch: (request: string | FakeRequest) => {
      const url = typeof request === 'string' ? request : request.url;
      const path = new URL(url, origin).pathname;
      scope.fetched.push(path);
      return Promise.resolve({ body: `network:${path}` });
    },
  });
  return scope;
}
