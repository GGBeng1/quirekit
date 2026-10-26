import type { QuireRect } from "@quirekit/renderer";
import type {
  CanvasMountedViewRuntimeOptions,
  CanvasSurfaceSize
} from "../types";
import type {
  CanvasMountedContentSurfaceState,
  PrepareCanvasMountedRenderSurfacesOptions
} from "./types";
import {
  resolveCanvasSurfaceTarget,
  syncCanvasSurfaceBackingStore
} from "./backing-store";
import { resolveCanvasSurfaceDisplaySize } from "./size";
import {
  createQuireMountedSurfaceBounds,
  resolveQuireMountedViewportRect
} from "../../shared";
import { resolveCanvasDevicePixelRatio } from "../device-pixel-ratio";

/**
 * Prepares the single-surface canvas backing stores, transforms, and viewport
 * geometry. Page-stack mode has no reference content canvas, so this returns
 * undefined and the page-stack render path builds its result targetlessly.
 *
 * @param options - Mounted canvas elements and optional runtime inputs.
 * @returns Surface state for a render pass, or undefined when no content surface exists.
 */
export function prepareCanvasMountedRenderSurfaces(
  options: PrepareCanvasMountedRenderSurfacesOptions
): CanvasMountedContentSurfaceState | undefined {
  const { contentSurface, overlaySurface } = options.elements;
  const contentTarget = contentSurface
    ? resolveCanvasSurfaceTarget(contentSurface)
    : undefined;

  if (!contentSurface || !contentTarget) {
    return undefined;
  }

  const overlayTarget = overlaySurface
    ? resolveCanvasSurfaceTarget(overlaySurface)
    : undefined;
  const metrics = resolveCanvasMountedSurfaceMetrics(options);

  syncCanvasSurfaceBackingStore(
    contentSurface,
    contentTarget,
    metrics.displaySize,
    metrics.devicePixelRatio
  );

  if (overlaySurface) {
    syncCanvasSurfaceBackingStore(
      overlaySurface,
      overlayTarget,
      metrics.displaySize,
      metrics.devicePixelRatio
    );
  }

  return {
    contentTarget,
    ...(overlayTarget === undefined ? {} : { overlayTarget }),
    ...metrics
  };
}

/** Surface geometry derived without sizing or painting any backing store. */
export interface CanvasMountedSurfaceMetrics {
  /** CSS-sized canvas dimensions. */
  readonly displaySize: CanvasSurfaceSize;
  /** Device pixel ratio used by backing stores. */
  readonly devicePixelRatio: number;
  /** Viewport rectangle used by layout and hit testing. */
  readonly viewportRect: QuireRect;
  /** Full mounted surface bounds used to clear paint targets. */
  readonly surfaceBounds: QuireRect;
}

/**
 * Resolves surface geometry (display size, DPR, viewport) without touching backing
 * stores, so page-stack rendering can build a render result without sizing the
 * full-document reference canvas.
 *
 * @param options - Mounted canvas elements and optional runtime inputs.
 * @returns Surface metrics for one render pass.
 */
export function resolveCanvasMountedSurfaceMetrics(
  options: PrepareCanvasMountedRenderSurfacesOptions
): CanvasMountedSurfaceMetrics {
  const coordinateSurface = options.elements.coordinateSurface;
  const displaySize = resolveCanvasSurfaceDisplaySize({
    rect: readCanvasBoundingRect(coordinateSurface),
    fallback: resolveCanvasMountedFallbackSize(coordinateSurface, options.runtime)
  });
  // CSS zoom changes client pixels, not document units. Automatic raster density
  // follows displayed paper up to 4x: a retina 400% pinch must not allocate a
  // 12x full-page bitmap. Explicit host density and its live floor stay authoritative.
  const clientWidth = coordinateSurface.getBoundingClientRect?.().width ?? 0;
  const scale = displaySize.width > 0 ? clientWidth / displaySize.width : 1;
  const devicePixelRatio = options.runtime?.devicePixelRatio ?? Math.max(
    resolveCanvasMountedDevicePixelRatio(options.runtime),
    Math.min(4, scale * (coordinateSurface.ownerDocument?.defaultView?.devicePixelRatio ?? 1)));

  return {
    displaySize,
    devicePixelRatio,
    viewportRect: resolveQuireMountedViewportRect({
      displaySize,
      viewportRect: options.runtime?.viewportRect,
      viewportPadding: options.runtime?.viewportPadding
    }),
    surfaceBounds: createQuireMountedSurfaceBounds(displaySize)
  };
}

/**
 * Resolves the current device pixel ratio for a mounted canvas view.
 *
 * @param runtime - Optional runtime sizing options.
 * @returns Device pixel ratio used for backing stores.
 */
function resolveCanvasMountedDevicePixelRatio(
  runtime: CanvasMountedViewRuntimeOptions | undefined
): number {
  return resolveCanvasDevicePixelRatio(
    runtime?.devicePixelRatio,
    runtime?.getDevicePixelRatio
  );
}

/**
 * Resolves fallback display dimensions before CSS layout has a measurable box.
 *
 * @param surface - Coordinate surface used to infer display size.
 * @param runtime - Optional runtime sizing options.
 * @returns Fallback display dimensions.
 */
function resolveCanvasMountedFallbackSize(
  surface: HTMLElement,
  runtime: CanvasMountedViewRuntimeOptions | undefined
): CanvasSurfaceSize {
  return {
    width: runtime?.width ?? readCanvasBackingCssSize(surface, "width"),
    height: runtime?.height ?? readCanvasBackingCssSize(surface, "height")
  };
}

/**
 * Reads the CSS-space display rectangle for a mounted coordinate surface.
 *
 * @param surface - Coordinate surface element to inspect.
 * @returns Surface display rectangle.
 */
function readCanvasBoundingRect(surface: HTMLElement): {
  readonly width: number;
  readonly height: number;
} {
  if (typeof surface.getBoundingClientRect !== "function") {
    return { width: 0, height: 0 };
  }

  const rect = surface.getBoundingClientRect();
  const style = surface.ownerDocument?.defaultView?.getComputedStyle?.(surface);
  return {
    width: Number.parseFloat(style?.width ?? "") || rect.width,
    height: Number.parseFloat(style?.height ?? "") || rect.height
  };
}

/**
 * Reads a canvas backing dimension as a CSS fallback.
 *
 * Only canvases expose intrinsic `width`/`height`; a pointer/coordinate div has
 * none, so this returns 0 there and the runtime size (or measured rect) governs.
 *
 * @param surface - Coordinate surface element to inspect.
 * @param dimension - Backing dimension to read.
 * @returns Fallback CSS dimension.
 */
function readCanvasBackingCssSize(
  surface: HTMLElement,
  dimension: "width" | "height"
): number {
  const value = (surface as Partial<HTMLCanvasElement>)[dimension];

  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}
