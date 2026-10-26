import { unionQuireDocumentRanges } from "@quirekit/renderer";
import { createQuireMeasuredRowLineFlowBand } from "./flow-band";
import { createQuireMeasuredRowLineRange } from "./range";
import type {
  QuireMeasuredRowGeometry,
  QuireMeasuredRowLineInput,
  QuireMeasuredRowLineSlice
} from "./types";

/**
 * Creates non-overlapping measured slices from source-ordered row lines.
 *
 * The caller owns source ordering because inline direction and parallel-track
 * order belong to its layout domain. This neutral phase owns only row boundary
 * retention, overlapping flow-band coalescing, and range union.
 *
 * @param row - Neutral row geometry being measured.
 * @param lines - Source-ordered visual lines assigned to the row.
 * @returns Non-overlapping measured row slices in source-flow order.
 */
export function createQuireMeasuredRowLineSlices<
  Line extends QuireMeasuredRowLineInput
>(
  row: QuireMeasuredRowGeometry,
  lines: readonly Line[]
): readonly QuireMeasuredRowLineSlice<Line>[] {
  const slices: QuireMeasuredRowLineSlice<Line>[] = [];

  lines.forEach((line, index) => {
    const flowBand = createQuireMeasuredRowLineFlowBand(
      row,
      line,
      index,
      lines.length
    );
    const range = createQuireMeasuredRowLineRange(row, line, index, lines.length);
    const previous = slices[slices.length - 1];

    if (previous !== undefined && flowBand.top < previous.bottom) {
      slices[slices.length - 1] = {
        range: unionQuireDocumentRanges([previous.range, range])!,
        top: previous.top,
        bottom: Math.max(previous.bottom, flowBand.bottom),
        lines: [...previous.lines, line]
      };
      return;
    }

    slices.push({
      range,
      top: flowBand.top,
      bottom: flowBand.bottom,
      lines: [line]
    });
  });

  return slices;
}
