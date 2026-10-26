import type { QuireRect } from "@quirekit/renderer";
import type { QuireInlineSourceClearance } from "../source-placement";
import type { QuireInlineInterval } from "./geometry";

/** One point in the coordinate space of a resolved flow exclusion. */
export interface QuireInlineExclusionPoint {
  /** Physical inline coordinate. */
  readonly x: number;
  /** Physical block coordinate. */
  readonly y: number;
}

/** One closed contour path in resolved flow coordinates. */
export interface QuireInlineExclusionPath {
  /** Ordered path points; the geometry kernel closes the final edge. */
  readonly points: readonly QuireInlineExclusionPoint[];
}

/** Renderer-neutral geometry that removes space from text-flow row bands. */
export type QuireInlineExclusionGeometry =
  | {
      /** Clearance-expanded rectangular wrapping. */
      readonly kind: "rectangle";
      /** Unexpanded object bounds in flow coordinates. */
      readonly bounds: QuireRect;
      /** Logical clearance around the object bounds. */
      readonly clearance: QuireInlineSourceClearance;
      /** Physical side or sides on which text may remain. */
      readonly side: "both" | "left" | "right" | "largest";
    }
  | {
      /** Complete row-band suppression while the object overlaps vertically. */
      readonly kind: "block-band";
      /** Unexpanded object bounds in flow coordinates. */
      readonly bounds: QuireRect;
      /** Logical clearance around the object bounds. */
      readonly clearance: QuireInlineSourceClearance;
    }
  | {
      /** One outer contour envelope per intersecting row band. */
      readonly kind: "contour-envelope";
      /** Unexpanded object bounds used for conservative fallback and culling. */
      readonly bounds: QuireRect;
      /** Logical clearance around each projected contour interval. */
      readonly clearance: QuireInlineSourceClearance;
      /** Resolved contour paths in the same coordinate space as the bounds. */
      readonly paths: readonly QuireInlineExclusionPath[];
      /** Physical side or sides on which text may remain. */
      readonly side: "both" | "left" | "right" | "largest";
    }
  | {
      /** Even-odd contour interiors, including holes, per row band. */
      readonly kind: "contour-through";
      /** Unexpanded object bounds used for conservative fallback and culling. */
      readonly bounds: QuireRect;
      /** Logical clearance around each projected contour interval. */
      readonly clearance: QuireInlineSourceClearance;
      /** Resolved contour paths in the same coordinate space as the bounds. */
      readonly paths: readonly QuireInlineExclusionPath[];
      /** Physical side or sides on which text may remain. */
      readonly side: "both" | "left" | "right" | "largest";
    };

/** Geometry-only result after applying heterogeneous exclusions to one row. */
export interface QuireInlineGeometrySubtraction {
  /** Remaining intervals in increasing inline order. */
  readonly intervals: readonly QuireInlineInterval[];
  /** Input indexes of geometries that changed the row. */
  readonly appliedExclusionIndexes: readonly number[];
}

/** Internal cut interval paired with its source exclusion index. */
interface IndexedCut extends QuireInlineInterval {
  /** Source geometry index. */
  readonly index: number;
}

/** Small coordinate tolerance used around polygon vertices. */
const contourEpsilon = 1e-6;

/** Zero clearance used by compatibility rectangle callers. */
export const quireZeroInlineSourceClearance: QuireInlineSourceClearance = {
  blockStart: 0,
  inlineEnd: 0,
  blockEnd: 0,
  inlineStart: 0
};

/**
 * Subtracts heterogeneous drawing exclusions from one measured row band.
 *
 * Rectangle, contour, block-band, and side policy are resolved here so every
 * text consumer uses the same physical interval authority.
 *
 * @param line - Row rectangle whose inline intervals remain available.
 * @param exclusions - Resolved exclusion geometries in stable declaration order.
 * @returns Remaining intervals and indexes of geometries that affected the row.
 */
export function subtractQuireInlineExclusionGeometries(
  line: QuireRect,
  exclusions: readonly QuireInlineExclusionGeometry[]
): QuireInlineGeometrySubtraction {
  const lineEnd = line.x + line.width;
  const cuts = exclusions.flatMap((exclusion, index) =>
    resolveExclusionCuts(line, exclusion).map((interval) => ({
      ...interval,
      index
    }))
  );
  const mergedCuts = mergeIndexedCuts(cuts, line.x, lineEnd);
  const intervals: QuireInlineInterval[] = [];
  let cursor = line.x;

  for (const cut of mergedCuts) {
    if (cut.from > cursor) {
      intervals.push({ from: cursor, to: cut.from });
    }
    cursor = Math.max(cursor, cut.to);
  }
  if (cursor < lineEnd) {
    intervals.push({ from: cursor, to: lineEnd });
  }

  return {
    intervals,
    appliedExclusionIndexes: [...new Set(cuts.map((cut) => cut.index))].sort(
      (left, right) => left - right
    )
  };
}

