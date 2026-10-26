import {
  createQuireSelectionGeometryContextFromHitTestResult,
  createQuireInteractionGeometryAuthority,
  resolveViewCoordinateAuthority
} from "@quirekit/view-engine";
import type {
  QuireViewPosAtCoordsOptions,
  QuireViewPosAtCoordsResult
} from "./types";

/**
 * Maps viewport coordinates to a document position using mounted interaction geometry.
 *
 * The client point is converted to document space by the single coordinate
 * authority before hit testing, so this is the exact inverse of
 * `resolveQuireViewCoordsAtPos` and the round trip holds across page boundaries.
 *
 * @param options - Interaction geometry snapshot, viewport coordinates, and surface projection.
 * @returns DOM-like position result, or null when the coordinates miss.
 */
export function resolveQuireViewPosAtCoords(
  options: QuireViewPosAtCoordsOptions
): QuireViewPosAtCoordsResult | null {
  const mapping = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).clientToDocumentPoint(options.coords);
  const point = {
    x: mapping.to.x,
    y: mapping.to.y
  };
  const geometryAuthority = createQuireInteractionGeometryAuthority({
    snapshot: options.geometrySnapshot
  });
  const hitTestResult = geometryAuthority.posAtCoords(point);

  if (hitTestResult.kind === "miss") {
    return null;
  }

  const selectionContext =
    createQuireSelectionGeometryContextFromHitTestResult(hitTestResult);
  const visualInstanceId =
    selectionContext?.queryOwner?.region?.visualInstanceId
    ?? selectionContext?.viewRegion?.visualInstanceId;

  const objectPosition = selectionContext?.viewRegion?.kind === "floating-object"
    ? selectionContext.ownerSource?.range?.from : undefined;
  return {
    ...(objectPosition === undefined ? {} : { objectPosition }),
    pos: hitTestResult.position.pos,
    inside: hitTestResult.inside,
    ...(selectionContext === undefined || visualInstanceId === undefined
      ? {}
      : { selectionContext })
  };
}
