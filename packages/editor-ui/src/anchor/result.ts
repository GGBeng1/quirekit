import type {
  EditorUIAnchorRect,
  EditorUIAnchorRequest,
  EditorUIAnchorUnsupportedReason,
  EditorUIReadyAnchorGeometry,
  EditorUIUnsupportedAnchorGeometry
} from "./types";
import {
  isFiniteEditorUIAnchorRect,
  unionEditorUIAnchorRects
} from "./validation";

/** Fields supplied while constructing one ready document-space product. */
export interface CreateEditorUIReadyAnchorOptions {
  /** Exact anchor request being resolved. */
  readonly request: EditorUIAnchorRequest;
  /** Retained snapshot version that produced the geometry. */
  readonly snapshotVersion: number;
  /** Complete document-space rectangles. */
  readonly rects: readonly EditorUIAnchorRect[];
  /** Retained hit-target ids that supplied semantic geometry. */
  readonly sourceTargetIds?: readonly string[] | undefined;
}

/**
 * Creates a typed ready result after validating every rectangle.
 *
 * @param options - Request identity, snapshot version, rectangles, and target provenance.
 * @returns Ready product or explicit invalid-geometry result.
 */
export function createEditorUIReadyAnchor(
  options: CreateEditorUIReadyAnchorOptions
): EditorUIReadyAnchorGeometry<"document"> | EditorUIUnsupportedAnchorGeometry {
  const rects = options.rects;
  const referenceRect = unionEditorUIAnchorRects(rects);
  if (
    referenceRect === undefined
    || !rects.every(isFiniteEditorUIAnchorRect)
    || !isFiniteEditorUIAnchorRect(referenceRect)
  ) {
    return createEditorUIUnsupportedAnchor(
      options.request,
      "resolved-geometry-invalid",
      options.snapshotVersion
    );
  }

  const common = {
    status: "ready" as const,
    coordinateSpace: "document" as const,
    snapshotVersion: options.snapshotVersion,
    rects,
    referenceRect,
    sourceTargetIds: options.sourceTargetIds ?? []
  };

  switch (options.request.kind) {
    case "caret":
      return { ...common, kind: "caret", position: options.request.position };
    case "text":
      return { ...common, kind: "text", range: options.request.range };
    case "node":
      return { ...common, kind: "node", nodeId: options.request.nodeId };
    case "object":
      return { ...common, kind: "object", objectId: options.request.objectId };
    case "table":
      return {
        ...common,
        kind: "table",
        tableId: options.request.tableId,
        target: options.request.target
      };
    case "widget":
      return {
        ...common,
        kind: "widget",
        widgetId: options.request.widgetId,
        ...(options.request.part === undefined ? {} : { part: options.request.part })
      };
    case "virtual":
      return { ...common, kind: "virtual" };
    default:
      return assertUnreachableAnchorRequest(options.request);
  }
}

/**
 * Creates an explicit unsupported result without inventing fallback geometry.
 *
 * @param request - Request whose capability is unavailable.
 * @param reason - Stable unsupported reason.
 * @param snapshotVersion - Current retained snapshot version, when available.
 * @returns Unsupported geometry result.
 */
export function createEditorUIUnsupportedAnchor(
  request: EditorUIAnchorRequest,
  reason: EditorUIAnchorUnsupportedReason,
  snapshotVersion?: number
): EditorUIUnsupportedAnchorGeometry {
  return {
    status: "unsupported",
    kind: request.kind,
    ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
    reason
  };
}

/**
 * Preserves exhaustiveness when the public anchor request union grows.
 *
 * @param request - Unhandled request variant.
 * @returns Never; the function always throws.
 */
function assertUnreachableAnchorRequest(request: never): never {
  throw new TypeError(`Unsupported Editor UI anchor request: ${JSON.stringify(request)}`);
}
