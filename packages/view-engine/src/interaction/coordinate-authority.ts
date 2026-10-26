import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import type {
  QuireClientRect,
  QuireViewClientPoint,
  QuireViewClientRect,
  QuireViewCoordinateAuthority,
  QuireViewSurfaceProjection
} from "./types";
import type {
  QuireViewCoordinatePointMapping,
  QuireViewCoordinateRectMapping
} from "../view-graph";
import {
  createQuireViewCoordinatePoint,
  createQuireViewCoordinatePointMapping,
  createQuireViewCoordinateRect
} from "../view-graph/coordinate-space";

/**
 * Creates the single coordinate authority for one mounted backend surface.
 *
 * The authority owns the affine mapping between **document space** (the layout
 * snapshot's absolute, global coordinate space, where blocks already carry their
 * page offsets) and **client space** (browser CSS pixels). Every layer that maps
 * a position to the screen or a pointer back to a position — caret/selection
 * geometry, hit testing, and the hidden input proxy — must go through this one
 * object so the conversions can never drift apart.
 *
 * The mapping is derived from a {@link QuireViewSurfaceProjection}: the surface's
 * client rectangle and the document-space bounds it represents. This makes the
 * surface→document origin explicit per backend instead of every call site
 * re-assuming `surfaceClientRect + documentRect` (origin 0, scale 1). Canvas
 * single-surface and page-stack, SVG, and HTML each supply their own projection.
 *
 * @param projection - Surface client rectangle and the document bounds it maps onto.
 * @returns Coordinate authority that converts between document and client space.
 */
export function createViewCoordinateAuthority(
  projection: QuireViewSurfaceProjection
): QuireViewCoordinateAuthority {
  const scaleX = resolveProjectionScale(
    projection.surfaceClientRect.width,
    projection.surfaceBounds.width
  );
  const scaleY = resolveProjectionScale(
    projection.surfaceClientRect.height,
    projection.surfaceBounds.height
  );
  /**
   * Maps a client point to a document point with retained path metadata.
   *
   * @param point - Client point in browser CSS pixels.
   * @returns Tagged point mapping from client to document space.
   */
  const clientToDocumentPoint = (
    point: QuireViewClientPoint
  ): QuireViewCoordinatePointMapping<"client", "document"> => {
    const from = createQuireViewCoordinatePoint(
      "client",
      point.left,
      point.top
    );
    const to = createQuireViewCoordinatePoint(
      "document",
      projection.surfaceBounds.x +
        (point.left - projection.surfaceClientRect.left) / scaleX,
      projection.surfaceBounds.y +
        (point.top - projection.surfaceClientRect.top) / scaleY
    );

    return createQuireViewCoordinatePointMapping(from, to, scaleX, scaleY);
  };
  /**
   * Maps a document point to a client point with retained path metadata.
   *
   * @param point - Document-space point.
   * @returns Tagged point mapping from document to client space.
   */
  const documentToClientPoint = (
    point: QuirePoint
  ): QuireViewCoordinatePointMapping<"document", "client"> => {
    const from = createQuireViewCoordinatePoint(
      "document",
      point.x,
      point.y
    );
    const to = createQuireViewCoordinatePoint(
      "client",
      projection.surfaceClientRect.left +
        (point.x - projection.surfaceBounds.x) * scaleX,
      projection.surfaceClientRect.top +
        (point.y - projection.surfaceBounds.y) * scaleY
    );

    return createQuireViewCoordinatePointMapping(from, to, scaleX, scaleY);
  };
  /**
   * Maps a document rectangle to a client rectangle with retained path metadata.
   *
   * @param rect - Document-space rectangle.
   * @returns Tagged rectangle mapping from document to client space.
   */
  const documentToClientRect = (
    rect: QuireRect
  ): QuireViewCoordinateRectMapping<"document", "client"> => {
    const pointMapping = documentToClientPoint({ x: rect.x, y: rect.y });
    const from = createQuireViewCoordinateRect("document", rect);
    const to = createQuireViewCoordinateRect("client", {
      x: pointMapping.to.x,
      y: pointMapping.to.y,
      width: rect.width * scaleX,
      height: rect.height * scaleY
    });

    return {
      from,
      to,
      path: pointMapping.path
    };
  };

  return {
    projection,
    scaleX,
    scaleY,

    /**
     * Maps a client point to a document-space point with its conversion path.
     *
     * @param point - Client point in browser CSS pixels.
     * @returns Tagged point mapping from client to document space.
     */
    clientToDocumentPoint(
      point: QuireViewClientPoint
    ): QuireViewCoordinatePointMapping<"client", "document"> {
      return clientToDocumentPoint(point);
    },

    /**
     * Maps a document-space point to a client point with its conversion path.
     *
     * @param point - Document-space point in the layout snapshot coordinate space.
     * @returns Tagged point mapping from document to client space.
     */
    documentToClientPoint(
      point: QuirePoint
    ): QuireViewCoordinatePointMapping<"document", "client"> {
      return documentToClientPoint(point);
    },

    /**
     * Maps a document-space rectangle to a client rectangle with its conversion path.
     *
     * @param rect - Document-space rectangle in the layout snapshot coordinate space.
     * @returns Tagged rectangle mapping from document to client space.
     */
    documentToClientRect(
      rect: QuireRect
    ): QuireViewCoordinateRectMapping<"document", "client"> {
      return documentToClientRect(rect);
    },

    /**
     * Maps a client point to its document-space point.
     *
     * @param point - Client point in browser CSS pixels.
     * @returns Document-space point in the layout snapshot coordinate space.
     */
    documentPointFromClient(point: QuireViewClientPoint): QuirePoint {
      const mapping = clientToDocumentPoint(point);

      return {
        x: mapping.to.x,
        y: mapping.to.y
      };
    },

    /**
     * Maps a document-space point to its client point.
     *
     * @param point - Document-space point in the layout snapshot coordinate space.
     * @returns Client point in browser CSS pixels.
     */
    clientPointFromDocument(point: QuirePoint): QuireViewClientPoint {
      const mapping = documentToClientPoint(point);

      return {
        left: mapping.to.x,
        top: mapping.to.y
      };
    },

    /**
     * Maps a document-space rectangle to its client-space rectangle.
     *
     * @param rect - Document-space rectangle in the layout snapshot coordinate space.
     * @returns Client-space rectangle in browser CSS pixels.
     */
    clientRectFromDocument(rect: QuireRect): QuireViewClientRect {
      const mapping = documentToClientRect(rect);

      return {
        left: mapping.to.x,
        right: mapping.to.x + mapping.to.width,
        top: mapping.to.y,
        bottom: mapping.to.y + mapping.to.height
      };
    }
  };
}

