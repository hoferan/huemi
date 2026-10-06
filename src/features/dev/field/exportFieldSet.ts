import type { FieldExport } from '../../../model/field';
import { encodeFieldExport } from '../../../model/fieldExport';
import type { FieldStore } from '../../../storage/port';
import type { SharePort, ShareResult } from '../../share/port';
import { EXPORT_TITLE } from './copy';
import { gzip } from './gzip';

export type ExportOutcome = ShareResult | 'downloaded';

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date, since that is the day the person exporting would name. */
export function exportFileName(now: Date): string {
  return `huemi-field-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json.gz`;
}

/**
 * Everything the field recorder holds, as one gzipped file. A frame that
 * cannot be read fails the whole export, so no capture leaves without its
 * frame. The frames are read one at a time.
 */
export async function buildFieldExport({
  store,
  compress = gzip,
  now = new Date(),
}: {
  store: FieldStore;
  compress?: (bytes: Uint8Array<ArrayBuffer>) => Promise<Uint8Array<ArrayBuffer>>;
  now?: Date;
}): Promise<File | 'failed'> {
  const [garments, captures] = await Promise.all([store.listGarments(), store.listCaptures()]);
  if (!garments.ok || !captures.ok) return 'failed';
  const withFrames: FieldExport['captures'] = [];
  for (const capture of captures.value) {
    const read = await store.readPixels(capture.id);
    if (!read.ok) return 'failed';
    withFrames.push({ ...capture, pixels: read.value });
  }
  let bytes: Uint8Array<ArrayBuffer>;
  // Inside the try too: a set large enough runs past the longest string the
  // browser will build, and the encoding throws.
  try {
    const json = encodeFieldExport({
      version: 1,
      exportedAt: now.toISOString(),
      garments: garments.value,
      captures: withFrames,
    });
    bytes = await compress(new TextEncoder().encode(json));
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
