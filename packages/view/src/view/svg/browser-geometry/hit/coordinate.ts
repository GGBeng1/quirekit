import type { QuirePoint } from "@quirekit/renderer";
import type { QuireClientPoint } from "@quirekit/view-engine";
import type { SvgGeometryProviderHitTestOptions } from "../types";
import { clampSvgBrowserGeometryNumber } from "../math";

/**
 * Clamps side-blank pointer coordinates back onto the document surface.
 *
 * @param clientPoint - Browser client point to clamp.
 * @param surfaceClientRect - Document-space surface client rectangle.
 * @returns Client point with horizontal coordinate inside the surface bounds.
 */
export function clampSvgBrowserHitClientPointToHorizontalSurface(
  clientPoint: QuireClientPoint,
  surfaceClientRect: SvgGeometryProviderHitTestOptions["surfaceClientRect"]
): QuireClientPoint {
  if (surfaceClientRect.width <= 0) {
    return clientPoint;
  }

  return {
    clientX: clampSvgBrowserGeometryNumber(
      clientPoint.clientX,
      surfaceClientRect.left,
      surfaceClientRect.left + surfaceClientRect.width
    ),
    clientY: clientPoint.clientY
  };
}

/**
 * Maps a browser client point into one SVG root's user coordinate system.
 *
 * @param root - SVG root whose screen transform should be inverted.
 * @param options - Hit-test options with client coordinates.
 * @param fallbackPoint - Coordinate-authority document point used when SVG APIs are unavailable.
 * @returns SVG user-space point, or null when the root cannot be mapped.
 */
export function mapClientPointToSvgRootPoint(
  root: SVGSVGElement,
  options: SvgGeometryProviderHitTestOptions,
  fallbackPoint: QuirePoint
): QuirePoint | null {
  const ctm = root.getScreenCTM?.();

  if (!ctm) {
    return fallbackPoint;
  }

  try {
    const point = root.createSVGPoint();

    point.x = options.clientPoint.clientX;
    point.y = options.clientPoint.clientY;

    const mapped = point.matrixTransform(ctm.inverse());

    return { x: mapped.x, y: mapped.y };
  } catch {
    return fallbackPoint;
  }
}