/**
 * Builds the identity document-space bounds for a surface client rectangle.
 *
 * Backends whose surface client rectangle corresponds directly to document
 * coordinate `(0, 0)` at scale 1 use this default so a missing projection keeps
 * the historical `surfaceClientRect + documentRect` behavior.
 *
 * @param surfaceClientRect - Surface client rectangle to mirror.
 * @returns Document-space bounds anchored at the origin with the client size.
 */
export function createIdentitySurfaceBounds(
  surfaceClientRect: QuireClientRect
): QuireRect {
  return {
    x: 0,
    y: 0,
    width: surfaceClientRect.width,
    height: surfaceClientRect.height
  };
}

/**
 * Resolves a coordinate authority from an optional document-space bounds.
 *
 * @param surfaceClientRect - Surface client rectangle for the active backend.
 * @param surfaceBounds - Document-space bounds the client rectangle maps onto, when known.
 * @returns Coordinate authority for the resolved projection.
 */
export function resolveViewCoordinateAuthority(
  surfaceClientRect: QuireClientRect,
  surfaceBounds: QuireRect | undefined
): QuireViewCoordinateAuthority {
  return createViewCoordinateAuthority({
    surfaceClientRect,
    surfaceBounds: surfaceBounds ?? createIdentitySurfaceBounds(surfaceClientRect)
  });
}

/**
 * Resolves a client-to-document scale with a stable fallback for collapsed bounds.
 *
 * @param clientSize - Browser client size in CSS pixels.
 * @param documentSize - Document-space surface size.
 * @returns Scale used to map document coordinates to client CSS pixels.
 */
function resolveProjectionScale(clientSize: number, documentSize: number): number {
  if (
    !Number.isFinite(clientSize) ||
    !Number.isFinite(documentSize) ||
    documentSize <= 0 ||
    clientSize <= 0
  ) {
    return 1;
  }

  return clientSize / documentSize;
}
