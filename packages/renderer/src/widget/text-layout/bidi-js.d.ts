/**
 * Minimal ambient declaration for `bidi-js` (no bundled types). Covers the
 * Unicode Bidirectional Algorithm (UAX #9) entry points QuireKit uses.
 */
declare module "bidi-js" {
  /** Result of resolving paragraph embedding levels. */
  interface BidiEmbeddingLevelsResult {
    /** Per-character embedding levels in logical order. */
    readonly levels: Uint8Array;
    /** Paragraph boundaries and their base direction. */
    readonly paragraphs: ReadonlyArray<{
      readonly start: number;
      readonly end: number;
      readonly level: number;
    }>;
  }

  /** Bidi engine returned by the factory. */
  interface Bidi {
    /**
     * Resolves embedding levels (UAX #9) for paragraph text.
     *
     * @param text - Text in logical order.
     * @param direction - Base direction, or null to auto-detect.
     * @returns Embedding levels and paragraph metadata.
     */
    getEmbeddingLevels(
      text: string,
      direction?: "ltr" | "rtl" | null
    ): BidiEmbeddingLevelsResult;
    /**
     * Returns ranges of indices to reverse for visual order within a segment.
     *
     * @param text - Text in logical order.
     * @param embeddingLevels - Result of getEmbeddingLevels.
     * @param start - Segment start index.
     * @param end - Segment end index.
     * @returns Index ranges to reverse.
     */
    getReorderSegments(
      text: string,
      embeddingLevels: BidiEmbeddingLevelsResult,
      start?: number,
      end?: number
    ): ReadonlyArray<readonly [number, number]>;
    /**
     * Returns the visual order of character indices for a segment.
     *
     * @param text - Text in logical order.
     * @param embeddingLevels - Result of getEmbeddingLevels.
     * @param start - Segment start index.
     * @param end - Segment end index.
     * @returns Logical indices in visual order.
     */
    getReorderedIndices(
      text: string,
      embeddingLevels: BidiEmbeddingLevelsResult,
      start?: number,
      end?: number
    ): number[];
  }

  /**
   * Creates a stateless bidi engine.
   *
   * @returns The bidi engine.
   */
  export default function bidiFactory(): Bidi;
}
