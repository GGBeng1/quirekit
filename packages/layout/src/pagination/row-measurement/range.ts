import {
  intersectQuireDocumentRanges,
  type QuireDocumentRange
} from "@quirekit/renderer";
import type {
  QuireMeasuredRowGeometry,
  QuireMeasuredRowLineInput
} from "./types";

/**
 * Resolves a measured line range while preserving complete row boundaries.
 *
 * A visual line may originate from a source owner whose range does not overlap
 * the current row. In that case the row range remains authoritative instead of
 * emitting an inverted or foreign page range.
 *
 * @param row - Neutral row geometry being measured.
 * @param line - Ordered visual line assigned to the row.
 * @param lineIndex - Zero-based line index within the row.
 * @param lineCount - Number of measured lines in the row.
 * @returns Document range represented by the measured row slice.
 */
export function createQuireMeasuredRowLineRange(
  row: QuireMeasuredRowGeometry,
  line: QuireMeasuredRowLineInput,
  lineIndex: number,
  lineCount: number
): QuireDocumentRange {
  const lineRange = intersectQuireDocumentRanges(row.range, {
    from: line.from,
    to: line.to
  }) ?? row.range;

  return {
    from: lineIndex === 0 ? row.range.from : lineRange.from,
    to: lineIndex === lineCount - 1 ? row.range.to : lineRange.to
  };
}
