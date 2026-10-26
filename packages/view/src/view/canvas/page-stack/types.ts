import type { MountedPageStackFillBackend, MountedPageStackFillOptions } from "../../shared/page-stack/fill/types";
import type { QuireViewRenderResult } from "../../types";
import type { CanvasMountedRenderSurfaceState } from "../surface";
import type { CanvasMountedViewRuntimeOptions } from "../types";

/** Current document products needed to realize a newly mounted Canvas page. */
export interface CanvasPageStackPresentationRenderState {
  /** Authoritative document-space render products. */
  readonly renderResult: QuireViewRenderResult;
  /** Current Canvas surface metrics, including the active DPR. */
  readonly surfaceState: CanvasMountedRenderSurfaceState;
}

/** Backend capabilities consumed by presentation-owned Canvas page-stack fill. */
export interface CanvasPageStackPresentationFillOptions extends MountedPageStackFillBackend {
  /** Canvas must execute each cooperative shaping chunk. */
  readonly executePass: NonNullable<MountedPageStackFillBackend["executePass"]>;
}

/** Inputs used to assemble the Canvas-specific fill lifecycle. */
export interface CreateCanvasPageStackFillLifecycleOptions extends MountedPageStackFillOptions {
  /** Backend fill execution and reconciliation capabilities. */
  readonly fill: CanvasPageStackPresentationFillOptions;
}

/** Construction contract for one mounted Canvas page-stack presentation. */
export interface CreateCanvasPageStackPresentationOptions {
  /** Mounted editor root used to resolve the canonical scroll authority. */
  readonly root: HTMLElement;
  /** Element that owns sparse page frames. */
  readonly host: HTMLElement;
  /** Canvas runtime policies and backend paint hooks. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
  /** Viewport-first fill capabilities owned by this presentation resource. */
  readonly fill: CanvasPageStackPresentationFillOptions;
  /** Reads the latest accepted document products for viewport realization. */
  readonly readRenderState: () => CanvasPageStackPresentationRenderState | null;
  /** Requests a document render when retained clip coverage is insufficient. */
  readonly requestDocumentRefresh: () => void;
  /**
   * Receives the mounted pages, visible and prepared, whenever they change.
   * @param pageIndices - Mounted pages of the committed snapshot.
   */
  readonly onMountedPagesChange?: ((pageIndices: readonly number[]) => void) | undefined;
}
