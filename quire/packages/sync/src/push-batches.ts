/** Largest push request body the client builds; the server accepts more (R-ACC-06). */
const MAX_BATCH_BYTES = 1024 * 1024;
const MAX_BATCH_ITEMS = 200;

/** Splits pushes in order into batches under MAX_BATCH_BYTES; a larger note goes alone. */
export function* pushBatches<T extends { text: string; deleted: boolean }>(docs: T[]): Generator<T[]> {
  let batch: T[] = [];
  let bytes = 0;
  for (const d of docs) {
    const size = d.deleted ? 64 : d.text.length * 3 + 64;
    if (batch.length && (bytes + size > MAX_BATCH_BYTES || batch.length >= MAX_BATCH_ITEMS)) {
      yield batch;
      batch = [];
      bytes = 0;
    }
    batch.push(d);
    bytes += size;
  }
  if (batch.length) yield batch;
}
