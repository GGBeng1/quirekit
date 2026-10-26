/** Internal resolved grapheme with source offsets. */
export interface QuireFontResolverSegment {
  /** Source offset relative to the original text, inclusive. */
  readonly from: number;
  /** Source offset relative to the original text, exclusive. */
  readonly to: number;
  /** Grapheme text. */
  readonly text: string;
}

/**
 * Splits text into grapheme-like segments with source offsets.
 *
 * @param text - Text content to segment.
 * @returns Ordered source segments.
 */
export function splitQuireTextIntoSegments(text: string): readonly QuireFontResolverSegment[] {
  const segments: QuireFontResolverSegment[] = [];
  let offset = 0;

  for (const segment of Array.from(text)) {
    segments.push({
      from: offset,
      to: offset + segment.length,
      text: segment
    });
    offset += segment.length;
  }

  return segments;
}
