import type {
  QuireMountedTableChromeAnchor
} from "@quirekit/core";
import type {
  EditorUITableMoveController,
  EditorUITableMoveRequest,
  EditorUITableMoveSource
} from "./types";

/**
 * Filters boundaries that would leave the source range in place.
 *
 * @param preview - Current preview carrying a target boundary.
 * @returns Non-noop semantic request, or null.
 */
export function createEditorUITableMoveRequestFromPreview(
  preview: NonNullable<EditorUITableMoveController["preview"]["value"]>
): EditorUITableMoveRequest | null {
  return preview.targetIndex >= preview.from
    && preview.targetIndex <= preview.to + 1
    ? null
    : {
        axis: preview.axis,
        from: preview.from,
        to: preview.to,
        targetIndex: preview.targetIndex
      };
}

/**
 * Resolves the closest page-local insertion boundary on one axis.
 *
 * @param boundaries - Mounted `N + 1` axis boundaries.
 * @param coordinate - Current viewport pointer coordinate.
 * @param axis - Row or column axis.
 * @returns Closest boundary, or undefined.
 */
export function resolveNearestEditorUITableMoveBoundary(
  boundaries: readonly QuireMountedTableChromeAnchor[],
  coordinate: number,
  axis: EditorUITableMoveSource["axis"]
): QuireMountedTableChromeAnchor | undefined {
  return boundaries.reduce<QuireMountedTableChromeAnchor | undefined>(
    (nearest, candidate) => {
      if (nearest === undefined) {
        return candidate;
      }
      const candidatePosition = axis === "row"
        ? candidate.rect.top
        : candidate.rect.left;
      const nearestPosition = axis === "row"
        ? nearest.rect.top
        : nearest.rect.left;
      return Math.abs(candidatePosition - coordinate)
        < Math.abs(nearestPosition - coordinate)
        ? candidate
        : nearest;
    },
    undefined
  );
}
