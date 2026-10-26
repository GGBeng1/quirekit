import type { QuireFontMetricsRefreshOptions } from "@quirekit/core";
import { resolveSvgMountedPageStackSurfaceState } from "./surface";
import { createMountedPaginatedBuildOptions } from "../shared/paginated-render-flow/layout-options";
import { createMountedPointerSelectionRenderer } from "../shared/lifecycle/selection-render";
import type {
  SvgMountedView,
  SvgMountedViewElements,
  SvgMountedViewOptions,
  SvgMountedViewRenderReason
} from "./types";
import {
  createSvgMountedViewElements,
  resolveSvgMountedCoordinateSurface
} from "./dom";
import type {
  SvgMountedRenderSurfaceState
} from "./surface";
import {
  createSvgPageStackPresentation,
  type SvgPageStackPresentation
} from "./page-stack";
import type {
  QuireHiddenTextViewMode
} from "@quirekit/view-engine";
import type {
  QuireViewRenderResult
} from "../types";
import type {
  MountedPaginatedDocumentRenderRequest
} from "../shared";
import {
  MountedPaginatedEditorView,
  bindMountedResizeEvents,
  pickMountedUpdateFrames,
  syncMountedPaginatedInputProxy
} from "../shared";
import { bindSvgMountedPointerEvents } from "./pointer-events";
import {
  resolveSvgBrowserMeasurementHitContext
} from "./browser-geometry";
import {
  createSvgMountedResources,
  type SvgMountedMutableRuntime,
  type SvgMountedResourceBundle
} from "./resources";
import {
  renderSvgMountedPageStack
} from "./page-stack/renderer";
import { buildSvgMountedDrawingLayoutPreview } from "./page-stack/preview";
import {
  repaintSvgMountedDrawingPreview,
  repaintSvgMountedOverlayWithCaretVisibility
} from "./overlay";

