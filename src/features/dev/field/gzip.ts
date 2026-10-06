/* v8 ignore start -- jsdom has no CompressionStream; e2e/features/field.feature unzips a real export. */
/**
 * Gzips the chunks with the browser's own CompressionStream as they arrive,
 * taking the next only once the stream has the last, so the input is never
 * held whole. A chunk source that throws aborts the stream and rejects.
 */
export async function gzipChunks(
  chunks: AsyncIterable<Uint8Array<ArrayBuffer>>,
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  // Read while writing, or the stream fills up and the writes wait forever.
  const output = new Response(stream.readable).arrayBuffer();
  try {
    for await (const chunk of chunks) await writer.write(chunk);
    await writer.close();
  } catch (error) {
    output.catch(() => undefined);
    await writer.abort(error).catch(() => undefined);
    throw error;
  }
  return new Uint8Array(await output);
}
/* v8 ignore stop */
