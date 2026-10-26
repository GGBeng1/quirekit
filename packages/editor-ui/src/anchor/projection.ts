import { resolveViewCoordinateAuthority } from "@quirekit/view-engine";
import type {
  EditorUIClientAnchorResolution,
  EditorUIReadyAnchorGeometry,
  ProjectEditorUIAnchorGeometryOptions
} from "./types";
import { isFiniteEditorUIAnchorRect } from "./validation";

/**
 * Projects one document-space anchor result into browser client coordinates.
 *
 * Stale and unsupported results pass through unchanged. Ready products use the
 * same affine authority as mounted caret, selection, pointer, and input-proxy
 * geometry; no DOM target is measured or guessed.
 *
 * @param options - Geometry result and mounted surface projection facts.
 * @returns Client-space product or explicit unsupported/stale result.
 */
export function projectEditorUIAnchorGeometry(
  options: ProjectEditorUIAnchorGeometryOptions
): EditorUIClientAnchorResolution {
  if (options.geometry.status !== "ready") {
    return options.geometry;
  }
  if (!isValidSurfaceProjection(options)) {
    return {
      status: "unsupported",
      kind: options.geometry.kind,
      snapshotVersion: options.geometry.snapshotVersion,
      reason: "surface-projection-invalid"
    };
  }

  const authority = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  );
  const rects = options.geometry.rects.map((rect) => {
    const mapped = authority.documentToClientRect(rect).to;
    return {
      x: mapped.x,
      y: mapped.y,
      width: mapped.width,
      height: mapped.height
    };
  });
  const mappedReference = authority.documentToClientRect(
    options.geometry.referenceRect
  ).to;
  const referenceRect = {
    x: mappedReference.x,
    y: mappedReference.y,
    width: mappedReference.width,
    height: mappedReference.height
  };
  if (
    !rects.every(isFiniteEditorUIAnchorRect)
    || !isFiniteEditorUIAnchorRect(referenceRect)
  ) {
    return {
      status: "unsupported",
      kind: options.geometry.kind,
      snapshotVersion: options.geometry.snapshotVersion,
      reason: "surface-projection-invalid"
    };
  }

  return projectReadyGeometry(options.geometry, rects, referenceRect);
}

/**
 * Rebuilds a ready product in client coordinate space.
 *
 * @param geometry - Ready document-space product.
 * @param rects - Projected client rectangles.
 * @param referenceRect - Projected client reference rectangle.
 * @returns Ready client-space product with the same semantic identity.
 */
function projectReadyGeometry(
  geometry: EditorUIReadyAnchorGeometry<"document">,
  rects: EditorUIReadyAnchorGeometry<"client">["rects"],
  referenceRect: EditorUIReadyAnchorGeometry<"client">["referenceRect"]
): EditorUIReadyAnchorGeometry<"client"> {
  return {
    ...geometry,
    coordinateSpace: "client",
    rects,
    referenceRect
  };
}

/**
 * Validates mounted client/document surface facts before affine projection.
 *
 * @param options - Mounted projection inputs.
 * @returns Whether all dimensions are finite and non-collapsed.
 */
function isValidSurfaceProjection(
  options: ProjectEditorUIAnchorGeometryOptions
): boolean {
  const client = options.surfaceClientRect;
  const bounds = options.surfaceBounds;
  return Number.isFinite(client.left)
    && Number.isFinite(client.top)
    && Number.isFinite(client.width)
    && Number.isFinite(client.height)
    && client.width > 0
    && client.height > 0
    && bounds !== undefined
    && isFiniteEditorUIAnchorRect(bounds)
    && bounds.width > 0
    && bounds.height > 0;
}
