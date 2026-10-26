import type { QuireSelectionGeometry } from "@quirekit/view-engine";
import type { SvgTextMeasurement } from "../types";
import { buildSvgMeasuredCaretGeometry } from "./caret";
import { buildSvgMeasuredRangeGeometry } from "./range";

/**
 * Builds selection geometry from SVG text measurements.
 *
 * @param retained - Existing retained geometry to refine.
 * @param measurements - Browser measurements collected from visible SVG text.
 * @returns SVG-measured selection geometry, or retained geometry when unmeasurable.
 */
export function buildSvgMeasuredSelectionGeometry(
  retained: QuireSelectionGeometry,
  measurements: readonly SvgTextMeasurement[]
): QuireSelectionGeometry {
  const carets = buildSvgMeasuredCaretGeometry(retained.carets, measurements);
  const ranges = buildSvgMeasuredRangeGeometry(retained.ranges, measurements);

  if (carets === retained.carets && ranges === retained.ranges) {
    return retained;
  }

  return {
    carets,
    ranges
  };
}
