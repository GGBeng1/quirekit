import type {
  QuirePageStackDisplayListChunk,
  QuirePageStackDisplayListChunkIndex
} from "./types";

/**
 * Creates an ordered page chunk index with constant-time page lookup.
 *
 * @param chunks - Page-local chunks in page order.
 * @returns Chunk index retaining both order and page identity.
 */
export function createQuirePageStackDisplayListChunkIndex(
  chunks: readonly QuirePageStackDisplayListChunk[]
): QuirePageStackDisplayListChunkIndex {
  const chunksByPageIndex: Record<number, QuirePageStackDisplayListChunk> = {};
  for (const chunk of chunks) {
    chunksByPageIndex[chunk.pageIndex] = chunk;
  }
  return { chunks, chunksByPageIndex };
}
