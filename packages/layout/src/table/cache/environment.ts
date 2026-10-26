import type { QuireTableMeasurementEnvironment } from "./types";

/**
 * Compares every shaping fact that can affect table measurements.
 *
 * @param left - Previous environment, when prepared.
 * @param right - Current environment.
 * @returns Whether retained measurements remain valid.
 */
export function isSameQuireTableMeasurementEnvironment(
  left: QuireTableMeasurementEnvironment | undefined,
  right: QuireTableMeasurementEnvironment
): boolean {
  return left !== undefined
    && left.textMeasurer === right.textMeasurer
    && left.textMeasurerVersion === right.textMeasurerVersion
    && left.font === right.font
    && left.lineHeight === right.lineHeight
    && left.textBaselineOffset === right.textBaselineOffset
    && left.lineBreakMode === right.lineBreakMode
    && left.lineBreakerName === right.lineBreakerName;
}
