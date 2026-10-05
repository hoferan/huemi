import { describe, expect, it } from 'vitest';
import { fakeSharePort } from './fakeShare.testing';
import { shareOutfit } from './shareOutfit';

const image = new File(['x'], 'huemi-outfit.png', { type: 'image/png' });

describe('shareOutfit', () => {
  it('shares the image and the text when the device can share files', async () => {
    const port = fakeSharePort();

    await expect(shareOutfit(port, image, 'Navy top.')).resolves.toBe('shared');
    expect(port.calls.share).toEqual([
      { files: [image], title: 'huemi outfit', text: 'Navy top.' },
    ]);
  });

  it('shares the text alone when the device cannot share files', async () => {
    const port = fakeSharePort({ canShareFiles: () => false });

    await expect(shareOutfit(port, image, 'Navy top.')).resolves.toBe('shared');
    expect(port.calls.share).toEqual([{ title: 'huemi outfit', text: 'Navy top.' }]);
  });

  it('downloads the image when the device has no share sheet', async () => {
    const port = fakeSharePort({ canShareFiles: () => false, canShare: () => false });

    await expect(shareOutfit(port, image, 'Navy top.')).resolves.toBe('downloaded');
    expect(port.calls.download).toEqual([image]);
    expect(port.calls.share).toEqual([]);
  });

  it('passes on a dismissed or failed share', async () => {
    const dismissed = fakeSharePort({ share: () => Promise.resolve('dismissed') });
    const failed = fakeSharePort({ share: () => Promise.resolve('failed') });

    await expect(shareOutfit(dismissed, image, 'Navy top.')).resolves.toBe('dismissed');
    await expect(shareOutfit(failed, image, 'Navy top.')).resolves.toBe('failed');
  });

  // Safari refuses navigator.share once the tap's user activation has been
  // spent on an await, so the share has to start in the same task as the tap.
  it('calls share before its first await', () => {
    const port = fakeSharePort();

    void shareOutfit(port, image, 'Navy top.');

    expect(port.calls.share).toHaveLength(1);
  });
});
