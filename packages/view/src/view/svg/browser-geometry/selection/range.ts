import { intersectQuireDocumentRanges } from "@quirekit/renderer";
import type { QuireSelectionRangeGeometry } from "@quirekit/view-engine";
import type { SvgTextMeasurement } from "../types";
import { doRectsOverlap } from "./rect";

/**
 * Builds range geometry from SVG text measurements.
 *
 * @param retainedRanges - Existing retained range geometry to refine.
 * @param measurements - Browser measurements collected from visible SVG text.
 * @returns SVG-measured range geometry with retained provenance preserved.
 */
export function buildSvgMeasuredRangeGeometry(
  retainedRanges: readonly QuireSelectionRangeGeometry[],
  measurements: readonly SvgTextMeasurement[]
): readonly QuireSelectionRangeGeometry[] {
  let hasMeasuredRange = false;
  const ranges = retainedRanges.flatMap((range) => {
    const measuredRanges = collectSvgMeasuredRangeCandidates(range, measurements);

    if (measuredRanges.length === 0) {
      return [range];
    }

    hasMeasuredRange = true;

    return measuredRanges;
  });

  return hasMeasuredRange ? ranges : retainedRanges;
}

/**
 * Collects browser-measured rectangles for one retained range.
 *
 * @param retainedRange - Retained range geometry that owns the selection identity.
 * @param measurements - Browser measurements collected from visible SVG text.
 * @returns Measured range rectangles that refine the retained visual instance.
 */
function collectSvgMeasuredRangeCandidates(
  retainedRange: QuireSelectionRangeGeometry,
  measurements: readonly SvgTextMeasurement[]
): readonly QuireSelectionRangeGeometry[] {
  if (retainedRange.measurementPolicy === "preserve") {
    return [];
  }

  const ranges: QuireSelectionRangeGeometry[] = [];

  for (const measurement of measurements) {
    const commandRange = measurement.command.range;
    const overlap = commandRange === undefined
      ? null
      : intersectQuireDocumentRanges(commandRange, retainedRange.range);

    if (
      !overlap ||
      commandRange === undefined ||
      !doRectsOverlap(measurement.command.rect, retainedRange.rect)
    ) {
      continue;
    }

    const rangeRects = measurement.resolveRangeRects(
      overlap.from - commandRange.from,
      overlap.to - commandRange.from
    );

    if (rangeRects === null) {
      continue;
    }

    ranges.push(
      ...rangeRects.map((rect): QuireSelectionRangeGeometry => ({
        range: overlap,
        rect,
        ...(retainedRange.measurementPolicy === undefined
          ? {}
          : { measurementPolicy: retainedRange.measurementPolicy }),
        ...(retainedRange.queryOwner === undefined
          ? {}
          : { queryOwner: retainedRange.queryOwner })
      }))
    );
  }

  return ranges;
}