/** Mounted SVG editor view shell. */
export class SvgMountedEditorView
  extends MountedPaginatedEditorView<"svg", SvgMountedViewElements>
  implements SvgMountedView
{
  private readonly runtime: SvgMountedMutableRuntime;
  private readonly resources: SvgMountedResourceBundle;
  private currentSurfaceState: SvgMountedRenderSurfaceState | undefined;
  /** Sparse SVG frames, content reuse, and browser-measured geometry authority. */
  private readonly pageStackPresentation: SvgPageStackPresentation;
  /** Text measurer version observed by the last full page-stack render. */
  private currentTextMeasurerVersion: number | undefined;

  /** @inheritdoc */
  protected getMountedServiceVisualRoots(): readonly HTMLElement[] { return [this.elements.pageStackHost]; }

  /**
   * Creates and mounts an SVG editor view shell.
   *
   * @param options - Editor, host element, identity, status, and runtime sizing.
   */
  constructor(options: SvgMountedViewOptions) {
    super({
      editor: options.editor,
      id: options.id,
      mode: "svg",
      status: options.status,
      elements: createSvgMountedViewElements(options)
    });
    this.resources = createSvgMountedResources({
      editor: options.editor,
      runtime: options.runtime,
      ownerDocument: this.elements.root.ownerDocument,
      onFontSetChange: this.requestFontMetricsRefresh,
      onImageStateChange: this.requestImageResourceRefresh
    });
    this.runtime = this.resources.runtime;
    this.initializeMountedPaginatedRuntime({
      scheduling: {
        invalidatesLayout: (request) => (
          request.reason !== "selection" && request.reason !== "scroll" && request.reason !== "image-paint"
        ),
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
        ...pickMountedUpdateFrames(this.runtime, "requestFrame", "cancelFrame")
      },
      interaction: {
        host: {
          id: this.id,
          kind: "svg",
          surface: this.elements.documentSurface,
          metadata: {
            root: this.elements.root,
            pageStackHost: this.elements.pageStackHost
          }
        },
        onFocusChange: (focused) => {
          this.runtime?.onFocusChange?.(focused);
        },
        onDrawingCreationActiveChange: (active) => {
          resolveSvgMountedCoordinateSurface(this.elements).style.cursor = active
            ? "crosshair"
            : "";
        }
      },
      geometry: {
        backendLabel: "SVG",
        readSurface: () => {
          const coordinateSurface = resolveSvgMountedCoordinateSurface(
            this.elements
          );
          return {
            clientRect: coordinateSurface.getBoundingClientRect(),
            surfaceBounds: this.currentSurfaceState?.surfaceBounds
          };
        },
        refinePosAtCoords: ({ geometrySnapshot, coords, surface, retainedResult }) => {
          // Browser text measurements must not replace the retained drawing owner
          // with a caret in body text painted beneath that object.
          if (retainedResult?.objectPosition !== undefined) {
            return retainedResult;
          }
          const retainedContext = resolveSvgBrowserMeasurementHitContext({
            geometrySnapshot,
            clientPoint: { clientX: coords.left, clientY: coords.top },
            surfaceClientRect: surface.clientRect,
            surfaceBounds: surface.surfaceBounds
          });
          const svgHitTestResult = this.pageStackPresentation.hitTest({
            clientPoint: retainedContext.clientPoint,
            retainedDocumentPoint: retainedContext.documentPoint,
            retainedHitTestResult: retainedContext.hitTestResult,
            surfaceClientRect: surface.clientRect,
            surfaceBounds: surface.surfaceBounds
          });

          return svgHitTestResult?.kind === "position"
            ? {
                pos: svgHitTestResult.position.pos,
                inside: svgHitTestResult.inside
              }
            : undefined;
        },
        refineCoordsAtPos: ({
          pos,
          side,
          selectionContext,
          surface,
          retainedResult
        }) => this.pageStackPresentation.refineCoordsAtPos({
          pos,
          side,
          selectionContext,
          retainedRectAtPosition: retainedResult.rectAtPosition,
          surfaceClientRect: surface.clientRect,
          surfaceBounds: surface.surfaceBounds
        })
      },
      presentation: {
        lifecycle: {
          domCaretClassName: "qk-svg-editor__caret",
          caretRendering: this.runtime?.caretRendering ?? "dom",
          readPointerSurface: () =>
            resolveSvgMountedCoordinateSurface(this.elements),
          readSelectionBuildOptions: (request) => createMountedPaginatedBuildOptions(
            this.runtime,
            resolveSvgMountedPageStackSurfaceState(this.runtime).viewportRect,
            this.pageStackPresentation,
            request,
            1,
            this.resources.imageResources.transformDisplayList
          ),
          isSelectionUpdateReady: () => (
            this.currentSurfaceState !== undefined
            && this.pageStackPresentation.getFrames().length > 0
            && this.currentTextMeasurerVersion
              === this.runtime?.textMeasurer?.version
          ),
          refineSelectionRenderResult: (renderResult) =>
            this.pageStackPresentation.measureSelection(renderResult),
          repaintOverlay: (caretVisible) => {
            this.repaintOverlayWithCaretVisibility(caretVisible);
          },
          repaintDrawingPreview: (renderResult, caretVisible) => {
            this.repaintDrawingPreview(renderResult, caretVisible);
          },
          buildDrawingLayoutPreview: (state, acceptedRenderResult) =>
            buildSvgMountedDrawingLayoutPreview({
              mountedPageRects: this.pageStackPresentation.getFrames().map(frame => frame.pageRect),
              resolveVisiblePageIndices: rects => this.pageStackPresentation.resolveVisiblePageIndices(rects, 1),
              view: this.resources.view,
              decorationSourceView: this,
              runtime: this.runtime,
              surfaceState: this.currentSurfaceState,
              displayListTransform: this.resources.imageResources.transformDisplayList,
              state,
              acceptedRenderResult,
              selectionContext: this.mountedRuntime.interaction.getSelectionGeometryContext(),
              activeAuxiliaryStorySourceId: this.mountedRuntime.interaction.getHeaderFooterEditingSession()?.sourceId
            }),
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
              phases: []
            });
          },
          displayListStyles: this.runtime.displayListStyles,
          surfaceConfig: this.runtime.surfaceConfig
        },
        syncInputProxy: (renderResult, imePreedit) => {
          const surfaceState = this.currentSurfaceState;
          if (surfaceState === undefined) {
            return;
          }

          syncMountedPaginatedInputProxy({
            inputProxy: this.elements.inputProxy,
            coordinateSurface: resolveSvgMountedCoordinateSurface(this.elements),
            renderResult,
            surfaceBounds: surfaceState.surfaceBounds,
            imePreedit,
            font: this.runtime?.displayListStyles?.font
          });
        }
      },
      renderFlow: {
        lifecycle: {
          prepareFillRender: (options) =>
            this.pageStackPresentation.prepareFillRender(options),
          renderDocument: (request) => {
            this.renderDocument(request);
          }
        },
        allowsSelectionReuse: () => true,
        isDocumentPresentationReady: () => true
      }
    });

    options.element.appendChild(this.elements.root);

    this.pageStackPresentation = createSvgPageStackPresentation({
      root: this.elements.root,
      documentSurface: this.elements.documentSurface,
      host: this.elements.pageStackHost,
      runtime: this.runtime,
      fill: {
        onAdvance: (advance) => {
          this.mountedRuntime.renderFlow.applyFillAdvance("fill", advance);
        }
      },
      readRenderState: () => this.mountedRuntime.renderResult === undefined
        ? null
        : {
            renderResult: this.mountedRuntime.renderResult,
            caretVisible: this.mountedRuntime.presentation.overlayCaretVisible()
          },
      commitRenderResult: (renderResult) => {
        this.mountedRuntime.commitRenderResult(renderResult);
      },
      requestDocumentRefresh: () => this.refreshMountedGeometry(
        () => this.mountedRuntime.renderFlow.refreshDocument("scroll"))
    });

    this.mountedRuntime.interaction.addCleanup(bindSvgMountedPointerEvents({
      mountedView: this,
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
      hitTestPointer: ({ clientPoint, renderState, surfaceClientRect }) => {
        const surfaceBounds = renderState.surfaceState.surfaceBounds;
        const retainedContext = resolveSvgBrowserMeasurementHitContext({
          geometrySnapshot: renderState.renderResult.interactionSnapshot,
          clientPoint,
          surfaceClientRect,
          surfaceBounds
        });

        return this.pageStackPresentation.hitTest({
          clientPoint: retainedContext.clientPoint,
          retainedDocumentPoint: retainedContext.documentPoint,
          retainedHitTestResult: retainedContext.hitTestResult,
          surfaceClientRect,
          surfaceBounds
        }) ?? retainedContext.hitTestResult;
      },
      onPointerHitTest: (hitTestResult) => {
        this.runtime?.onPointerHitTest?.({ view: this, hitTestResult });
      }
    }));
    this.mountedRuntime.interaction.addCleanup(bindMountedResizeEvents({
      root: this.elements.root,
      observedElement: this.elements.root,
      onResize: () => {
        this.requestPaginatedRender({ reason: "resize" });
      }
    }));
    this.requestPaginatedRender({ reason: "initial" });
    this.initializeMountedPluginViews();
  }

  /** Clears browser measurements and schedules fresh pagination after font registration. */
  override refreshFontMetrics(options?: QuireFontMetricsRefreshOptions): void {
    if (this.resources.browserTextMeasurer === undefined) {
      super.refreshFontMetrics();
      return;
    }
    if (options?.onlyIfFontSetChanged === true) this.resources.browserTextMeasurer.invalidateIfFontSetChanged();
    else this.resources.browserTextMeasurer.invalidate();
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

  /** Tears down DOM owned by this mounted SVG view after base guards pass. */
  protected destroyPaginatedBackendView(): void {
    this.resources.imageResources.destroy();
    this.resources.browserTextMeasurer?.destroy();
    this.pageStackPresentation.destroy();

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
   * Executes one SVG-specific document render from shared semantic facts.
   *
   * @param request - Canonical preedit, invalidation, and fill-window request.
   */
  private renderDocument(
    request: MountedPaginatedDocumentRenderRequest<SvgMountedViewRenderReason>
  ): void {
    const result = renderSvgMountedPageStack({
      view: this.resources.view,
      mountedView: this,
      elements: this.elements,
      runtime: this.runtime,
      pageStackPresentation: this.pageStackPresentation,
      displayListTransform: this.resources.imageResources.transformDisplayList,
      imePreedit: request.imePreedit,
      layoutDirtyRange: request.layoutDirtyRange,
      updatePatch: request.updatePatch,
      reason: request.reason,
      fillWindow: request.fillWindow,
      selectionContext: this.mountedRuntime.interaction.getSelectionGeometryContext(),
      activeAuxiliaryStorySourceId:
        this.mountedRuntime.interaction.getHeaderFooterEditingSession()?.sourceId,
      overlayCaretVisible: () =>
        this.mountedRuntime.presentation.overlayCaretVisible(),
      readRenderResult: () => this.mountedRuntime.renderResult,
      commitRenderResult: (renderResult) => {
        this.mountedRuntime.commitRenderResult(renderResult);
      },
      syncAfterRender: (options) => {
        this.mountedRuntime.presentation.syncAfterRender(options);
      },
      readTextMeasurerVersion: () => this.runtime?.textMeasurer?.version
    });
    this.currentSurfaceState = result.surfaceState;
    this.currentTextMeasurerVersion = result.textMeasurerVersion;
  }

  /**
   * Repaints backend-owned SVG overlays with the requested caret visibility.
   *
   * @param caretVisible - Whether retained caret commands should paint.
   */
  private repaintOverlayWithCaretVisibility(caretVisible: boolean): void {
    repaintSvgMountedOverlayWithCaretVisibility({
      renderResult: this.mountedRuntime.renderResult,
      surfaceState: this.currentSurfaceState,
      pageStackPresentation: this.pageStackPresentation,
      caretVisible
    });
  }

  /**
   * Repaints transient drawing content and chrome on mounted SVG pages.
   *
   * @param renderResult - Transient render products already committed by the runtime.
   * @param caretVisible - Whether retained caret commands should paint.
   */
  private repaintDrawingPreview(
    renderResult: QuireViewRenderResult,
    caretVisible: boolean
  ): void {
    repaintSvgMountedDrawingPreview({
      renderResult,
      surfaceState: this.currentSurfaceState,
      pageStackPresentation: this.pageStackPresentation,
      caretVisible
    });
  }

}

/**
 * Creates a mounted SVG editor view shell.
 *
 * @param options - Editor, host element, identity, status, and runtime sizing.
 * @returns Mounted SVG editor view shell.
 */
export function createSvgMountedView(options: SvgMountedViewOptions): SvgMountedView {
  return new SvgMountedEditorView(options);
}

export { createSvgMountedViewElements };
