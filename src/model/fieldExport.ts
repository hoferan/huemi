import type { FieldCapture, FieldExport, FieldGarment } from './field';
import { LIGHTS } from './field';
import { parseHex } from './hex';
import type { Pixels } from './frame';

// String.fromCharCode takes its bytes as arguments, and a large frame
// overflows the argument limit, so base64 goes through in chunks.
const CHUNK = 0x8000;

function toBase64(data: Uint8ClampedArray): string {
  let binary = '';
  for (let i = 0; i < data.length; i += CHUNK) {
    binary += String.fromCharCode(...data.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8ClampedArray {
  const binary = atob(text);
  const out = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

type ExportedCapture = FieldExport['captures'][number];

// A capture as the file holds it, with its pixel bytes in base64.
const wireCapture = (capture: ExportedCapture) => {
  const { pixels } = capture;
  return {
    ...capture,
    pixels: { width: pixels.width, height: pixels.height, data: toBase64(pixels.data) },
  };
};

/** One capture as it sits in the file's `captures` array. */
export function encodeFieldCapture(capture: ExportedCapture): string {
  return JSON.stringify(wireCapture(capture));
}

/**
 * Pixel bytes become base64 so the whole set is one JSON document. The keys
 * go in a fixed order, the one the streamed export in
 * `src/features/dev/field/exportFieldSet.ts` writes.
 */
export function encodeFieldExport(data: FieldExport): string {
  return JSON.stringify({
    version: data.version,
    exportedAt: data.exportedAt,
    setId: data.setId,
    garments: data.garments,
    captures: data.captures.map(wireCapture),
  });
}

const reject = (): never => {
  throw new Error('Not a field export');
};

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null;
const str = (v: unknown): string => (typeof v === 'string' ? v : reject());
const num = (v: unknown): number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : reject();
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : reject());
const obj = (v: unknown): Raw => (isObject(v) ? v : reject());

function hex(v: unknown) {
  try {
    return parseHex(str(v));
  } catch {
    return reject();
  }
}

// One color, or two to three for a multicolor piece, as the kit records it.
function truth(v: unknown) {
  const hexes = list(v);
  if (hexes.length < 1 || hexes.length > 3) reject();
  return hexes.map(hex);
}

function decodeGarment(v: unknown): FieldGarment {
  const g = obj(v);
  return {
    id: str(g.id),
    label: str(g.label),
    truth: truth(g.truth),
    createdAt: str(g.createdAt),
  };
}

function decodePixels(v: unknown): Pixels {
  const p = obj(v);
  const width = num(p.width);
  const height = num(p.height);
  let data: Uint8ClampedArray;
  try {
    data = fromBase64(str(p.data));
  } catch {
    return reject();
  }
  // A frame that does not fill its stated size would read as garbage later.
  if (data.length !== width * height * 4) reject();
  return { width, height, data };
}

function decodeCapture(v: unknown): ExportedCapture {
  const c = obj(v);
  const light = c.light;
  if (c.source !== 'kit' && c.source !== 'flow') reject();
  if (!LIGHTS.some((l) => l === light)) reject();
  if (c.garmentId !== null && typeof c.garmentId !== 'string') reject();
  if (c.lowLight !== null && typeof c.lowLight !== 'boolean') reject();
  return {
    id: str(c.id),
    source: c.source as FieldCapture['source'],
    garmentId: c.garmentId as string | null,
    settled: c.settled === null ? null : hex(c.settled),
    light: light as FieldCapture['light'],
    lowLight: c.lowLight as boolean | null,
    width: num(c.width),
    height: num(c.height),
    takenAt: str(c.takenAt),
    build: str(c.build),
    pixels: decodePixels(c.pixels),
  };
}

/**
 * Reads a field export back, checking enough to fail loudly on the wrong
 * file: the version, the set's id, the arrays, every hex, the number of true
 * colors, and that each frame's bytes fill its stated size. Any failure
 * throws the same error.
 */
export function decodeFieldExport(json: string): FieldExport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return reject();
  }
  const r = obj(raw);
  if (r.version !== 1) reject();
  return {
    version: 1,
    exportedAt: str(r.exportedAt),
    setId: str(r.setId),
    garments: list(r.garments).map(decodeGarment),
    captures: list(r.captures).map(decodeCapture),
  };
}

/**
 * Combines exports from several devices. Each export is a whole snapshot of
 * its set, so only the newest export of each set counts: a capture deleted on
 * the phone stays deleted even if an older export still holds it. The sets
 * that remain are then unioned by id, and where two hold the same id, the
 * newer export wins. ISO timestamps compare as strings. The result names
 * every set it came from, joined with `+`.
 */
export function mergeFieldExports(exports: readonly FieldExport[]): FieldExport {
  const byTime = (a: FieldExport, b: FieldExport) =>
    a.exportedAt < b.exportedAt ? -1 : a.exportedAt > b.exportedAt ? 1 : 0;
  const newest = new Map<string, FieldExport>();
  for (const e of [...exports].sort(byTime)) newest.set(e.setId, e);
  const ordered = [...newest.values()].sort(byTime);
  const garments = new Map<string, FieldGarment>();
  const captures = new Map<string, ExportedCapture>();
  for (const e of ordered) {
    for (const g of e.garments) garments.set(g.id, g);
    for (const c of e.captures) captures.set(c.id, c);
  }
  return {
    version: 1,
    exportedAt: ordered.at(-1)?.exportedAt ?? new Date(0).toISOString(),
    setId: [...newest.keys()].sort().join('+'),
    garments: [...garments.values()],
    captures: [...captures.values()],
  };
}
