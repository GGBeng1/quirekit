import type {
  QuireMeasuredRowGeometry,
  QuireMeasuredRowLineFlowBand,
  QuireMeasuredRowLineInput
} from "./types";

/**
 * Resolves the source-flow band consumed by one ordered line inside a row.
 *
 * A line whose baseline was assigned to the row may start above the row. The
 * row therefore consumes the complete line height after rebasing it to the row
 * top, while the first and last slices retain the row framework bounds.
 *
 * @param row - Neutral row geometry being measured.
 * @param line - Ordered visual line assigned to the row.
 * @param lineIndex - Zero-based line index within the row.
 * @param lineCount - Number of measured lines in the row.
 * @returns Source-flow band that should consume page height.
 */
export function createQuireMeasuredRowLineFlowBand(
  row: QuireMeasuredRowGeometry,
  line: QuireMeasuredRowLineInput,
  lineIndex: number,
  lineCount: number
): QuireMeasuredRowLineFlowBand {
  const lineHeight = Math.max(0, line.bottom - line.top);
  const ownedLineTop = Math.max(row.top, line.top);
  const ownedLineBottom = ownedLineTop + lineHeight;

  return {
    top: lineIndex === 0 ? row.top : ownedLineTop,
    bottom: lineIndex === lineCount - 1
      ? Math.max(row.bottom, ownedLineBottom)
      : ownedLineBottom
  };
}
