import type { QuireViewBuildOptions, QuireViewRenderResult } from "../../types";
import type { QuireView } from "../../facade";
import type {
  MountedPaginatedDocumentRenderRequest,
  MountedViewUpdateRevision,
  QuireMountedEditorView,
  QuireMountedImageResourceManager
} from "../../shared";
import type { CanvasBackgroundShapingRuntime } from "../background-shaping";
import type { CanvasMountedMutableRuntime } from "./resources";
import type { CanvasRemainderPaginationRuntime } from "../remainder-pagination";
import {
  prepareCanvasMountedRenderSurfaces,
  type CanvasMountedRenderSurfaceState
} from "../surface";
import type {
  CanvasMountedTextLayoutConfig,
  CanvasMountedView,
  CanvasMountedViewElements,
  CanvasViewRenderScheduleReason
} from "../types";
import { runCanvasMountedRenderPass } from "../render-pass";
import type { CanvasPageStackPresentation } from "../page-stack";

/** Backend state and callbacks used by Canvas render orchestration. */
export interface CanvasMountedRenderOrchestrationContext {
  /** Mounted Canvas view exposed to render callbacks and decoration geometry. */
  readonly mountedView: CanvasMountedView & QuireMountedEditorView;
  /** Mounted DOM surfaces and the optional paginated host. */
  readonly elements: CanvasMountedViewElements;
  /** Runtime policies, browser resource hooks, and render diagnostics. */
  readonly runtime: CanvasMountedMutableRuntime;
  /** Resolved text geometry used by background and remainder layout jobs. */
  readonly textLayoutConfig: CanvasMountedTextLayoutConfig;
  /** Facade that builds canonical render products. */
  readonly view: QuireView;
  /** Cooperative shaping runtime for page-stack fill. */
  readonly backgroundShapingRuntime: CanvasBackgroundShapingRuntime;
  /** Cooperative remainder-pagination runtime for complete fill windows. */
  readonly remainderPaginationRuntime: CanvasRemainderPaginationRuntime;
  /** Retained image resource transform applied before Canvas paint. */
  readonly imageResources: QuireMountedImageResourceManager;
  /** Reads the latest accepted render result. */
  readonly readRenderResult: () => QuireViewRenderResult | undefined;
  /** Commits one accepted render result to the shared mounted lifecycle. */
  readonly commitRenderResult: (renderResult: QuireViewRenderResult) => void;
  /** Synchronizes DOM caret and retained presentation after a committed render. */
  readonly syncPresentationAfterRender: () => void;
  /** Reads retained selection geometry for the current interaction target. */
  readonly readSelectionContext: () => QuireViewBuildOptions["selectionContext"];
  /** Reads the auxiliary story currently being edited, when any. */
  readonly readActiveAuxiliaryStorySourceId: () => string | undefined;
  /** Reads the latest Canvas surface metrics and optional paint targets. */
  readonly readSurfaceState: () => CanvasMountedRenderSurfaceState | undefined;
  /** Replaces the accepted Canvas surface state after a document render. */
  readonly writeSurfaceState: (surfaceState: CanvasMountedRenderSurfaceState) => void;
  /** Reads the currently installed paginated presentation, when active. */
  readonly readPageStackPresentation: () => CanvasPageStackPresentation | undefined;
  /** Reads the transaction revision that owns asynchronous layout output. */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
  /** Reports whether the mounted view has been destroyed. */
  readonly isDestroyed: () => boolean;
}

/**
 * Runs the target-backed single-canvas document rendering path.
 *
 * @param context - Mounted resources and lifecycle callbacks for this view.
 * @param request - Canonical preedit, invalidation, and render reason.
 */
export function renderCanvasMountedSingleSurface(
  context: CanvasMountedRenderOrchestrationContext,
  request: MountedPaginatedDocumentRenderRequest<CanvasViewRenderScheduleReason>
): void {
  const surfaceState = prepareCanvasMountedRenderSurfaces({
    elements: context.elements,
    runtime: context.runtime
  });
  if (!surfaceState) {
    return;
  }

  const scheduledRender = runCanvasMountedRenderPass({
    view: context.view,
    reason: request.reason,
    previousRenderResult: context.readRenderResult(),
    surfaceState,
    imePreedit: request.imePreedit,
    layoutDirtyRange: request.layoutDirtyRange,
    updatePatch: request.updatePatch,
    selectionContext: context.readSelectionContext(),
    activeAuxiliaryStorySourceId: context.readActiveAuxiliaryStorySourceId(),
    runtime: context.runtime,
    displayListTransform: context.imageResources.transformDisplayList,
    decorationSourceView: context.mountedView
  });

  context.writeSurfaceState(surfaceState);
  context.commitRenderResult(scheduledRender.renderResult);
  context.syncPresentationAfterRender();
  context.runtime.onRender?.({
    view: context.mountedView,
    renderResult: scheduledRender.renderResult,
    strategy: scheduledRender.strategy,
    reason: request.reason,
    viewportRect: surfaceState.viewportRect,
    displaySize: surfaceState.displaySize,
    devicePixelRatio: surfaceState.devicePixelRatio,
    phases: scheduledRender.phases
  });
}
