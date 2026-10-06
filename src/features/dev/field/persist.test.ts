import { describe, expect, it, vi } from 'vitest';
import { persistOnce } from './persist';

describe('persistOnce', () => {
  it('asks the browser once however often it is called', () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const ask = persistOnce(() => ({ persist }));
    ask();
    ask();
    ask();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does nothing where the browser has no storage manager or no persist', () => {
    expect(() => persistOnce(() => undefined)()).not.toThrow();
    expect(() => persistOnce(() => ({}))()).not.toThrow();
  });

  it('swallows a refusal and a throw', async () => {
    const rejected = vi.fn(() => Promise.reject(new Error('no')));
    persistOnce(() => ({ persist: rejected }))();
    // An unhandled rejection would fail the run after this tick.
    await Promise.resolve();
    expect(rejected).toHaveBeenCalledTimes(1);
    const thrown = vi.fn((): Promise<boolean> => {
      throw new Error('no');
    });
    expect(() => persistOnce(() => ({ persist: thrown }))()).not.toThrow();
  });
});
