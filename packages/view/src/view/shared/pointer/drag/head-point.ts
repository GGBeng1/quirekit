import type { QuireRect } from "@quirekit/renderer";
import type { QuireClientPoint, QuireClientRect } from "@quirekit/view-engine";
import {
  resolveMountedDragBoundaryClientRect,
  resolveMountedLayoutViewportClientRect
} from "./boundary";
import { projectMountedDragClientPointToSurface } from "./projection";

/** Inputs used to resolve the active drag head point for mounted views. */
interface ResolveMountedPointerDragHeadClientPointOptions {
  /** Mounted editor root that owns visible drag clipping. */
  readonly root: HTMLElement;
  /** Browser client point reported by the active pointer move. */
  readonly clientPoint: QuireClientPoint;
  /** Mounted coordinate surface client rectangle. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds the coordinate surface maps onto. */
  readonly surfaceBounds: QuireRect;
  /** Layout viewport rectangle expressed in document coordinates. */
  readonly viewportRect: QuireRect;
}

/**
 * Resolves the pointer drag head point projected onto the mounted layout surface.
 *
 * @param options - Mounted root, pointer point, surface projection, and layout viewport.
 * @returns Client point suitable for drag-range hit testing.
 */
export function resolveMountedPointerDragHeadClientPoint(
  options: ResolveMountedPointerDragHeadClientPointOptions
): QuireClientPoint {
  return projectMountedDragClientPointToSurface({
    clientPoint: options.clientPoint,
    surfaceClientRect: options.surfaceClientRect,
    dragBoundaryClientRect: resolveMountedDragBoundaryClientRect(options.root),
    layoutViewportClientRect: resolveMountedLayoutViewportClientRect({
      surfaceClientRect: options.surfaceClientRect,
      surfaceBounds: options.surfaceBounds,
      viewportRect: options.viewportRect
    })
  });
}
