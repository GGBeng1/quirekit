import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireTextSelectionRangeOptions } from "../types";
import {
  collectQuireSelectionGeometrySourceFragmentIds,
  collectQuireSelectionGeometryVisualInstanceIds,
  resolveQuireSelectionGeometryReferenceRect
} from "../selection-geometry-context";
import {
  areQuireRectsOnSameLine,
  isQuireSubLayoutPositionInsideRange,
  measureQuireRectVerticalDistance
} from "./shared";
import type { QuireSubLayoutSelectionRect } from "./types";
import { iterateQuireSubLayoutQueryProductSets } from "./product-sets";

/**
 * Resolves a visual line range from retained sub-layout selection rectangles.
 *
 * @param nodes - Layout nodes to search.
 * @param options - Position and retained selection context.
 * @returns Context-matched visual line range, or null when no sub-layout line owns the position.
 */
export function resolveQuireSubLayoutLineSelectionRange(
  nodes: readonly QuireLayoutNode[],
  options: QuireTextSelectionRangeOptions
): QuireDocumentRange | null {
  const allRects = [...iterateQuireSubLayoutQueryProductSets(nodes)]
    .flatMap(products => products.selectionRects);
  const positionRects = allRects.filter((rect) =>
    isQuireSubLayoutPositionInsideRange(options.position.pos, rect.range)
  );
  const activeRect = selectQuireSubLayoutSelectionRectByContext(
    positionRects,
    options.selectionContext
  ) ?? positionRects[0];

  if (activeRect === undefined) {
    return null;
  }

  const lineRects = allRects.filter((rect) =>
    areQuireRectsOnSameLine(rect.rect, activeRect.rect) &&
    areQuireSubLayoutSelectionRectsInSameVisualGroup(rect, activeRect)
  );

  if (lineRects.length === 0) {
    return null;
  }

  return {
    from: Math.min(...lineRects.map((rect) => rect.range.from)),
    to: Math.max(...lineRects.map((rect) => rect.range.to))
  };
}

/**
 * Selects a retained sub-layout selection rect by active visual context.
 *
 * @param rects - Candidate retained selection rectangles.
 * @param selectionContext - Optional active selection context.
 * @returns Context-matched rectangle, or null when no context applies.
 */
function selectQuireSubLayoutSelectionRectByContext(
  rects: readonly QuireSubLayoutSelectionRect[],
  selectionContext: QuireTextSelectionRangeOptions["selectionContext"]
): QuireSubLayoutSelectionRect | null {
  if (selectionContext === undefined || rects.length < 2) {
    return null;
  }

  const visualInstanceIds = collectQuireSelectionGeometryVisualInstanceIds(
    selectionContext
  );

  if (visualInstanceIds.length > 0) {
    const match = rects.find((rect) =>
      visualInstanceIds.includes(
        rect.queryOwner?.region?.visualInstanceId ?? ""
      )
    );

    if (match !== undefined) {
      return match;
    }
  }

  const sourceFragmentIds = collectQuireSelectionGeometrySourceFragmentIds(
    selectionContext
  );

  if (sourceFragmentIds.length > 0) {
    const match = rects.find((rect) =>
      sourceFragmentIds.includes(rect.queryOwner?.sourceFragmentId ?? "")
    );

    if (match !== undefined) {
      return match;
    }
  }

  const referenceRect = resolveQuireSelectionGeometryReferenceRect(
    selectionContext
  );

  return referenceRect === undefined
    ? null
    : findNearestQuireSubLayoutSelectionRect(rects, referenceRect);
}

/**
 * Finds the retained selection rectangle nearest to a reference rectangle.
 *
 * @param rects - Candidate retained selection rectangles.
 * @param referenceRect - Active gesture reference rectangle.
 * @returns Nearest candidate, or null when there are no candidates.
 */
function findNearestQuireSubLayoutSelectionRect(
  rects: readonly QuireSubLayoutSelectionRect[],
  referenceRect: QuireRect
): QuireSubLayoutSelectionRect | null {
  let nearest: QuireSubLayoutSelectionRect | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const rect of rects) {
    const distance = measureQuireRectVerticalDistance(rect.rect, referenceRect);

    if (distance < nearestDistance) {
      nearest = rect;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Checks whether two retained selection rectangles belong to one visual group.
 *
 * @param first - First retained selection rectangle.
 * @param second - Second retained selection rectangle.
 * @returns Whether both rectangles share visual-instance or source-fragment identity.
 */
function areQuireSubLayoutSelectionRectsInSameVisualGroup(
  first: QuireSubLayoutSelectionRect,
  second: QuireSubLayoutSelectionRect
): boolean {
  const firstVisualInstanceId = first.queryOwner?.region?.visualInstanceId;
  const secondVisualInstanceId = second.queryOwner?.region?.visualInstanceId;

  if (
    firstVisualInstanceId !== undefined ||
    secondVisualInstanceId !== undefined
  ) {
    return firstVisualInstanceId === secondVisualInstanceId;
  }

  const firstSourceFragmentId = first.queryOwner?.sourceFragmentId;
  const secondSourceFragmentId = second.queryOwner?.sourceFragmentId;

  return firstSourceFragmentId === undefined &&
    secondSourceFragmentId === undefined
    ? true
    : firstSourceFragmentId === secondSourceFragmentId;
}
