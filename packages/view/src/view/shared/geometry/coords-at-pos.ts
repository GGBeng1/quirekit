import {
  createQuireInteractionGeometryAuthority,
  resolveQuireLayoutSnapshotForPosition,
  resolveViewCoordinateAuthority
} from "@quirekit/view-engine";
import type {
  QuireViewCoordsAtPosOptions,
  QuireViewCoordsAtPosResult,
  QuireViewResolvedCoordsAtPos
} from "./types";

/**
 * Maps a document position to a DOM-like client rectangle.
 *
 * The document rectangle resolved from interaction geometry is converted to
 * client space by the single coordinate authority, so caret/selection geometry
 * uses the same surface→document mapping as hit testing and the input proxy.
 *
 * @param options - Interaction geometry snapshot, document position, side preference, and surface projection.
 * @returns Client rectangle for the requested position.
 */
export function resolveQuireViewCoordsAtPos(
  options: QuireViewCoordsAtPosOptions
): QuireViewCoordsAtPosResult {
  return resolveQuireViewCoordsAtPosWithProvenance(options).clientRect;
}

/**
 * Maps a document position to retained and DOM-like client geometry.
 *
 * @param options - Interaction geometry snapshot, document position, side preference, and surface projection.
 * @returns Retained document-space answer and its client-space projection.
 */
export function resolveQuireViewCoordsAtPosWithProvenance(
  options: QuireViewCoordsAtPosOptions
): QuireViewResolvedCoordsAtPos {
  const geometryAuthority = createQuireInteractionGeometryAuthority({
    snapshot: options.geometrySnapshot
  });
  let rectAtPosition = geometryAuthority.coordsAtPos(
    options.pos,
    options.side ?? 1,
    options.selectionContext
  );

  // A clipped viewport can omit a valid source position. Query only its retained
  // page before projecting to client coordinates; never anchor UI to the viewport fallback.
  if (rectAtPosition.source === "viewport-fallback") {
    const snapshot = resolveQuireLayoutSnapshotForPosition(options.geometrySnapshot, options.pos);
    if (snapshot !== null) rectAtPosition = createQuireInteractionGeometryAuthority({ snapshot })
      .coordsAtPos(options.pos, options.side ?? 1, options.selectionContext);
  }

  const mapping = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).documentToClientRect(rectAtPosition.rect);

  return {
    rectAtPosition,
    clientRect: {
      left: mapping.to.x,
      right: mapping.to.x + mapping.to.width,
      top: mapping.to.y,
      bottom: mapping.to.y + mapping.to.height
    }
  };
}
