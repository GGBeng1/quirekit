import type {
  QuireInlineFlowExclusion,
  QuireInlineFlowLine
} from "./types";
import type { QuireRect } from "@quirekit/renderer";

/** Numeric inline interval used while subtracting exclusions. */
export interface QuireInlineInterval {
  /** Inclusive inline start in the line coordinate space. */
  readonly from: number;
  /** Exclusive inline end in the line coordinate space. */
  readonly to: number;
}

/** Result of subtracting intersecting exclusions from one line. */
export interface QuireInlineIntervalSubtraction {
  /** Remaining intervals in increasing inline order. */
  readonly intervals: readonly QuireInlineInterval[];
  /** Stable ids of exclusions that intersected the line. */
  readonly appliedExclusionIds: readonly string[];
  /** Stable invalidation dependencies from intersecting exclusions. */
  readonly dependencyIds: readonly string[];
}

/** Geometry-only subtraction result used before retained identities exist. */
export interface QuireInlineRectangleSubtraction {
  /** Remaining intervals in increasing inline order. */
  readonly intervals: readonly QuireInlineInterval[];
  /** Input indexes of rectangles that intersected the line. */
  readonly appliedExclusionIndexes: readonly number[];
}

/**
 * Subtracts vertically intersecting rectangles from one line rectangle.
 *
 * This geometry kernel is shared by pre-shape row-slot compilation and the
 * retained flow-region compiler. Identity and dependency facts remain the
 * responsibility of the retained wrapper below.
 *
 * @param line - Line rectangle whose inline intervals remain available.
 * @param exclusions - Exclusion rectangles in stable declaration order.
 * @returns Remaining intervals and intersecting input indexes.
 */
export function subtractQuireInlineRectangles(
  line: QuireRect,
  exclusions: readonly QuireRect[]
): QuireInlineRectangleSubtraction {
  const lineEnd = line.x + line.width;
  const cuts = exclusions
    .map((rect, index) => ({
      index,
      rect,
      from: Math.max(line.x, rect.x),
      to: Math.min(lineEnd, rect.x + rect.width)
    }))
    .filter((cut) => rectanglesOverlapVertically(line, cut.rect) && cut.to > cut.from)
    .sort((left, right) => left.from - right.from
      || left.to - right.to
      || left.index - right.index);

  const intervals: QuireInlineInterval[] = [];
  let cursor = line.x;
  for (const cut of cuts) {
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
    appliedExclusionIndexes: cuts.map((cut) => cut.index)
  };
}

/**
 * Subtracts vertically intersecting exclusion rectangles from one line.
 *
 * @param line - Valid measured line.
 * @param exclusions - Valid exclusions targeting the line's flow scope.
 * @returns Remaining inline intervals and their dependency facts.
 */
export function subtractQuireInlineFlowExclusions(
  line: QuireInlineFlowLine,
  exclusions: readonly QuireInlineFlowExclusion[]
): QuireInlineIntervalSubtraction {
  const subtraction = subtractQuireInlineRectangles(
    line.rect,
    exclusions.map((exclusion) => exclusion.rect)
  );
  const appliedExclusions = subtraction.appliedExclusionIndexes.map(
    (index) => exclusions[index]!
  );

  return {
    intervals: subtraction.intervals,
    appliedExclusionIds: appliedExclusions.map((exclusion) => exclusion.id),
    dependencyIds: collectStableDependencyIds(appliedExclusions)
  };
}

/**
 * Checks whether one exclusion occupies any of a line's block extent.
 *
 * @param line - Valid measured line.
 * @param exclusion - Valid exclusion in the same flow scope and coordinate space.
 * @returns Whether the rectangles overlap vertically.
 */
function rectanglesOverlapVertically(
  line: QuireRect,
  exclusion: QuireRect
): boolean {
  return exclusion.y < line.y + line.height
    && exclusion.y + exclusion.height > line.y;
}

/**
 * Collects unique dependency ids in stable declaration order.
 *
 * @param exclusions - Exclusions that changed one line.
 * @returns Stable unique dependency ids.
 */
function collectStableDependencyIds(
  exclusions: readonly QuireInlineFlowExclusion[]
): readonly string[] {
  const seen = new Set<string>();
  const dependencyIds: string[] = [];
  for (const exclusion of exclusions) {
    for (const dependencyId of exclusion.dependencyIds) {
      if (!seen.has(dependencyId)) {
        seen.add(dependencyId);
        dependencyIds.push(dependencyId);
      }
    }
  }
  return dependencyIds;
}
