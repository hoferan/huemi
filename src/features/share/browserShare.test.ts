import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserShare } from './browserShare';

const file = new File(['x'], 'huemi-outfit.png', { type: 'image/png' });

function stub(name: 'share' | 'canShare' | 'clipboard', value: unknown) {
  Object.defineProperty(navigator, name, { configurable: true, value });
}

afterEach(() => {
  // jsdom has none of them, so deleting the own property restores it.
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('browserShare', () => {
  it('reports no share sheet when navigator.share is missing', () => {
    expect(browserShare.canShare()).toBe(false);
    expect(browserShare.canShareFiles([file])).toBe(false);
  });

  it('asks navigator.canShare about files', () => {
    const canShare = vi.fn(() => true);
    stub('canShare', canShare);

    expect(browserShare.canShareFiles([file])).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
  });

  it('reads a completed share as shared', async () => {
    stub('share', () => Promise.resolve());

    await expect(browserShare.share({ text: 'Navy top.' })).resolves.toBe('shared');
  });

  it('reads a dismissed sheet as dismissed', async () => {
    stub('share', () => Promise.reject(new DOMException('', 'AbortError')));

    await expect(browserShare.share({ text: 'Navy top.' })).resolves.toBe('dismissed');
  });

  it('copies through the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stub('clipboard', { writeText });

    await expect(browserShare.copy('Navy top.')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('Navy top.');
  });

  it('reports a refused copy', async () => {
    stub('clipboard', { writeText: () => Promise.reject(new DOMException('', 'NotAllowedError')) });

    await expect(browserShare.copy('Navy top.')).resolves.toBe(false);
  });

  it('reports no clipboard', async () => {
    stub('clipboard', undefined);

    await expect(browserShare.copy('Navy top.')).resolves.toBe(false);
  });

  it('reads any other rejection as failed', async () => {
    stub('share', () => Promise.reject(new DOMException('', 'NotAllowedError')));

    await expect(browserShare.share({ text: 'Navy top.' })).resolves.toBe('failed');
  });
});
