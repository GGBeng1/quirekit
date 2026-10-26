import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireMountedViewportSize,
  ResolveQuireMountedViewportRectOptions
} from "./types";

/**
 * Resolves the logical viewport shared by Canvas, SVG, and HTML mounts.
 *
 * Backend mounts remain responsible for measuring their own surfaces. This
 * helper only standardizes the coordinate-space policy applied after a size is
 * known: an explicit viewport wins, otherwise optional insets trim the surface.
 *
 * @param options - Measured size and optional viewport overrides.
 * @returns Logical viewport in mounted surface coordinates.
 */
export function resolveQuireMountedViewportRect(
  options: ResolveQuireMountedViewportRectOptions
): QuireRect {
  if (options.viewportRect) {
    return options.viewportRect;
  }

  const { displaySize, viewportPadding } = options;

  if (viewportPadding) {
    return {
      x: viewportPadding.left,
      y: viewportPadding.top,
      width: Math.max(
        displaySize.width - viewportPadding.left - viewportPadding.right,
        0
      ),
      height: Math.max(
        displaySize.height - viewportPadding.top - viewportPadding.bottom,
        0
      )
    };
  }

  return createQuireMountedSurfaceBounds(displaySize);
}

/**
 * Creates full logical surface bounds from measured CSS dimensions.
 *
 * @param displaySize - Measured rendering-surface dimensions in CSS pixels.
 * @returns Full mounted surface bounds rooted at the surface origin.
 */
export function createQuireMountedSurfaceBounds(
  displaySize: QuireMountedViewportSize
): QuireRect {
  return {
    x: 0,
    y: 0,
    width: displaySize.width,
    height: displaySize.height
  };
}
