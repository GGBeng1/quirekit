/**
 * Splits text into grapheme-like segments for caret measurement.
 *
 * @param text - Text content to segment.
 * @returns Text segments used as visual caret steps.
 */
export function segmentQuireTextGraphemes(text: string): readonly string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      readSegmentText
    );
  }

  return Array.from(text);
}

/**
 * Reads the text segment from an Intl segment result.
 *
 * @param segment - Intl segment result to read.
 * @returns Segment text.
 */
function readSegmentText(segment: Intl.SegmentData): string {
  return segment.segment;
}
