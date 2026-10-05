import { SHARE_TITLE, type SharePort, type ShareResult } from './port';

export type ShareOutcome = ShareResult | 'downloaded';

/**
 * Shares as much as the device can take: the image and the text, the text
 * alone, or failing a share sheet altogether, a download of the image.
 *
 * Not async on purpose. Safari refuses `navigator.share` once the tap's user
 * activation has gone through an await, so the share starts before this
 * function gives up the thread, and a caller holding a ready image keeps
 * the activation.
 */
export function shareOutfit(port: SharePort, image: File, text: string): Promise<ShareOutcome> {
  if (port.canShareFiles([image])) {
    return port.share({ files: [image], title: SHARE_TITLE, text });
  }
  if (port.canShare()) return port.share({ title: SHARE_TITLE, text });
  port.download(image);
  return Promise.resolve('downloaded');
}
