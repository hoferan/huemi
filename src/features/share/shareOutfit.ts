import { SHARE_TITLE, type SharePort, type ShareResult } from './port';

export type ShareOutcome = ShareResult | 'downloaded' | 'downloadedAndCopied';

/**
 * Shares as much as the device can take: the image with the names and the
 * link, the names and the link alone, or failing a share sheet altogether, a
 * download of the image with the names and the link copied.
 *
 * The link goes in the text as well as in `url`, because several share
 * targets drop `url` when a file comes with it.
 *
 * Not async on purpose. Safari refuses `navigator.share` once the tap's user
 * activation has gone through an await, and a clipboard write asks for the
 * same activation, so both start before this function gives up the thread.
 */
export function shareOutfit(
  port: SharePort,
  image: File,
  names: string,
  link: string,
): Promise<ShareOutcome> {
  const text = `${names} ${link}`;
  if (port.canShareFiles([image])) {
    return port.share({ files: [image], title: SHARE_TITLE, text, url: link });
  }
  if (port.canShare()) return port.share({ title: SHARE_TITLE, text, url: link });
  port.download(image);
  return port.copy(text).then((copied) => (copied ? 'downloadedAndCopied' : 'downloaded'));
}
