import type { FieldCapture, FieldGarment } from '../../../model/field';
import { encodeFieldCapture } from '../../../model/fieldExport';
import type { FieldStore } from '../../../storage/port';
import type { SharePort, ShareResult } from '../../share/port';
import { EXPORT_TITLE } from './copy';
import { gzipChunks } from './gzip';

export type ExportOutcome = ShareResult | 'downloaded';

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date, since that is the day the person exporting would name. */
export function exportFileName(now: Date): string {
  return `huemi-field-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json.gz`;
}

type Chunks = AsyncIterable<Uint8Array<ArrayBuffer>>;

/**
 * The export's JSON in pieces: the head with the garments, then each capture
 * with its frame, then the tail. A frame is read only when the piece before
 * it has been taken, so memory holds one frame at a time.
 * The text is what `encodeFieldExport` writes for the same set, which its
 * test checks. A frame that cannot be read throws.
 */
async function* exportChunks(
  store: FieldStore,
  head: { exportedAt: string; setId: string; garments: FieldGarment[] },
  captures: readonly FieldCapture[],
): Chunks {
  const text = new TextEncoder();
  yield text.encode(
    `{"version":1,"exportedAt":${JSON.stringify(head.exportedAt)},` +
      `"setId":${JSON.stringify(head.setId)},` +
      `"garments":${JSON.stringify(head.garments)},"captures":[`,
  );
  for (const [i, capture] of captures.entries()) {
    const read = await store.readPixels(capture.id);
    if (!read.ok) throw new Error(read.reason);
    yield text.encode(
      (i === 0 ? '' : ',') + encodeFieldCapture({ ...capture, pixels: read.value }),
    );
  }
  yield text.encode(']}');
}

/**
 * Everything the field recorder holds, as one gzipped file. A frame that
 * cannot be read fails the whole export, so no capture leaves without its
 * frame. The frames stream through the compressor one at a time, so the
 * memory it takes is about one frame and the compressed file.
 */
export async function buildFieldExport({
  store,
  compress = gzipChunks,
  now = new Date(),
}: {
  store: FieldStore;
  compress?: (chunks: Chunks) => Promise<Uint8Array<ArrayBuffer>>;
  now?: Date;
}): Promise<File | 'failed'> {
  const [garments, captures, setId] = await Promise.all([
    store.listGarments(),
    store.listCaptures(),
    store.setId(),
  ]);
  if (!garments.ok || !captures.ok || !setId.ok) return 'failed';
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await compress(
      exportChunks(
        store,
        { exportedAt: now.toISOString(), setId: setId.value, garments: garments.value },
        captures.value,
      ),
    );
  } catch {
    return 'failed';
  }
  return new File([bytes], exportFileName(now), { type: 'application/gzip' });
}

/**
 * Sends a built export to the share sheet where it takes files, and to a
 * download otherwise.
 *
 * Not async, for the reason `shareOutfit` gives: Safari refuses
 * `navigator.share` once the tap's user activation has gone through an
 * await, so the share starts before this returns. Building the file takes
 * several awaits, which is why it is a separate step on a separate tap.
 */
export function deliverFieldExport(share: SharePort, file: File): Promise<ExportOutcome> {
  if (share.canShareFiles([file])) return share.share({ files: [file], title: EXPORT_TITLE });
  share.download(file);
  return Promise.resolve('downloaded');
}
