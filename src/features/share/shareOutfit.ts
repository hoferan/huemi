import { SHARE_TITLE, type SharePort, type ShareResult } from './port';

export type ShareOutcome = ShareResult | 'downloaded' | 'downloadedAndCopied';

/**
 * Shares as much as the device can take: the image with the names and the
 * link, the names and the link alone, or failing a share sheet altogether, a
 * download of the image with the names and the link copied.
 *
 * The link goes in the text and not in `url`. Several share targets drop
 * `url` when a file comes with it, and Android joins the two into one
 * message, so a link in both would arrive twice.
 *
 * Without a share sheet the copy comes before the download: a browser that
 * asks where to save takes focus from the page, and the clipboard then
 * refuses the write.
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
    return port.share({ files: [image], title: SHARE_TITLE, text });
  }
  if (port.canShare()) return port.share({ title: SHARE_TITLE, text });
  const copied = port.copy(text);
  port.download(image);
  return copied.then((ok) => (ok ? 'downloadedAndCopied' : 'downloaded'));
}
