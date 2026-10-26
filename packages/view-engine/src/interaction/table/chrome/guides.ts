import {
  buildQuireTablePaintModel,
  type QuireTableBorderPaint,
  type QuireTableLineSegment
} from "@quirekit/layout/table";
import type { QuireTableLayoutSnapshot } from "../../../layout/engine/table";
import type { QuireTableChromeGuide } from "./types";

const geometryEpsilon = 0.01;

/**
 * Derives editor-only guide segments for semantic cell edges without paint.
 *
 * @param table - Page-local Table snapshot.
 * @returns Deduplicated document-space guide segments.
 */
export function createTableMissingBorderGuides(
  table: QuireTableLayoutSnapshot
): readonly QuireTableChromeGuide[] {
  const borderPaints = buildQuireTablePaintModel(table).borders;
  const guides = new Map<string, QuireTableChromeGuide>();

  for (const cell of table.cells) {
    const candidates = createCellEdgeLines(cell.rect);

    for (const candidate of candidates) {
      if (isLineCoveredByBorderPaint(candidate.line, borderPaints)) {
        continue;
      }

      const key = guideKey(candidate.orientation, candidate.line);
      if (!guides.has(key)) {
        guides.set(key, {
          id: `${table.fragmentId}:guide:${key}`,
          orientation: candidate.orientation,
          rect: lineToRect(candidate.line)
        });
      }
    }
  }

  return [...guides.values()];
}

/**
 * Creates four physical edge candidates for one cell rectangle.
 *
 * @param rect - Page-local cell rectangle.
 * @returns Axis-aligned cell edge lines.
 */
function createCellEdgeLines(
  rect: QuireTableLayoutSnapshot["cells"][number]["rect"]
): readonly {
  readonly orientation: QuireTableChromeGuide["orientation"];
  readonly line: QuireTableLineSegment;
}[] {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  return [
    {
      orientation: "horizontal",
      line: { from: { x: rect.x, y: rect.y }, to: { x: right, y: rect.y } }
    },
    {
      orientation: "vertical",
      line: { from: { x: right, y: rect.y }, to: { x: right, y: bottom } }
    },
    {
      orientation: "horizontal",
      line: { from: { x: rect.x, y: bottom }, to: { x: right, y: bottom } }
    },
    {
      orientation: "vertical",
      line: { from: { x: rect.x, y: rect.y }, to: { x: rect.x, y: bottom } }
    }
  ];
}

/**
 * Reports whether one actual border paint completely covers a guide candidate.
 *
 * @param candidate - Candidate cell edge.
 * @param paints - Effective border paints after conflict resolution.
 * @returns Whether document paint already makes the edge visible.
 */
function isLineCoveredByBorderPaint(
  candidate: QuireTableLineSegment,
  paints: readonly QuireTableBorderPaint[]
): boolean {
  const candidateHorizontal = isHorizontal(candidate);
  const candidateFixed = candidateHorizontal
    ? candidate.from.y
    : candidate.from.x;
  const candidateStart = candidateHorizontal
    ? Math.min(candidate.from.x, candidate.to.x)
    : Math.min(candidate.from.y, candidate.to.y);
  const candidateEnd = candidateHorizontal
    ? Math.max(candidate.from.x, candidate.to.x)
    : Math.max(candidate.from.y, candidate.to.y);

  return paints.some((paint) => {
    const line = { from: paint.from, to: paint.to };
    if (isHorizontal(line) !== candidateHorizontal) return false;
    const fixed = candidateHorizontal ? paint.from.y : paint.from.x;
    if (Math.abs(fixed - candidateFixed) > geometryEpsilon) return false;
    const start = candidateHorizontal
      ? Math.min(paint.from.x, paint.to.x)
      : Math.min(paint.from.y, paint.to.y);
    const end = candidateHorizontal
      ? Math.max(paint.from.x, paint.to.x)
      : Math.max(paint.from.y, paint.to.y);

    return start <= candidateStart + geometryEpsilon
      && end >= candidateEnd - geometryEpsilon;
  });
}

/**
 * Converts one line into the zero-thickness rectangle used by chrome projection.
 *
 * @param line - Axis-aligned line in document space.
 * @returns Document-space line rectangle.
 */
function lineToRect(
  line: QuireTableLineSegment
): QuireTableChromeGuide["rect"] {
  return {
    x: Math.min(line.from.x, line.to.x),
    y: Math.min(line.from.y, line.to.y),
    width: Math.abs(line.to.x - line.from.x),
    height: Math.abs(line.to.y - line.from.y)
  };
}

/**
 * Creates a stable geometry key for deduplicating shared cell edges.
 *
 * @param orientation - Physical guide orientation.
 * @param line - Candidate line.
 * @returns Rounded stable key.
 */
function guideKey(
  orientation: QuireTableChromeGuide["orientation"],
  line: QuireTableLineSegment
): string {
  const rect = lineToRect(line);
  return [
    orientation,
    roundCoordinate(rect.x),
    roundCoordinate(rect.y),
    roundCoordinate(rect.width),
    roundCoordinate(rect.height)
  ].join(":");
}

/**
 * Rounds one coordinate for stable geometry identity.
 *
 * @param value - Coordinate to round.
 * @returns Millipixel-rounded coordinate.
 */
function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Checks whether a line is horizontal within layout tolerance.
 *
 * @param line - Line to inspect.
 * @returns Whether both y coordinates are equal.
 */
function isHorizontal(line: QuireTableLineSegment): boolean {
  return Math.abs(line.from.y - line.to.y) <= geometryEpsilon;
}
