import {
  isConcreteQuireTableBorder,
  normalizeQuireTableBorderStyleName,
  resolveQuireTableBorderWidth
} from "../style";
import type { QuireTableBorder } from "../../types";

/** CSS pixels per point at 96 DPI. */
const pixelsPerPoint = 4 / 3;

/**
 * Space each line style takes across its line, from its nominal width, as measured in Word: compound styles add
 * their thin lines and gaps, some in fixed points. Styles missing here take their nominal width.
 */
const occupancyByStyle = new Map<string, (width: number) => number>([
  ["double", width => width * 3],
  ["triple", width => width * 5],
  ["thinthicksmallgap", width => width + 1.5 * pixelsPerPoint],
  ["thickthinsmallgap", width => width + 1.5 * pixelsPerPoint],
  ["thinthickthinsmallgap", width => width + 3 * pixelsPerPoint],
  ["thinthickmediumgap", width => width * 2],
  ["thickthinmediumgap", width => width * 2],
  ["threedemboss", width => width * 2],
  ["threedengrave", width => width * 2],
  ["thinthickthinmediumgap", width => width * 3],
  ["thinthicklargegap", width => width + 2.25 * pixelsPerPoint],
  ["thickthinlargegap", width => width + 2.25 * pixelsPerPoint],
  ["thinthickthinlargegap", width => width * 2 + 3 * pixelsPerPoint],
  ["doublewave", () => 5.25 * pixelsPerPoint],
  // Word draws a thin wave 3.75 pt tall and a 3 pt one at its own width.
  ["wave", width => width < 3 * pixelsPerPoint ? 3.75 * pixelsPerPoint : width]
]);

/**
 * Resolves how much layout space a border takes across its line, including its spacing to the text.
 * @param border - Effective border of one edge, or null when there is none.
 * @returns Occupied width in CSS pixels; zero for an absent or hidden border.
 */
export function resolveQuireTableBorderOccupancy(border: QuireTableBorder | null | undefined): number {
  if (!border || !isConcreteQuireTableBorder(border)) return 0;
  const spacing = typeof border.spacing === "number" && Number.isFinite(border.spacing) ? Math.max(0, border.spacing) : 0;
  return resolveQuireTableBorderBand(border) + spacing;
}

/**
 * Resolves the band a border's strokes fill across its line, without its spacing to the text.
 * @param border - Effective border of one edge, or null when there is none.
 * @returns Band width in CSS pixels; zero for an absent or hidden border.
 */
export function resolveQuireTableBorderBand(border: QuireTableBorder | null | undefined): number {
  if (!border || !isConcreteQuireTableBorder(border)) return 0;
  const width = resolveQuireTableBorderWidth(border);
  return occupancyByStyle.get(normalizeQuireTableBorderStyleName(border.style))?.(width) ?? width;
}
