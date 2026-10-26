import type { QuireFontMetricsRefreshOptions } from "@quirekit/core";
import { resolveCanvasMountedSurfaceMetrics } from "./surface";
import { createMountedPaginatedBuildOptions } from "../shared/paginated-render-flow/layout-options";
import { createMountedPointerSelectionRenderer } from "../shared/lifecycle/selection-render";
import type {
  CanvasMountedView,
  CanvasMountedViewElements,
  CanvasMountedViewOptions,
  CanvasViewRenderScheduleReason
} from "./types";
import type { CanvasMountedRenderSurfaceState } from "./surface";
import { createCanvasMountedViewElements } from "./elements";
import { bindCanvasMountedPointerEvents } from "./pointer-events";
import {
  createCanvasMountedResourceRuntime,
  type CanvasMountedMutableRuntime
} from "./mount/resources";
import {
  renderCanvasMountedSingleSurface,
  type CanvasMountedRenderOrchestrationContext
} from "./mount/rendering";
import {
  buildCanvasMountedDrawingLayoutPreview,
  executeCanvasMountedPageStackFillPass,
  renderCanvasMountedPageStack,
  repaintCanvasMountedDrawingPreview,
  repaintCanvasMountedOverlay
} from "./mount/page-stack-rendering";
import {
  createCanvasPageStackPresentation,
  type CanvasPageStackPresentation
} from "./page-stack";
import type {
  QuireHiddenTextViewMode,
  QuireDrawingManipulatingState,
} from "@quirekit/view-engine";
import type {
  QuireViewRenderResult
} from "../types";
import {
  MountedPaginatedEditorView,
  bindMountedResizeEvents,
  pickMountedUpdateFrames,
  syncMountedPaginatedInputProxy,
  type QuireMountedImageResourceManager
} from "../shared";
import type {
  QuirePageStackFillPassRequest,
  QuirePageStackFillPassResult,
} from "../shared";
import type {
  MountedPaginatedDocumentRenderRequest,
  QuireMountedCaretMode,
} from "../shared";

export { createCanvasMountedViewElements } from "./elements";

