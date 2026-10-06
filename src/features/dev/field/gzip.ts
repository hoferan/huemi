/* v8 ignore start -- jsdom has no CompressionStream; e2e/features/field.feature unzips a real export. */
/** Gzips the bytes with the browser's own CompressionStream. */
export async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/* v8 ignore stop */