/**
 * Translates one resolved exclusion without changing its algorithm or identity.
 *
 * @param exclusion - Geometry in the source coordinate space.
 * @param deltaX - Physical inline translation.
 * @param deltaY - Physical block translation.
 * @returns Geometry translated into the destination coordinate space.
 */
export function translateQuireInlineExclusionGeometry(
  exclusion: QuireInlineExclusionGeometry,
  deltaX: number,
  deltaY: number
): QuireInlineExclusionGeometry {
  const bounds = {
    ...exclusion.bounds,
    x: exclusion.bounds.x + deltaX,
    y: exclusion.bounds.y + deltaY
  };
  if (exclusion.kind === "rectangle" || exclusion.kind === "block-band") {
    return { ...exclusion, bounds };
  }
  return {
    ...exclusion,
    bounds,
    paths: exclusion.paths.map((path) => ({
      points: path.points.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY
      }))
    }))
  };
}

/**
 * Resolves the cuts contributed by one geometry to one row.
 *
 * @param line - Current row band.
 * @param exclusion - One resolved drawing exclusion.
 * @returns Ordered cut intervals inside the row extent.
 */
function resolveExclusionCuts(
  line: QuireRect,
  exclusion: QuireInlineExclusionGeometry
): readonly QuireInlineInterval[] {
  if (!intersectsExpandedBoundsVertically(line, exclusion)) {
    return [];
  }

  const lineEnd = line.x + line.width;
  if (exclusion.kind === "block-band") {
    const boundsStart = exclusion.bounds.x - exclusion.clearance.inlineStart;
    const boundsEnd = exclusion.bounds.x + exclusion.bounds.width
      + exclusion.clearance.inlineEnd;
    return boundsStart < lineEnd && boundsEnd > line.x
      ? [{ from: line.x, to: lineEnd }]
      : [];
  }

  let cuts: readonly QuireInlineInterval[];
  if (exclusion.kind === "rectangle") {
    cuts = [{
      from: exclusion.bounds.x - exclusion.clearance.inlineStart,
      to: exclusion.bounds.x + exclusion.bounds.width
        + exclusion.clearance.inlineEnd
    }];
  } else {
    const projected = projectContourIntervals(line, exclusion);
    cuts = exclusion.kind === "contour-envelope" && projected.length > 0
      ? [{
          from: Math.min(...projected.map((interval) => interval.from)),
          to: Math.max(...projected.map((interval) => interval.to))
        }]
      : projected;
  }

  const clipped = cuts
    .map((cut) => ({
      from: Math.max(line.x, cut.from),
      to: Math.min(lineEnd, cut.to)
    }))
    .filter((cut) => cut.to > cut.from);
  if (clipped.length === 0 || exclusion.side === "both") {
    return clipped;
  }

  const from = Math.min(...clipped.map((cut) => cut.from));
  const to = Math.max(...clipped.map((cut) => cut.to));
  if (exclusion.side === "left") {
    return [{ from, to: lineEnd }];
  }
  if (exclusion.side === "right") {
    return [{ from: line.x, to }];
  }

  return from - line.x >= lineEnd - to
    ? [{ from, to: lineEnd }]
    : [{ from: line.x, to }];
}

/**
 * Projects even-odd contour interiors across the complete row band.
 *
 * Sampling the band boundaries plus every nearby vertex is conservative for
 * piecewise-linear paths and prevents a contour from leaking through a tall row.
 *
 * @param line - Current row band.
 * @param exclusion - Contour-backed exclusion.
 * @returns Unioned contour intervals expanded by logical clearance.
 */
