import type { QuireRect } from "@quirekit/renderer";
import type { SvgMountedViewRuntimeOptions } from "./types";
import {
  createQuireMountedSurfaceBounds,
  resolveQuireMountedViewportRect
} from "../shared";

/** CSS-sized dimensions for a mounted SVG surface. */
export interface SvgSurfaceSize {
  /** Surface width in CSS pixels. */
  readonly width: number;
  /** Surface height in CSS pixels. */
  readonly height: number;
}

/** Prepared SVG surface state for one mounted render pass. */
export interface SvgMountedRenderSurfaceState {
  /** CSS-sized SVG dimensions. */
  readonly displaySize: SvgSurfaceSize;
  /** Viewport rectangle used by layout and paint clearing. */
  readonly viewportRect: QuireRect;
  /** Logical full-surface bounds used by SVG viewBox synchronization. */
  readonly surfaceBounds: QuireRect;
}

/**
 * Resolves SVG surface state for a page-stack render pass from runtime options only,
 * without reading actual SVG element dimensions. Used when no single content/overlay
 * SVG exists (page-stack mode), so there is no SVG element to query for a size.
 *
 * @param runtime - Optional mounted SVG runtime configuration.
 * @returns Surface state for a page-stack render pass.
 */
export function resolveSvgMountedPageStackSurfaceState(
  runtime: SvgMountedViewRuntimeOptions | undefined
): SvgMountedRenderSurfaceState {
  const width = runtime?.width ?? 0;
  const height = runtime?.height ?? 0;
  const displaySize: SvgSurfaceSize = { width, height };

  return {
    displaySize,
    viewportRect: resolveQuireMountedViewportRect({
      displaySize,
      viewportRect: runtime?.viewportRect,
      viewportPadding: runtime?.viewportPadding
    }),
    surfaceBounds: createQuireMountedSurfaceBounds(displaySize)
  };
}
