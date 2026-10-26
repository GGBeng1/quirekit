import type { ExtractedProofingBlock } from "../extract/types";

/** Blocks sent together in one provider request. */
export interface ProofingBatch {
  /** Request identity. */
  readonly requestId: string;
  /** Blocks of the request. */
  readonly blocks: ExtractedProofingBlock[];
}

/** Size limits of one request. */
export interface ProofingBatchLimits {
  /** Segments per request. */
  readonly maxSegmentsPerBatch: number;
  /** UTF-16 characters per request. */
  readonly maxCharactersPerBatch: number;
}

/**
 * Splits blocks into requests by segment and character limits; a block is never split.
 *
 * @param blocks - Blocks needing a request.
 * @param limits - Request size limits.
 * @param nextRequestId - Issues a fresh request identity.
 * @returns Requests in block order.
 */
export function createProofingBatches(
  blocks: readonly ExtractedProofingBlock[],
  limits: ProofingBatchLimits,
  nextRequestId: () => string
): ProofingBatch[] {
  const batches: ProofingBatch[] = [];
  let segments = 0;
  let characters = 0;
  for (const block of blocks) {
    const size = block.segments.reduce((sum, segment) => sum + segment.text.length, 0);
    const current = batches[batches.length - 1];
    if (current === undefined || segments + block.segments.length > limits.maxSegmentsPerBatch
      || characters + size > limits.maxCharactersPerBatch) {
      batches.push({ requestId: nextRequestId(), blocks: [block] });
      segments = block.segments.length;
      characters = size;
    } else {
      current.blocks.push(block);
      segments += block.segments.length;
      characters += size;
    }
  }
  return batches;
}
