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

/** Pixel bytes become base64 so the whole set is one JSON document. */
export function encodeFieldExport(data: FieldExport): string {
  return JSON.stringify({
    ...data,
    captures: data.captures.map((c) => ({
      ...c,
      pixels: { width: c.pixels.width, height: c.pixels.height, data: toBase64(c.pixels.data) },
    })),
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

function decodeGarment(v: unknown): FieldGarment {
  const g = obj(v);
  return {
    id: str(g.id),
    label: str(g.label),
    truth: list(g.truth).map(hex),
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

function decodeCapture(v: unknown): FieldCapture & { pixels: Pixels } {
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
 * file: the version, the arrays, every hex, and that each frame's bytes fill
 * its stated size. Any failure throws the same error.
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
    garments: list(r.garments).map(decodeGarment),
    captures: list(r.captures).map(decodeCapture),
  };
}

/**
 * Combines exports from several devices. Records share ids across exports, so
 * the one from the newest export wins; ISO timestamps compare as strings.
 */
export function mergeFieldExports(exports: readonly FieldExport[]): FieldExport {
  const ordered = [...exports].sort((a, b) =>
    a.exportedAt < b.exportedAt ? -1 : a.exportedAt > b.exportedAt ? 1 : 0,
  );
  const garments = new Map<string, FieldGarment>();
  const captures = new Map<string, FieldExport['captures'][number]>();
  for (const e of ordered) {
    for (const g of e.garments) garments.set(g.id, g);
    for (const c of e.captures) captures.set(c.id, c);
  }
  return {
    version: 1,
    exportedAt: ordered.at(-1)?.exportedAt ?? new Date(0).toISOString(),
    garments: [...garments.values()],
    captures: [...captures.values()],
  };
}
