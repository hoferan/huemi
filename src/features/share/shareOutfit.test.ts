import { describe, expect, it } from 'vitest';
import { fakeSharePort } from './fakeShare.testing';
import { shareOutfit } from './shareOutfit';

const image = new File(['x'], 'huemi-outfit.png', { type: 'image/png' });
const LINK = 'https://huemi.app/shared?top=1f2a44&base=top';
const TEXT = `Navy top. ${LINK}`;

describe('shareOutfit', () => {
  it('shares the image, the names with the link, and the link', async () => {
    const port = fakeSharePort();

    await expect(shareOutfit(port, image, 'Navy top.', LINK)).resolves.toBe('shared');
    expect(port.calls.share).toEqual([
      { files: [image], title: 'huemi outfit', text: TEXT, url: LINK },
    ]);
  });

  it('shares the names with the link when the device cannot share files', async () => {
    const port = fakeSharePort({ canShareFiles: () => false });

    await expect(shareOutfit(port, image, 'Navy top.', LINK)).resolves.toBe('shared');
    expect(port.calls.share).toEqual([{ title: 'huemi outfit', text: TEXT, url: LINK }]);
  });

  it('downloads the image and copies the names with the link without a share sheet', async () => {
    const port = fakeSharePort({ canShareFiles: () => false, canShare: () => false });

    await expect(shareOutfit(port, image, 'Navy top.', LINK)).resolves.toBe('downloadedAndCopied');
    expect(port.calls.download).toEqual([image]);
    expect(port.calls.copy).toEqual([TEXT]);
    expect(port.calls.share).toEqual([]);
  });

  it('says only Image saved when the copy fails', async () => {
    const port = fakeSharePort({
      canShareFiles: () => false,
      canShare: () => false,
      copy: () => Promise.resolve(false),
    });

    await expect(shareOutfit(port, image, 'Navy top.', LINK)).resolves.toBe('downloaded');
  });

  it('passes on a dismissed or failed share', async () => {
    const dismissed = fakeSharePort({ share: () => Promise.resolve('dismissed') });
    const failed = fakeSharePort({ share: () => Promise.resolve('failed') });

    await expect(shareOutfit(dismissed, image, 'Navy top.', LINK)).resolves.toBe('dismissed');
    await expect(shareOutfit(failed, image, 'Navy top.', LINK)).resolves.toBe('failed');
  });

  // Safari refuses navigator.share once the tap's user activation has been
  // spent on an await, so the share has to start in the same task as the tap.
  it('calls share before its first await', () => {
    const port = fakeSharePort();

    void shareOutfit(port, image, 'Navy top.', LINK);

    expect(port.calls.share).toHaveLength(1);
  });

  // The clipboard asks for the same activation.
  it('copies before its first await', () => {
    const port = fakeSharePort({ canShareFiles: () => false, canShare: () => false });

    void shareOutfit(port, image, 'Navy top.', LINK);

    expect(port.calls.copy).toHaveLength(1);
  });
});
