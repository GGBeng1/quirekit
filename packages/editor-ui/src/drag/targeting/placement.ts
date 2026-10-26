import type { EditorUIReadyAnchorGeometry } from "../../anchor";
import type {
  EditorUIDragIndicator,
  EditorUIDragPlacement,
  EditorUIDragPoint
} from "../types";
import type {
  EditorUIBlockFlowAxis,
  ResolveEditorUIBlockDropTargetOptions
} from "./types";

/**
 * Resolves before/after placement from authoritative document geometry.
 *
 * @param point - Pointer projected into document coordinates.
 * @param rect - Authoritative node reference rectangle.
 * @param axis - Block-flow axis.
 * @param writingDirection - Inline writing direction.
 * @returns Structural before or after placement.
 */
export function resolveEditorUIBlockDropPlacement(
  point: EditorUIDragPoint,
  rect: EditorUIReadyAnchorGeometry<"document">["referenceRect"],
  axis: EditorUIBlockFlowAxis,
  writingDirection: ResolveEditorUIBlockDropTargetOptions<unknown>["writingDirection"]
): Extract<EditorUIDragPlacement, "before" | "after"> {
  if (axis === "vertical") {
    return point.y < rect.y + rect.height / 2 ? "before" : "after";
  }
  const physical = point.x < rect.x + rect.width / 2 ? "before" : "after";
  return writingDirection === "rtl"
    ? physical === "before" ? "after" : "before"
    : physical;
}

/**
 * Creates a line indicator from the same authoritative node rectangle.
 *
 * @param geometry - Ready F-10 node anchor geometry.
 * @param placement - Structural edge represented by the line.
 * @param axis - Block-flow axis.
 * @returns Document-space line indicator with retained provenance.
 */
export function createEditorUIBlockDropIndicator(
  geometry: EditorUIReadyAnchorGeometry<"document">,
  placement: Extract<EditorUIDragPlacement, "before" | "after">,
  axis: EditorUIBlockFlowAxis
): EditorUIDragIndicator {
  const rect = geometry.referenceRect;
  const indicatorRect = axis === "vertical"
    ? {
        x: rect.x,
        y: placement === "before" ? rect.y : rect.y + rect.height,
        width: rect.width,
        height: 0
      }
    : {
        x: placement === "before" ? rect.x : rect.x + rect.width,
        y: rect.y,
        width: 0,
        height: rect.height
      };
  return {
    kind: "line",
    coordinateSpace: "document",
    snapshotVersion: geometry.snapshotVersion,
    placement,
    rect: indicatorRect,
    sourceTargetIds: geometry.sourceTargetIds
  };
}