/** Mounted Canvas 2D editor view shell. */
export class CanvasMountedEditorView
  extends MountedPaginatedEditorView<"canvas", CanvasMountedViewElements>
  implements CanvasMountedView
{
  private readonly runtime: CanvasMountedMutableRuntime;
  private readonly browserTextMeasurer: ReturnType<
    typeof createCanvasMountedResourceRuntime
  >["browserTextMeasurer"];
  private readonly textLayoutConfig: ReturnType<
    typeof createCanvasMountedResourceRuntime
  >["textLayoutConfig"];
  private readonly view: ReturnType<
    typeof createCanvasMountedResourceRuntime
  >["view"];
  private readonly backgroundShapingRuntime: ReturnType<
    typeof createCanvasMountedResourceRuntime
  >["backgroundShapingRuntime"];
  private readonly remainderPaginationRuntime: ReturnType<
    typeof createCanvasMountedResourceRuntime
  >["remainderPaginationRuntime"];
  private readonly imageResources: QuireMountedImageResourceManager;
  private currentSurfaceState: CanvasMountedRenderSurfaceState | undefined;
  /** Backend-owned sparse page frames, geometry epoch, and Canvas paint caches. */
  private readonly pageStackPresentation: CanvasPageStackPresentation | undefined;
  /** Retained adapter whose getters read the current mounted lifecycle. */
  private readonly renderOrchestrationContext: CanvasMountedRenderOrchestrationContext;

  /** @inheritdoc */
  protected getMountedServiceVisualRoots(): readonly HTMLElement[] {
    return [this.elements.pageStackHost ?? this.elements.coordinateSurface];
  }

  /**
   * Creates and mounts a Canvas 2D editor view shell.
   *
   * @param options - Editor, host element, identity, status, and runtime sizing.
   */
  constructor(options: CanvasMountedViewOptions) {
    super({
      editor: options.editor,
      id: options.id,
      mode: "canvas",
      status: options.status,
      elements: createCanvasMountedViewElements(options)
    });
    const resources = createCanvasMountedResourceRuntime({
      options,
      ownerDocument: this.elements.root.ownerDocument,
      lifecycle: {
        onFontSetChange: this.requestFontMetricsRefresh,
        onImageStateChange: this.requestImageResourceRefresh,
        readCurrentRevision: () => this.mountedRuntime.updates.currentRevision()
      }
    });
    this.runtime = resources.runtime;
    this.browserTextMeasurer = resources.browserTextMeasurer;
    this.textLayoutConfig = resources.textLayoutConfig;
    this.view = resources.view;
    this.backgroundShapingRuntime = resources.backgroundShapingRuntime;
    this.remainderPaginationRuntime = resources.remainderPaginationRuntime;
    this.imageResources = resources.imageResources;
    // No page is mounted yet; the first committed snapshot reports which pages decode images.
    this.imageResources.setDemandPages([]);
    this.initializeMountedPaginatedRuntime({
      scheduling: {
        invalidatesLayout: (request) => request.reason !== "selection" && request.reason !== "image-paint",
        postponeInteraction: () => {
          this.pageStackPresentation?.postponeFillForInteraction();
        },
        resumeInteraction: () => {
          this.pageStackPresentation?.resumeFillAfterInteraction();
        },
        onSchedule: ({ phase, update, counters }) => {
          this.runtime?.onUpdateSchedule?.({
            view: this,
            phase,
            reason: update.reason,
            mode: update.scheduleMode,
            counters
          });
        },
        ...pickMountedUpdateFrames(options.runtime, "requestFrame", "cancelFrame")
      },
      interaction: {
        host: {
          id: this.id,
          kind: "canvas",
          surface: this.elements.coordinateSurface,
          metadata: {
            root: this.elements.root,
            ...(this.elements.overlaySurface === undefined
              ? {}
              : { overlaySurface: this.elements.overlaySurface })
          }
        },
        onFocusChange: (focused) => this.runtime.onFocusChange?.(focused),
        onDrawingCreationActiveChange: (active) => {
          this.elements.coordinateSurface.style.cursor = active
            ? "crosshair"
            : "";
        }
      },
      geometry: {
        backendLabel: "canvas",
        readSurface: () => ({
          clientRect: this.elements.coordinateSurface.getBoundingClientRect(),
          surfaceBounds: this.currentSurfaceState?.surfaceBounds
        })
      },
      presentation: {
        lifecycle: {
          domCaretClassName: "qk-canvas-editor__caret",
          caretRendering: this.runtime?.caretRendering ?? "dom",
          caretMode: this.runtime.caret,
          readPointerSurface: () => this.elements.coordinateSurface,
          readSelectionBuildOptions: (request) => createMountedPaginatedBuildOptions(
            this.runtime,
            resolveCanvasMountedSurfaceMetrics({ elements: this.elements, runtime: this.runtime }).viewportRect,
            this.pageStackPresentation,
            request,
            this.runtime.scrollBufferPages ?? 1,
            this.imageResources.transformDisplayList
          ),
          isSelectionUpdateReady: () => (
            this.elements.pageStackHost !== undefined
            && this.currentSurfaceState !== undefined
            && this.pageStackPresentation !== undefined
            && this.pageStackPresentation.getFrames().length > 0
          ),
          repaintOverlay: (caretVisible) => {
            this.repaintOverlayWithCaretVisibility(caretVisible);
          },
          repaintDrawingPreview: (renderResult, caretVisible) => {
            this.repaintDrawingPreview(renderResult, caretVisible);
          },
          prepareDrawingPreviewContent: this.imageResources.transformDisplayList,
          buildDrawingLayoutPreview: (state, acceptedRenderResult) =>
            this.buildDrawingLayoutPreview(state, acceptedRenderResult),
          ...pickMountedUpdateFrames(this.runtime, "requestDrawingPreviewFrame", "cancelDrawingPreviewFrame"),
          onSelectionUpdate: ({ renderResult, reason }) => {
            const surfaceState = this.currentSurfaceState;
            if (surfaceState === undefined) {
              return;
            }

            this.runtime?.onRender?.({
              view: this,
              renderResult,
              strategy: "selection-update",
              reason,
              viewportRect: surfaceState.viewportRect,
              displaySize: surfaceState.displaySize,
              devicePixelRatio: surfaceState.devicePixelRatio,
              phases: [],
              pageContentCache:
                this.pageStackPresentation?.snapshotContentPaintCache()
            });
          },
          displayListStyles: this.runtime.displayListStyles,
          surfaceConfig: this.runtime.surfaceConfig
        },
        syncInputProxy: (renderResult, imePreedit) => {
          if (this.currentSurfaceState === undefined) {
            return;
          }

          syncMountedPaginatedInputProxy({
            inputProxy: this.elements.inputProxy,
            coordinateSurface: this.elements.coordinateSurface,
            renderResult,
            surfaceBounds: this.currentSurfaceState.surfaceBounds,
            imePreedit,
            font: this.runtime?.displayListStyles?.font
          });
        }
      },
      renderFlow: {
        lifecycle: {
          prepareFillRender: (options) =>
            this.pageStackPresentation?.prepareFillRender(options),
          renderDocument: (request) => {
            this.renderDocument(request);
          }
        },
        allowsSelectionReuse: () => this.elements.pageStackHost !== undefined,
        isDocumentPresentationReady: () => this.currentSurfaceState !== undefined
      }
    });

    // Resource references are initialized; getters defer page-stack and mutable
    // presentation reads until the owning lifecycle invokes a render.
    this.renderOrchestrationContext = this.createRenderOrchestrationContext();
    options.element.appendChild(this.elements.root);
    const pageStackHost = this.elements.pageStackHost;
    if (pageStackHost) {
      this.pageStackPresentation = createCanvasPageStackPresentation({
        root: this.elements.root,
        host: pageStackHost,
        runtime: this.runtime,
        fill: {
          executePass: (request) => this.executeCanvasPageStackFillPass(request),
          onAdvance: (advance) => {
            this.mountedRuntime.renderFlow.applyFillAdvance("fill", advance);
          }
        },
        readRenderState: () =>
          this.mountedRuntime.renderResult && this.currentSurfaceState
            ? {
                renderResult: this.mountedRuntime.renderResult,
                surfaceState: this.currentSurfaceState
              }
            : null,
        requestDocumentRefresh: () => this.refreshMountedGeometry(
          () => this.mountedRuntime.renderFlow.refreshDocument("scroll")),
        // Images decode for mounted pages only; pages entering the window decode then.
        onMountedPagesChange: (pageIndices) => this.imageResources.setDemandPages(pageIndices)
      });
    } else {
      this.pageStackPresentation = undefined;
    }
    this.mountedRuntime.interaction.addCleanup(
      bindCanvasMountedPointerEvents({
        mountedView: this,
        canvasView: this.view,
        elements: this.elements,
        widgetEvents: this.mountedRuntime.interaction.widgetEvents,
        runtime: this.runtime,
        getRenderState: () =>
          this.mountedRuntime.renderResult && this.currentSurfaceState
            ? {
                renderResult: this.mountedRuntime.renderResult,
                surfaceState: this.currentSurfaceState
              }
            : null,
        getInputBinding: () => this.mountedRuntime.interaction.getInputBinding(),
        getInteractionTarget: () =>
          this.mountedRuntime.interaction.getInteractionTarget(),
        focus: () => {
          this.focus();
        },
        renderSelection: createMountedPointerSelectionRenderer(
          () => this.mountedRuntime.updates.flush(),
          () => this.mountedRuntime.renderResult?.layoutSnapshot.state === this.editor.state,
          () => this.requestPaginatedRender({ reason: "selection" })
        ),
        setInteractionTarget: (target) => {
          this.mountedRuntime.interaction.setInteractionTarget(target);
        },
        setSelectionGeometryContext: (context) => {
          this.mountedRuntime.interaction.setSelectionGeometryContext(context);
        },
        prepareHeaderFooterPointerSelection: (target, clickCount) =>
          this.mountedRuntime.interaction.prepareHeaderFooterPointerSelection(
            target,
            clickCount
          ),
        handleDrawingCreationPointer: (event) =>
          this.mountedRuntime.interaction.handleDrawingCreationPointer(event),
        isDrawingCreationActive: () =>
          this.mountedRuntime.interaction.isDrawingCreationActive(),
        onPointerHitTest: (hitTestResult) => {
          this.runtime?.onPointerHitTest?.({ view: this, hitTestResult });
        }
      })
    );
    this.mountedRuntime.interaction.addCleanup(
      bindMountedResizeEvents({
        root: this.elements.root,
        observedElement: this.elements.coordinateSurface,
        onResize: () => {
          this.requestPaginatedRender({ reason: "resize" });
        }
      })
    );
    this.requestPaginatedRender({ reason: "initial" });
    this.initializeMountedPluginViews();
  }

  /** Clears browser measurements and schedules fresh pagination after font registration. */
  override refreshFontMetrics(options?: QuireFontMetricsRefreshOptions): void {
    if (this.browserTextMeasurer === undefined) {
      super.refreshFontMetrics();
      return;
    }
    if (options?.onlyIfFontSetChanged === true) this.browserTextMeasurer.invalidateIfFontSetChanged();
    else this.browserTextMeasurer.invalidate();
  }

  /** Tears down DOM owned by this mounted canvas view after base guards pass. */
  protected destroyPaginatedBackendView(): void {
    this.imageResources.destroy();
    this.backgroundShapingRuntime.destroy();
    this.remainderPaginationRuntime.destroy();
    this.pageStackPresentation?.destroy();
    this.browserTextMeasurer?.destroy();
    this.elements.root.remove();
  }

  /**
   * Schedules a full document refresh after browser font widths change.
   *
   * FontFaceSet events can arrive during the constructor's initial async paint.
   * A microtask lets mounted-runtime initialization finish while the canonical
   * scheduler still coalesces repeated face loads into the next full refresh.
   */
  private readonly requestFontMetricsRefresh = (): void => {
    queueMicrotask(() => {
      if (!this.isMountedViewDestroyed()) {
        this.mountedRuntime.renderFlow.refreshDocument("manual");
      }
    });
  };

  /** Coalesces decoded pixels whose display commands already own target geometry. */
  private readonly requestImageResourceRefresh = (): void => {
    if (!this.isMountedViewDestroyed()) {
      this.requestPaginatedRender({ reason: "image-paint" });
    }
  };

  /**
   * Executes one Canvas-specific document render from shared semantic facts.
   *
   * @param request - Canonical preedit, invalidation, and fill-window request.
   */
  private renderDocument(
    request: MountedPaginatedDocumentRenderRequest<CanvasViewRenderScheduleReason>
  ): void {
    const pageStackHost = this.elements.pageStackHost;
    if (pageStackHost !== undefined) {
      renderCanvasMountedPageStack(
        this.renderOrchestrationContext,
        pageStackHost,
        request.imePreedit,
        request.layoutDirtyRange,
        request.updatePatch,
        request.reason,
        request.fillWindow
      );
      return;
    }
    renderCanvasMountedSingleSurface(
      this.renderOrchestrationContext,
      request
    );
  }

  /**
   * Pre-shapes one cooperative fill chunk through layout job authority, then
   * lets the shared lifecycle advance only after accepted output warms the cache.
   *
   * @param request - Fill block window and abort signal owned by the controller.
   * @returns Whether shared fill should advance, retry, or stop.
   */
  private async executeCanvasPageStackFillPass(
    request: QuirePageStackFillPassRequest
  ): Promise<QuirePageStackFillPassResult> {
    return executeCanvasMountedPageStackFillPass(
      this.renderOrchestrationContext,
      request
    );
  }

  /**
   * Sets the caret presentation mode at runtime.
   *
   * @param mode - Caret mode to apply (`blink`, `steady`, or `hidden`).
   */
  setCaretMode(mode: QuireMountedCaretMode): void {
    this.mountedRuntime.presentation.setCaretMode(mode);
  }

  /** @inheritdoc */
  setHiddenTextViewMode(mode: QuireHiddenTextViewMode): void {
    if (this.runtime.hiddenTextViewMode === mode) {
      return;
    }
    this.runtime.hiddenTextViewMode = mode;
    this.elements.root.dataset.qkHiddenTextView = mode;
    this.mountedRuntime.renderFlow.refreshDocument("mode-change");
  }

  /** @inheritdoc */
  get hiddenTextViewMode(): QuireHiddenTextViewMode {
    return this.runtime.hiddenTextViewMode ?? "normal";
  }

  /**
   * Reads the current caret presentation mode.
   *
   * @returns Active caret mode.
   */
  get caretMode(): QuireMountedCaretMode {
    return this.mountedRuntime.presentation.caretMode;
  }

  /**
   * Repaints backend-owned overlay surfaces with the requested caret visibility.
   *
   * @param caretVisible - Whether retained caret commands should paint.
   */
  private repaintOverlayWithCaretVisibility(caretVisible: boolean): void {
    repaintCanvasMountedOverlay(
      this.renderOrchestrationContext,
      caretVisible
    );
  }

  /**
   * Repaints transient drawing content and chrome on mounted page surfaces.
   *
   * @param renderResult - Transient render products already committed by the runtime.
   * @param caretVisible - Whether retained caret commands should paint.
   */
  private repaintDrawingPreview(
    renderResult: QuireViewRenderResult,
    caretVisible: boolean
  ): void {
    repaintCanvasMountedDrawingPreview(
      this.renderOrchestrationContext,
      renderResult,
      caretVisible
    );
  }

  /**
   * Builds one isolated full-layout drawing preview for mounted page surfaces.
   *
   * @param state - Active manipulation frame.
   * @param acceptedRenderResult - Stable result captured before the gesture.
   * @returns Speculative page-stack result, or undefined when ownership is stale.
   */
  private buildDrawingLayoutPreview(
    state: QuireDrawingManipulatingState,
    acceptedRenderResult: QuireViewRenderResult
  ): QuireViewRenderResult | undefined {
    return buildCanvasMountedDrawingLayoutPreview(
      this.renderOrchestrationContext,
      state,
      acceptedRenderResult
    );
  }

  /**
   * Adapts private mounted lifecycle state to the focused render-orchestration API.
   *
   * The adapter keeps scheduling and interaction ownership in the mounted view while
   * rendering modules receive only the state transitions they are allowed to perform.
   *
   * @returns Retained context whose callbacks continue to read current state.
   */
  private createRenderOrchestrationContext(): CanvasMountedRenderOrchestrationContext {
    return {
      mountedView: this,
      elements: this.elements,
      runtime: this.runtime,
      textLayoutConfig: this.textLayoutConfig,
      view: this.view,
      backgroundShapingRuntime: this.backgroundShapingRuntime,
      remainderPaginationRuntime: this.remainderPaginationRuntime,
      imageResources: this.imageResources,
      readRenderResult: () => this.mountedRuntime.renderResult,
      commitRenderResult: (renderResult) => {
        this.mountedRuntime.commitRenderResult(renderResult);
      },
      syncPresentationAfterRender: () => {
        this.mountedRuntime.presentation.syncAfterRender();
      },
      readSelectionContext: () =>
        this.mountedRuntime.interaction.getSelectionGeometryContext(),
      readActiveAuxiliaryStorySourceId: () =>
        this.mountedRuntime.interaction.getHeaderFooterEditingSession()?.sourceId,
      readSurfaceState: () => this.currentSurfaceState,
      writeSurfaceState: (surfaceState) => {
        this.currentSurfaceState = surfaceState;
        this.imageResources.setRasterScale(surfaceState.devicePixelRatio);
      },
      readPageStackPresentation: () => this.pageStackPresentation,
      readCurrentRevision: () => this.mountedRuntime.updates.currentRevision(),
      isDestroyed: () => this.isMountedViewDestroyed()
    };
  }

}

/**
 * Creates a mounted Canvas 2D editor view shell.
 *
 * @param options - Editor, host element, identity, status, and runtime sizing.
 * @returns Mounted canvas editor view shell.
 */
export function createCanvasMountedView(
  options: CanvasMountedViewOptions
): CanvasMountedView {
  return new CanvasMountedEditorView(options);
}