function projectContourIntervals(
  line: QuireRect,
  exclusion: Extract<
    QuireInlineExclusionGeometry,
    { readonly kind: "contour-envelope" | "contour-through" }
  >
): readonly QuireInlineInterval[] {
  if (exclusion.paths.length === 0) {
    return [{
      from: exclusion.bounds.x - exclusion.clearance.inlineStart,
      to: exclusion.bounds.x + exclusion.bounds.width
        + exclusion.clearance.inlineEnd
    }];
  }

  const sampleStart = line.y - exclusion.clearance.blockEnd;
  const sampleEnd = line.y + line.height + exclusion.clearance.blockStart;
  const samples = collectContourSamples(exclusion.paths, sampleStart, sampleEnd);
  const intervals = samples.flatMap((sampleY) =>
    scanContourIntervals(exclusion.paths, sampleY).map((interval) => ({
      from: interval.from - exclusion.clearance.inlineStart,
      to: interval.to + exclusion.clearance.inlineEnd
    }))
  );
  return mergeIntervals(intervals);
}

/**
 * Collects stable scanline samples for a polygon band.
 *
 * @param paths - Resolved contour paths.
 * @param from - Inclusive sample band start.
 * @param to - Inclusive sample band end.
 * @returns Sorted unique scanline coordinates.
 */
function collectContourSamples(
  paths: readonly QuireInlineExclusionPath[],
  from: number,
  to: number
): readonly number[] {
  const samples = [from, to, (from + to) / 2];
  for (const path of paths) {
    for (const point of path.points) {
      if (point.y < from || point.y > to) continue;
      samples.push(
        Math.max(from, point.y - contourEpsilon),
        point.y,
        Math.min(to, point.y + contourEpsilon)
      );
    }
  }
  return [...new Set(samples)].sort((left, right) => left - right);
}

/**
 * Resolves even-odd filled intervals at one scanline.
 *
 * @param paths - Closed contour paths participating in one fill.
 * @param y - Physical scanline coordinate.
 * @returns Filled intervals in increasing inline order.
 */
function scanContourIntervals(
  paths: readonly QuireInlineExclusionPath[],
  y: number
): readonly QuireInlineInterval[] {
  const intersections: number[] = [];
  for (const path of paths) {
    const points = path.points;
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      if (start === undefined || end === undefined || start.y === end.y) continue;
      const crosses = (start.y <= y && end.y > y)
        || (end.y <= y && start.y > y);
      if (!crosses) continue;
      intersections.push(
        start.x + ((y - start.y) / (end.y - start.y)) * (end.x - start.x)
      );
    }
  }
  intersections.sort((left, right) => left - right);

  const intervals: QuireInlineInterval[] = [];
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const from = intersections[index];
    const to = intersections[index + 1];
    if (from !== undefined && to !== undefined && to > from) {
      intervals.push({ from, to });
    }
  }
  return intervals;
}

/**
 * Checks vertical overlap against clearance-expanded object bounds.
 *
 * @param line - Current row band.
 * @param exclusion - Drawing exclusion with raw bounds and clearance.
 * @returns Whether row and effective block extent overlap.
 */
function intersectsExpandedBoundsVertically(
  line: QuireRect,
  exclusion: QuireInlineExclusionGeometry
): boolean {
  const top = exclusion.bounds.y - exclusion.clearance.blockStart;
  const bottom = exclusion.bounds.y + exclusion.bounds.height
    + exclusion.clearance.blockEnd;
  return top < line.y + line.height && bottom > line.y;
}

/**
 * Merges unindexed intervals into deterministic non-overlapping cuts.
 *
 * @param intervals - Unordered intervals.
 * @returns Merged intervals in increasing inline order.
 */
function mergeIntervals(
  intervals: readonly QuireInlineInterval[]
): readonly QuireInlineInterval[] {
  const sorted = [...intervals]
    .filter((interval) => interval.to > interval.from)
    .sort((left, right) => left.from - right.from || left.to - right.to);
  const merged: QuireInlineInterval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (last === undefined || interval.from > last.to) {
      merged.push(interval);
    } else {
      merged[merged.length - 1] = {
        from: last.from,
        to: Math.max(last.to, interval.to)
      };
    }
  }
  return merged;
}

/**
 * Merges indexed cuts after clipping them to one row extent.
 *
 * @param cuts - Unordered source-indexed cuts.
 * @param lineStart - Physical row start.
 * @param lineEnd - Physical row end.
 * @returns Merged cuts used by the subtraction sweep.
 */
function mergeIndexedCuts(
  cuts: readonly IndexedCut[],
  lineStart: number,
  lineEnd: number
): readonly QuireInlineInterval[] {
  return mergeIntervals(cuts.map((cut) => ({
    from: Math.max(lineStart, cut.from),
    to: Math.min(lineEnd, cut.to)
  })));
}
