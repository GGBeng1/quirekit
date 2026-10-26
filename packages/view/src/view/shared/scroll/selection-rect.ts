import {
  resolveViewCoordinateAuthority,
  type QuireSelectionRangeGeometry
} from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type {
  MountedViewRetainedSelectionScrollRectOptions,
  MountedViewScrollRect
} from "./types";

/**
 * Resolves the default scroll rectangle from retained render-time selection geometry.
 *
 * @param options - Render result and surface projection inputs.
 * @returns Client-space rectangle to reveal, or null when retained selection geometry is unavailable.
 */
export function resolveMountedRetainedSelectionScrollRect(
  options: MountedViewRetainedSelectionScrollRectOptions
): MountedViewScrollRect | null {
  const selection = options.renderResult.interactionSnapshot.state.pm.selection as {
    readonly empty: boolean;
    readonly from: number;
    readonly to: number;
    readonly head?: number | undefined;
  };
  const rect = selection.empty
    ? options.renderResult.selectionGeometry.carets[0]?.rect
    : resolveMountedSelectionRangeScrollRect(options, selection);

  return rect === undefined
    ? null
    : projectMountedSelectionRectToClient(options, rect);
}

/**
 * Resolves the range rectangle closest to the current selection head.
 *
 * @param options - Render result and surface projection inputs.
 * @param selection - Current selection shape from the render-time snapshot.
 * @returns Document-space selection rectangle to reveal, or undefined.
 */
function resolveMountedSelectionRangeScrollRect(
  options: MountedViewRetainedSelectionScrollRectOptions,
  selection: {
    readonly from: number;
    readonly to: number;
    readonly head?: number | undefined;
  }
): QuireRect | undefined {
  const ranges = options.renderResult.selectionGeometry.ranges;

  if (ranges.length === 0) {
    return undefined;
  }

  const head = resolveMountedSelectionHead(selection);
  const matchingRanges = ranges.filter(
    (range) => range.range.from <= head && head <= range.range.to
  );

  if (matchingRanges.length > 0) {
    const range =
      head <= selection.from
        ? matchingRanges[0]
        : matchingRanges[matchingRanges.length - 1];

    return range?.rect;
  }

  if (head >= selection.to) {
    return ranges[ranges.length - 1]?.rect;
  }

  if (head <= selection.from) {
    return ranges[0]?.rect;
  }

  return resolveNearestMountedSelectionRangeRect(ranges, head);
}

/**
 * Resolves the current selection head while matching PM's optional head shape.
 *
 * @param selection - Current selection shape.
 * @returns Document position used as the scroll target.
 */
function resolveMountedSelectionHead(selection: {
  readonly from: number;
  readonly head?: number | undefined;
}): number {
  return typeof selection.head === "number" ? selection.head : selection.from;
}

/**
 * Picks the closest range rectangle when the selection head falls in a visual gap.
 *
 * @param ranges - Retained selection range rectangles.
 * @param head - Selection head document position.
 * @returns Nearest document-space range rectangle.
 */
function resolveNearestMountedSelectionRangeRect(
  ranges: readonly QuireSelectionRangeGeometry[],
  head: number
): QuireRect | undefined {
  let nearest = ranges[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const range of ranges) {
    const distance =
      head < range.range.from
        ? range.range.from - head
        : head > range.range.to
          ? head - range.range.to
          : 0;

    if (distance < nearestDistance) {
      nearest = range;
      nearestDistance = distance;
    }
  }

  return nearest?.rect;
}

/**
 * Projects a retained document-space selection rectangle into client-space scroll coordinates.
 *
 * @param options - Surface projection inputs.
 * @param rect - Document-space retained selection rectangle.
 * @returns Client-space scroll rectangle.
 */
function projectMountedSelectionRectToClient(
  options: MountedViewRetainedSelectionScrollRectOptions,
  rect: QuireRect
): MountedViewScrollRect {
  const mapping = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).documentToClientRect(rect);

  return {
    left: mapping.to.x,
    right: mapping.to.x + mapping.to.width,
    top: mapping.to.y,
    bottom: mapping.to.y + mapping.to.height
  };
}
